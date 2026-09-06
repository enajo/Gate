import "server-only";

import type { CalendarAccount } from "@prisma/client";
import type {
  CreateCalendarEventInput,
  CreatedCalendarEvent,
  GoogleCalendarListItem,
  MergedBusyRange,
  SyncCalendarBusyTimesInput,
  UpdateCalendarEventInput,
} from "@/types/google";
import { logger } from "@/lib/logger";
import { googleRepository } from "@/server/repositories/google.repository";
import {
  googleCalendarService,
  mergeBusyRanges,
} from "@/server/services/google-calendar.service";
import { GOOGLE_PROVIDER } from "@/server/services/google-auth.service";

function unsupportedProviderError(account: CalendarAccount): Error {
  return new Error(
    `No calendar event integration for provider: ${account.provider}`,
  );
}

/**
 * The one place that knows how to route a CalendarAccount to its actual
 * provider implementation. Availability checking and booking confirmation
 * call through here instead of a specific provider's service directly —
 * adding Outlook or CalDAV later means adding one branch here, not
 * touching every call site that needs busy times or creates/updates/
 * cancels an event or lists a professional's remote calendars.
 *
 * The repository queries this relies on (findConflictCheckCalendarsByProfessionalId,
 * findDefaultEventCalendarByProfessionalId) are already provider-agnostic —
 * a professional can have Google and Outlook accounts side by side today,
 * they just weren't both being read from before this file existed.
 */
export const calendarProviderService = {
  /**
   * Busy ranges across every active, conflict-check-enabled calendar a
   * professional has connected, merged and deduplicated regardless of how
   * many different providers they're spread across.
   */
  async getMergedBusyRanges(
    input: SyncCalendarBusyTimesInput,
  ): Promise<MergedBusyRange[]> {
    const accounts =
      await googleRepository.findConflictCheckCalendarsByProfessionalId(
        input.professionalId,
      );

    if (accounts.length === 0) return [];

    const ranges = await Promise.all(
      accounts.map((account) =>
        getBusyRangesForAccount(account, {
          start: input.start,
          end: input.end,
          timezone: input.timezone,
        }),
      ),
    );

    return mergeBusyRanges(ranges.flat());
  },

  /**
   * Creates an event on the given account, dispatching to whichever
   * provider that account actually is.
   */
  async createEvent(
    account: CalendarAccount,
    input: CreateCalendarEventInput,
  ): Promise<CreatedCalendarEvent> {
    if (account.provider === GOOGLE_PROVIDER) {
      return googleCalendarService.createCalendarEvent(input);
    }

    throw unsupportedProviderError(account);
  },

  /**
   * Updates an existing event on the given account.
   */
  async updateEvent(
    account: CalendarAccount,
    input: UpdateCalendarEventInput,
  ): Promise<CreatedCalendarEvent> {
    if (account.provider === GOOGLE_PROVIDER) {
      return googleCalendarService.updateCalendarEvent(input);
    }

    throw unsupportedProviderError(account);
  },

  /**
   * Cancels (deletes) an existing event on the given account.
   */
  async cancelEvent(
    account: CalendarAccount,
    params: { calendarAccountId: string; externalEventId: string },
  ): Promise<void> {
    if (account.provider === GOOGLE_PROVIDER) {
      return googleCalendarService.cancelCalendarEvent(params);
    }

    throw unsupportedProviderError(account);
  },

  /**
   * Lists the raw remote calendars available on the given account (e.g. so
   * a professional can pick which of their Google calendars to sync).
   */
  async listRemoteCalendars(
    account: CalendarAccount,
  ): Promise<GoogleCalendarListItem[]> {
    if (account.provider === GOOGLE_PROVIDER) {
      return googleCalendarService.listRemoteCalendars(account.id);
    }

    throw unsupportedProviderError(account);
  },
};

async function getBusyRangesForAccount(
  account: CalendarAccount,
  params: { start: Date | string; end: Date | string; timezone: string },
): Promise<MergedBusyRange[]> {
  if (account.provider === GOOGLE_PROVIDER) {
    return googleCalendarService.getBusyRangesForCalendarAccount({
      calendarAccountId: account.id,
      start: params.start,
      end: params.end,
      timezone: params.timezone,
    });
  }

  // Not a crash: a professional may have connected a provider we don't yet
  // support fetching busy times for. Skip it rather than fail the whole
  // availability check, and make it loud so it doesn't go unnoticed.
  logger.warn(
    "calendarProviderService: no busy-range implementation for provider yet",
    { calendarAccountId: account.id, provider: account.provider },
  );
  return [];
}
