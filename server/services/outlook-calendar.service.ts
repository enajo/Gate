import "server-only";

import type { CalendarAccount as PrismaCalendarAccount } from "@prisma/client";
import type {
  CalendarConflictSource,
  CalendarProviderAdapter,
  CreatedCalendarEvent,
  CreateCalendarEventInput,
  GoogleCalendarListItem,
  MergedBusyRange,
  UpdateCalendarEventInput,
} from "@/types/google";
import type {
  OutlookGetScheduleResponse,
  OutlookScheduleStatus,
} from "@/types/outlook";
import { assertValidDate } from "@/lib/dates";
import {
  createCalendarEventSchema,
  updateCalendarEventSchema,
} from "@/server/validators/google.validator";
import { googleRepository } from "@/server/repositories/google.repository";
import {
  OUTLOOK_PROVIDER,
  outlookAuthService,
} from "@/server/services/outlook-auth.service";

const MICROSOFT_GRAPH_API_BASE = "https://graph.microsoft.com/v1.0";

// Graph's getSchedule returns every status, not just busy ones (unlike
// Google's /freeBusy, which only ever returns busy ranges). "busy" and "oof"
// (out-of-office) count as a real conflict; "tentative" (not yet confirmed)
// and "workingElsewhere" (a location signal, not a conflict) do not — don't
// block a real booking slot over a maybe-meeting.
const BUSY_STATUSES: OutlookScheduleStatus[] = ["busy", "oof"];

type OutlookCalendarListResponse = {
  value?: Array<{
    id: string;
    name?: string;
    isDefaultCalendar?: boolean;
    canEdit?: boolean;
    owner?: { name?: string; address?: string };
  }>;
};

type OutlookEventResponse = {
  id: string;
  webLink?: string;
  onlineMeeting?: { joinUrl?: string } | null;
};

type OutlookApiErrorResponse = {
  error?: {
    message?: string;
    code?: string;
  };
};

function mapRemoteCalendar(
  item: NonNullable<OutlookCalendarListResponse["value"]>[number],
): GoogleCalendarListItem {
  return {
    id: item.id,
    summary: item.name ?? item.id,
    description: null,
    primary: item.isDefaultCalendar ?? false,
    selected: true,
    accessRole: item.canEdit ? "writer" : "reader",
    timeZone: null,
    backgroundColor: null,
    foregroundColor: null,
  };
}

function getCalendarIdentifier(account: PrismaCalendarAccount): string {
  return (
    account.externalCalendarId ??
    account.providerEmail ??
    account.externalAccountId
  );
}

function getMeetingUrl(event: OutlookEventResponse): string | null {
  return event.onlineMeeting?.joinUrl ?? null;
}

// Without a `Prefer: outlook.timezone` request header (not sent here), Graph
// returns getSchedule dateTime strings as naive UTC — no trailing "Z" — e.g.
// "2019-03-15T12:00:00.0000000". `new Date(...)` parses a bare string like
// that as local time, not UTC, so the offset must be appended explicitly.
function parseGraphUtcDateTime(dateTime: string): Date {
  return new Date(dateTime.endsWith("Z") ? dateTime : `${dateTime}Z`);
}

async function requireOutlookCalendarAccount(accountId: string) {
  const account = await googleRepository.findCalendarAccountById(accountId);

  if (!account) {
    throw new Error("Calendar account not found.");
  }

  if (account.provider !== OUTLOOK_PROVIDER) {
    throw new Error("Only Outlook Calendar is supported by this service.");
  }

  return account;
}

async function refreshOutlookAccessToken(account: PrismaCalendarAccount) {
  if (!account.refreshTokenEncrypted) {
    throw new Error("Outlook refresh token is missing.");
  }

  const refreshToken = outlookAuthService.decryptToken(
    account.refreshTokenEncrypted,
  );

  const refreshed = await outlookAuthService.refreshAccessToken(refreshToken);
  const encrypted = outlookAuthService.encryptOAuthTokens(refreshed);

  // Microsoft always rotates the refresh token — persist whatever came back
  // unconditionally, no `?? account.refreshTokenEncrypted` fallback here.
  const updated = await googleRepository.updateCalendarAccountById(account.id, {
    accessTokenEncrypted: encrypted.accessTokenEncrypted,
    refreshTokenEncrypted: encrypted.refreshTokenEncrypted,
    syncStatus: "CONNECTED",
    lastSyncedAt: new Date(),
  });

  return {
    account: updated,
    accessToken: refreshed.accessToken,
  };
}

async function getValidOutlookAccessToken(account: PrismaCalendarAccount) {
  const accessToken = outlookAuthService.decryptToken(
    account.accessTokenEncrypted,
  );

  return {
    account,
    accessToken,
  };
}

async function parseOutlookJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    const text = await response.text();
    throw new Error(text || "Unexpected Microsoft Graph API response.");
  }

  return response.json() as Promise<T>;
}

async function performOutlookRequest<T>(params: {
  account: PrismaCalendarAccount;
  path: string;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  retryOnUnauthorized?: boolean;
}): Promise<T> {
  const { account } = params;
  const auth = await getValidOutlookAccessToken(account);

  const url = new URL(`${MICROSOFT_GRAPH_API_BASE}${params.path}`);

  if (params.query) {
    for (const [key, value] of Object.entries(params.query)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const response = await fetch(url.toString(), {
    method: params.method ?? "GET",
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
      ...(params.body ? { "Content-Type": "application/json" } : {}),
    },
    body: params.body ? JSON.stringify(params.body) : undefined,
    cache: "no-store",
  });

  if (response.status === 401 && params.retryOnUnauthorized !== false) {
    const refreshed = await refreshOutlookAccessToken(account);

    const retryResponse = await fetch(url.toString(), {
      method: params.method ?? "GET",
      headers: {
        Authorization: `Bearer ${refreshed.accessToken}`,
        ...(params.body ? { "Content-Type": "application/json" } : {}),
      },
      body: params.body ? JSON.stringify(params.body) : undefined,
      cache: "no-store",
    });

    if (!retryResponse.ok) {
      const json = await parseOutlookJsonResponse<OutlookApiErrorResponse>(
        retryResponse,
      ).catch(() => null);

      throw new Error(
        json?.error?.message ??
          "Microsoft Graph API request failed after token refresh.",
      );
    }

    if (retryResponse.status === 204 || retryResponse.status === 202) {
      return undefined as T;
    }

    return parseOutlookJsonResponse<T>(retryResponse);
  }

  if (!response.ok) {
    const json = await parseOutlookJsonResponse<OutlookApiErrorResponse>(
      response,
    ).catch(() => null);

    throw new Error(json?.error?.message ?? "Microsoft Graph API request failed.");
  }

  if (response.status === 204 || response.status === 202) {
    return undefined as T;
  }

  return parseOutlookJsonResponse<T>(response);
}

export const outlookCalendarService: CalendarProviderAdapter = {
  async listRemoteCalendars(
    calendarAccountId: string,
  ): Promise<GoogleCalendarListItem[]> {
    const account = await requireOutlookCalendarAccount(calendarAccountId);

    const data = await performOutlookRequest<OutlookCalendarListResponse>({
      account,
      path: "/me/calendars",
      method: "GET",
    });

    await googleRepository.touchLastSyncedAt(account.id, account.professionalId);

    return (data.value ?? []).map(mapRemoteCalendar);
  },

  async getBusyRangesForCalendarAccount(params: {
    calendarAccountId: string;
    start: Date | string;
    end: Date | string;
    timezone: string;
  }): Promise<MergedBusyRange[]> {
    const account = await requireOutlookCalendarAccount(params.calendarAccountId);
    const start = assertValidDate(params.start);
    const end = assertValidDate(params.end);

    const scheduleId = account.providerEmail ?? getCalendarIdentifier(account);

    const data = await performOutlookRequest<OutlookGetScheduleResponse>({
      account,
      path: "/me/calendar/getSchedule",
      method: "POST",
      body: {
        schedules: [scheduleId],
        startTime: { dateTime: start.toISOString(), timeZone: "UTC" },
        endTime: { dateTime: end.toISOString(), timeZone: "UTC" },
        availabilityViewInterval: 30,
      },
    });

    await googleRepository.touchLastSyncedAt(account.id, account.professionalId);

    const scheduleItems = data.value?.[0]?.scheduleItems ?? [];
    const source: CalendarConflictSource = {
      calendarAccountId: account.id,
      calendarName: account.calendarName,
      provider: account.provider,
    };

    return scheduleItems
      .filter((item) => BUSY_STATUSES.includes(item.status))
      .map((item) => ({
        start: parseGraphUtcDateTime(item.start.dateTime),
        end: parseGraphUtcDateTime(item.end.dateTime),
        sources: [source],
      }));
  },

  async createCalendarEvent(
    input: CreateCalendarEventInput,
  ): Promise<CreatedCalendarEvent> {
    const parsed = createCalendarEventSchema.parse(input);
    const account = await requireOutlookCalendarAccount(parsed.calendarAccountId);
    const calendarId = getCalendarIdentifier(account);
    const wantsOnlineMeeting =
      !!parsed.conferenceDataVersion && parsed.conferenceDataVersion > 0;

    const event = await performOutlookRequest<OutlookEventResponse>({
      account,
      path: `/me/calendars/${encodeURIComponent(calendarId)}/events`,
      method: "POST",
      body: {
        subject: parsed.title,
        body: {
          contentType: "text",
          content: parsed.description ?? "",
        },
        location: parsed.location ? { displayName: parsed.location } : undefined,
        start: {
          dateTime: new Date(parsed.start).toISOString(),
          timeZone: parsed.timeZone,
        },
        end: {
          dateTime: new Date(parsed.end).toISOString(),
          timeZone: parsed.timeZone,
        },
        attendees: parsed.attendees.map((attendee) => ({
          emailAddress: { address: attendee.email, name: attendee.displayName },
          type: attendee.optional ? "optional" : "required",
        })),
        isOnlineMeeting: wantsOnlineMeeting,
        onlineMeetingProvider: wantsOnlineMeeting ? "teamsForBusiness" : undefined,
      },
    });

    await googleRepository.touchLastSyncedAt(account.id, account.professionalId);

    return {
      externalEventId: event.id,
      eventUrl: event.webLink ?? null,
      meetingUrl: getMeetingUrl(event),
      status: "CREATED",
    };
  },

  async updateCalendarEvent(
    input: UpdateCalendarEventInput,
  ): Promise<CreatedCalendarEvent> {
    const parsed = updateCalendarEventSchema.parse(input);
    const account = await requireOutlookCalendarAccount(parsed.calendarAccountId);
    const calendarId = getCalendarIdentifier(account);

    const event = await performOutlookRequest<OutlookEventResponse>({
      account,
      path: `/me/calendars/${encodeURIComponent(
        calendarId,
      )}/events/${encodeURIComponent(parsed.externalEventId)}`,
      method: "PATCH",
      body: {
        ...(parsed.title !== undefined ? { subject: parsed.title } : {}),
        ...(parsed.description !== undefined
          ? { body: { contentType: "text", content: parsed.description ?? "" } }
          : {}),
        ...(parsed.location !== undefined
          ? { location: parsed.location ? { displayName: parsed.location } : null }
          : {}),
        ...(parsed.start !== undefined
          ? {
              start: {
                dateTime: new Date(parsed.start).toISOString(),
                timeZone: parsed.timeZone,
              },
            }
          : {}),
        ...(parsed.end !== undefined
          ? {
              end: {
                dateTime: new Date(parsed.end).toISOString(),
                timeZone: parsed.timeZone,
              },
            }
          : {}),
        ...(parsed.attendees !== undefined
          ? {
              attendees: parsed.attendees.map((attendee) => ({
                emailAddress: {
                  address: attendee.email,
                  name: attendee.displayName,
                },
                type: attendee.optional ? "optional" : "required",
              })),
            }
          : {}),
      },
    });

    await googleRepository.touchLastSyncedAt(account.id, account.professionalId);

    return {
      externalEventId: event.id,
      eventUrl: event.webLink ?? null,
      meetingUrl: getMeetingUrl(event),
      status: "UPDATED",
    };
  },

  async cancelCalendarEvent(params: {
    calendarAccountId: string;
    externalEventId: string;
  }): Promise<void> {
    const account = await requireOutlookCalendarAccount(params.calendarAccountId);
    const calendarId = getCalendarIdentifier(account);

    await performOutlookRequest<void>({
      account,
      path: `/me/calendars/${encodeURIComponent(
        calendarId,
      )}/events/${encodeURIComponent(params.externalEventId)}`,
      method: "DELETE",
    });

    await googleRepository.touchLastSyncedAt(account.id, account.professionalId);
  },
};
