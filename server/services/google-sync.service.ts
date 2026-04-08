import "server-only";

import type { Booking as PrismaBooking } from "@prisma/client";
import type { Booking } from "@/types/booking";
import type {
  CalendarAccount,
  CreatedCalendarEvent,
  GoogleCallbackPayload,
  GoogleCalendarListItem,
  MergedBusyRange,
  SyncCalendarBusyTimesInput,
} from "@/types/google";
import { googleAuthService, GOOGLE_PROVIDER } from "@/server/services/google-auth.service";
import { googleCalendarService } from "@/server/services/google-calendar.service";
import { bookingRepository } from "@/server/repositories/booking.repository";
import { googleRepository } from "@/server/repositories/google.repository";
import { profileRepository } from "@/server/repositories/profile.repository";
import { createCalendarEventSchema } from "@/server/validators/google.validator";

const GOOGLE_CALENDAR_LIST_URL =
  "https://www.googleapis.com/calendar/v3/users/me/calendarList";

type GoogleCalendarListResponse = {
  items?: Array<{
    id: string;
    summary?: string;
    description?: string;
    primary?: boolean;
    selected?: boolean;
    accessRole?: string;
    timeZone?: string;
    backgroundColor?: string;
    foregroundColor?: string;
  }>;
};

function mapCalendarAccount(
  account: Awaited<ReturnType<typeof googleRepository.findCalendarAccountById>>,
): CalendarAccount | null {
  if (!account) {
    return null;
  }

  return {
    id: account.id,
    professionalId: account.professionalId,
    provider: account.provider,
    externalAccountId: account.externalAccountId,
    externalCalendarId: account.externalCalendarId,
    providerEmail: account.providerEmail,
    calendarName: account.calendarName,
    calendarTimeZone: account.calendarTimeZone,
    accessTokenEncrypted: account.accessTokenEncrypted,
    refreshTokenEncrypted: account.refreshTokenEncrypted,
    syncStatus: account.syncStatus,
    isActive: account.isActive,
    useForConflictCheck: account.useForConflictCheck,
    isDefaultEventCalendar: account.isDefaultEventCalendar,
    lastSyncedAt: account.lastSyncedAt,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}

function mapBooking(
  booking: PrismaBooking | null,
): Booking | null {
  if (!booking) {
    return null;
  }

  return {
    id: booking.id,
    professionalId: booking.professionalId,
    serviceId: booking.serviceId,
    leadId: booking.leadId,
    holdId: booking.holdId,
    slotStart: booking.slotStart,
    slotEnd: booking.slotEnd,
    timezone: booking.timezone,
    status: booking.status,
    codeValidationStatus: booking.codeValidationStatus,
    calendarStatus: booking.calendarStatus,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  };
}

async function requireProfessionalByUserId(userId: string) {
  const professional = await profileRepository.findByUserId(userId);

  if (!professional) {
    throw new Error("Professional profile not found.");
  }

  return professional;
}

async function requireBookingWithRelations(bookingId: string) {
  const booking = await bookingRepository.findBookingByIdWithRelations(bookingId);

  if (!booking) {
    throw new Error("Booking not found.");
  }

  return booking;
}

async function fetchRemoteCalendars(
  accessToken: string,
): Promise<GoogleCalendarListItem[]> {
  const response = await fetch(GOOGLE_CALENDAR_LIST_URL, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to fetch Google calendars.");
  }

  const json = (await response.json()) as GoogleCalendarListResponse;

  return (json.items ?? []).map((item) => ({
    id: item.id,
    summary: item.summary ?? item.id,
    description: item.description ?? null,
    primary: item.primary ?? false,
    selected: item.selected ?? false,
    accessRole: item.accessRole ?? null,
    timeZone: item.timeZone ?? null,
    backgroundColor: item.backgroundColor ?? null,
    foregroundColor: item.foregroundColor ?? null,
  }));
}

function buildBookingEventTitle(params: {
  professionalName: string;
  serviceTitle: string;
  clientName: string;
}) {
  return `${params.serviceTitle} with ${params.professionalName} — ${params.clientName}`;
}

function buildBookingEventDescription(params: {
  professionalName: string;
  serviceTitle: string;
  clientName: string;
  clientEmail: string;
  preparationInstructions?: string | null;
  answersJson?: Record<string, unknown>;
}) {
  const sections: string[] = [
    `Service: ${params.serviceTitle}`,
    `Professional: ${params.professionalName}`,
    `Client: ${params.clientName} (${params.clientEmail})`,
  ];

  if (params.preparationInstructions) {
    sections.push(`Preparation instructions:\n${params.preparationInstructions}`);
  }

  if (params.answersJson && Object.keys(params.answersJson).length > 0) {
    const answers = Object.entries(params.answersJson)
      .map(([key, value]) => `- ${key}: ${String(value)}`)
      .join("\n");

    sections.push(`Qualification answers:\n${answers}`);
  }

  return sections.join("\n\n");
}

async function ensureDefaultEventCalendar(professionalId: string) {
  const existingDefault =
    await googleRepository.findDefaultEventCalendarByProfessionalId(
      professionalId,
    );

  if (existingDefault) {
    return existingDefault;
  }

  const activeCalendars =
    await googleRepository.findActiveCalendarAccountsByProfessionalId(
      professionalId,
    );

  if (activeCalendars.length === 0) {
    return null;
  }

  const preferred =
    activeCalendars.find((calendar) => calendar.externalCalendarId === calendar.providerEmail) ??
    activeCalendars[0];

  return googleRepository.setDefaultEventCalendar(professionalId, preferred.id);
}

export const googleSyncService = {
  async getAuthorizationUrl(params?: {
    professionalId?: string;
    returnTo?: string;
    nonce?: string;
  }): Promise<string> {
    const state = googleAuthService.encodeState({
      professionalId: params?.professionalId,
      returnTo: params?.returnTo,
      nonce: params?.nonce,
    });

    return googleAuthService.getAuthorizationUrl({
      accessType: "offline",
      prompt: "consent",
      state,
    });
  },

  async connectGoogleAccountFromCallback(
    userId: string,
    payload: GoogleCallbackPayload,
  ): Promise<{
    providerEmail: string;
    calendars: CalendarAccount[];
    defaultCalendarId?: string | null;
  }> {
    const professional = await requireProfessionalByUserId(userId);
    const { tokens, user } =
      await googleAuthService.exchangeCodeAndFetchProfile(payload);

    const encrypted = googleAuthService.encryptOAuthTokens(tokens);
    const remoteCalendars = await fetchRemoteCalendars(tokens.accessToken);

    const syncedCalendars: CalendarAccount[] = [];

    for (const remoteCalendar of remoteCalendars) {
      const existing = await googleRepository.findByExternalCalendar({
        provider: GOOGLE_PROVIDER,
        externalAccountId: user.sub,
        externalCalendarId: remoteCalendar.id,
      });

      const shouldBeDefault =
        remoteCalendar.primary === true ||
        remoteCalendar.id === user.email;

      if (existing) {
        const updated = await googleRepository.updateCalendarAccountById(
          existing.id,
          {
            providerEmail: user.email,
            calendarName: remoteCalendar.summary,
            calendarTimeZone: remoteCalendar.timeZone ?? null,
            accessTokenEncrypted: encrypted.accessTokenEncrypted,
            refreshTokenEncrypted:
              encrypted.refreshTokenEncrypted ??
              existing.refreshTokenEncrypted,
            syncStatus: "CONNECTED",
            isActive: true,
            useForConflictCheck: existing.useForConflictCheck,
            isDefaultEventCalendar:
              existing.isDefaultEventCalendar || shouldBeDefault,
            lastSyncedAt: new Date(),
          },
        );

        syncedCalendars.push(mapCalendarAccount(updated)!);
        continue;
      }

      const created = await googleRepository.createCalendarAccountForProfessional(
        professional.id,
        {
          provider: GOOGLE_PROVIDER,
          externalAccountId: user.sub,
          externalCalendarId: remoteCalendar.id,
          providerEmail: user.email,
          calendarName: remoteCalendar.summary,
          calendarTimeZone: remoteCalendar.timeZone ?? null,
          accessTokenEncrypted: encrypted.accessTokenEncrypted,
          refreshTokenEncrypted: encrypted.refreshTokenEncrypted ?? null,
          syncStatus: "CONNECTED",
          isActive: true,
          useForConflictCheck: true,
          isDefaultEventCalendar: shouldBeDefault,
          lastSyncedAt: new Date(),
        },
      );

      syncedCalendars.push(mapCalendarAccount(created)!);
    }

    const defaultCalendar = await ensureDefaultEventCalendar(professional.id);

    return {
      providerEmail: user.email,
      calendars: syncedCalendars,
      defaultCalendarId: defaultCalendar?.id ?? null,
    };
  },

  async listConnectedCalendars(userId: string): Promise<CalendarAccount[]> {
    const professional = await requireProfessionalByUserId(userId);
    const accounts =
      await googleRepository.findCalendarAccountsByProfessionalId(
        professional.id,
      );

    return accounts.map((account) => mapCalendarAccount(account)!);
  },

  async refreshConnectedCalendars(userId: string): Promise<CalendarAccount[]> {
    const professional = await requireProfessionalByUserId(userId);
    const activeAccounts =
      await googleRepository.findActiveCalendarAccountsByProfessionalId(
        professional.id,
      );

    const representativeAccount = activeAccounts.find(
      (account) => account.provider === GOOGLE_PROVIDER,
    );

    if (!representativeAccount) {
      return [];
    }

    const accessToken = googleAuthService.decryptToken(
      representativeAccount.accessTokenEncrypted,
    );

    const remoteCalendars = await fetchRemoteCalendars(accessToken);
    const synced: CalendarAccount[] = [];

    for (const remoteCalendar of remoteCalendars) {
      const existing = await googleRepository.findByExternalCalendar({
        provider: GOOGLE_PROVIDER,
        externalAccountId: representativeAccount.externalAccountId,
        externalCalendarId: remoteCalendar.id,
      });

      if (existing) {
        const updated = await googleRepository.updateCalendarAccountById(
          existing.id,
          {
            calendarName: remoteCalendar.summary,
            calendarTimeZone: remoteCalendar.timeZone ?? null,
            syncStatus: "CONNECTED",
            isActive: existing.isActive,
            useForConflictCheck: existing.useForConflictCheck,
            isDefaultEventCalendar: existing.isDefaultEventCalendar,
            lastSyncedAt: new Date(),
          },
        );

        synced.push(mapCalendarAccount(updated)!);
        continue;
      }

      const created = await googleRepository.createCalendarAccountForProfessional(
        professional.id,
        {
          provider: GOOGLE_PROVIDER,
          externalAccountId: representativeAccount.externalAccountId,
          externalCalendarId: remoteCalendar.id,
          providerEmail: representativeAccount.providerEmail,
          calendarName: remoteCalendar.summary,
          calendarTimeZone: remoteCalendar.timeZone ?? null,
          accessTokenEncrypted: representativeAccount.accessTokenEncrypted,
          refreshTokenEncrypted:
            representativeAccount.refreshTokenEncrypted ?? null,
          syncStatus: "CONNECTED",
          isActive: true,
          useForConflictCheck: true,
          isDefaultEventCalendar: false,
          lastSyncedAt: new Date(),
        },
      );

      synced.push(mapCalendarAccount(created)!);
    }

    await ensureDefaultEventCalendar(professional.id);

    return this.listConnectedCalendars(userId);
  },

  async setCalendarActiveState(
    userId: string,
    calendarAccountId: string,
    isActive: boolean,
  ): Promise<CalendarAccount> {
    const professional = await requireProfessionalByUserId(userId);

    const updated = await googleRepository.setCalendarActiveState(
      calendarAccountId,
      professional.id,
      isActive,
    );

    if (!isActive && updated.isDefaultEventCalendar) {
      await ensureDefaultEventCalendar(professional.id);
    }

    return mapCalendarAccount(updated)!;
  },

  async setCalendarConflictCheckState(
    userId: string,
    calendarAccountId: string,
    useForConflictCheck: boolean,
  ): Promise<CalendarAccount> {
    const professional = await requireProfessionalByUserId(userId);

    const updated = await googleRepository.setConflictCheckState(
      calendarAccountId,
      professional.id,
      useForConflictCheck,
    );

    return mapCalendarAccount(updated)!;
  },

  async setDefaultEventCalendar(
    userId: string,
    calendarAccountId: string,
  ): Promise<CalendarAccount> {
    const professional = await requireProfessionalByUserId(userId);

    const updated = await googleRepository.setDefaultEventCalendar(
      professional.id,
      calendarAccountId,
    );

    return mapCalendarAccount(updated)!;
  },

  async getMergedBusyRanges(
    input: SyncCalendarBusyTimesInput,
  ): Promise<MergedBusyRange[]> {
    return googleCalendarService.getMergedBusyRanges(input);
  },

  async syncBookingEvent(bookingId: string): Promise<{
    booking: Booking;
    event: CreatedCalendarEvent;
    calendarAccount: CalendarAccount;
  }> {
    const booking = await requireBookingWithRelations(bookingId);

    if (booking.status === "CANCELLED") {
      throw new Error("Cannot create an event for a cancelled booking.");
    }

    if (booking.codeValidationStatus !== "VALID") {
      throw new Error("Cannot create an event before code validation succeeds.");
    }

    const professional = await profileRepository.findById(booking.professionalId);

    if (!professional) {
      throw new Error("Professional profile not found.");
    }

    const defaultCalendar =
      await googleRepository.findDefaultEventCalendarByProfessionalId(
        professional.id,
      );

    if (!defaultCalendar) {
      throw new Error("No default calendar is connected.");
    }

    await bookingRepository.markEventCreationPending(booking.id);

    try {
      const eventInput = createCalendarEventSchema.parse({
        calendarAccountId: defaultCalendar.id,
        title: buildBookingEventTitle({
          professionalName: professional.fullName,
          serviceTitle: booking.service.title,
          clientName: booking.lead.name,
        }),
        description: buildBookingEventDescription({
          professionalName: professional.fullName,
          serviceTitle: booking.service.title,
          clientName: booking.lead.name,
          clientEmail: booking.lead.email,
          preparationInstructions: booking.service.preparationInstructions,
          answersJson: booking.lead.answersJson as Record<string, unknown>,
        }),
        start: booking.slotStart,
        end: booking.slotEnd,
        timeZone: booking.timezone,
        attendees: [
          {
            email: booking.lead.email,
            displayName: booking.lead.name,
          },
        ],
        conferenceDataVersion: 1,
      });

      const createdEvent = await googleCalendarService.createCalendarEvent(
        eventInput,
      );

      const existingCalendarEvent = booking.calendarEvents[0] ?? null;

      if (existingCalendarEvent) {
        await googleRepository.updateCalendarEventById(existingCalendarEvent.id, {
          externalEventId: createdEvent.externalEventId,
          eventUrl: createdEvent.eventUrl ?? null,
          meetingUrl: createdEvent.meetingUrl ?? null,
          syncStatus: createdEvent.status,
        });
      } else {
        await googleRepository.createCalendarEventForBooking(
          booking.id,
          defaultCalendar.id,
          {
            externalEventId: createdEvent.externalEventId,
            eventUrl: createdEvent.eventUrl ?? null,
            meetingUrl: createdEvent.meetingUrl ?? null,
            syncStatus: createdEvent.status,
          },
        );
      }

      const updatedBooking = await bookingRepository.markEventCreated(booking.id);

      return {
        booking: mapBooking(updatedBooking)!,
        event: createdEvent,
        calendarAccount: mapCalendarAccount(defaultCalendar)!,
      };
    } catch (error) {
      await bookingRepository.markEventFailed(booking.id);

      if (booking.calendarEvents[0]) {
        await googleRepository.updateCalendarEventById(booking.calendarEvents[0].id, {
          syncStatus: "FAILED",
        });
      }

      throw error;
    }
  },

  async retryPendingEventCreations(): Promise<
    Array<{
      bookingId: string;
      success: boolean;
      error?: string;
    }>
  > {
    const pendingBookings =
      await bookingRepository.findPendingEventCreationBookings();

    const results: Array<{
      bookingId: string;
      success: boolean;
      error?: string;
    }> = [];

    for (const booking of pendingBookings) {
      try {
        await this.syncBookingEvent(booking.id);

        results.push({
          bookingId: booking.id,
          success: true,
        });
      } catch (error) {
        results.push({
          bookingId: booking.id,
          success: false,
          error: error instanceof Error ? error.message : "Unknown sync error.",
        });
      }
    }

    return results;
  },
};