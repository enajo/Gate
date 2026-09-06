import "server-only";

import type { CalendarAccount as PrismaCalendarAccount } from "@prisma/client";
import type {
  CalendarAccount,
  CalendarConflictSource,
  CalendarProviderAdapter,
  CreatedCalendarEvent,
  CreateCalendarEventInput,
  GoogleCalendarListItem,
  MergedBusyRange,
  SyncCalendarBusyTimesInput,
  UpdateCalendarEventInput,
} from "@/types/google";
import { assertValidDate } from "@/lib/dates";
import {
  createCalendarEventSchema,
  syncCalendarBusyTimesSchema,
  updateCalendarEventSchema,
} from "@/server/validators/google.validator";
import { googleRepository } from "@/server/repositories/google.repository";
import { profileRepository } from "@/server/repositories/profile.repository";
import {
  GOOGLE_PROVIDER,
  googleAuthService,
} from "@/server/services/google-auth.service";

const GOOGLE_CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";

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

type GoogleFreeBusyResponse = {
  timeMin: string;
  timeMax: string;
  calendars?: Record<
    string,
    {
      busy?: Array<{
        start: string;
        end: string;
      }>;
    }
  >;
};

type GoogleEventResponse = {
  id: string;
  htmlLink?: string;
  hangoutLink?: string;
  conferenceData?: {
    entryPoints?: Array<{
      entryPointType?: string;
      uri?: string;
    }>;
  };
};

type GoogleApiErrorResponse = {
  error?: {
    message?: string;
  };
};

function mapCalendarAccount(
  account: PrismaCalendarAccount | null,
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

function mapRemoteCalendar(
  item: NonNullable<GoogleCalendarListResponse["items"]>[number],
): GoogleCalendarListItem {
  return {
    id: item.id,
    summary: item.summary ?? item.id,
    description: item.description ?? null,
    primary: item.primary ?? false,
    selected: item.selected ?? false,
    accessRole: item.accessRole ?? null,
    timeZone: item.timeZone ?? null,
    backgroundColor: item.backgroundColor ?? null,
    foregroundColor: item.foregroundColor ?? null,
  };
}

function getCalendarIdentifier(account: PrismaCalendarAccount): string {
  return (
    account.externalCalendarId ??
    account.providerEmail ??
    account.externalAccountId
  );
}

function getMeetingUrl(event: GoogleEventResponse): string | null {
  if (event.hangoutLink) {
    return event.hangoutLink;
  }

  const videoEntryPoint = event.conferenceData?.entryPoints?.find(
    (entryPoint) => entryPoint.entryPointType === "video" && entryPoint.uri,
  );

  return videoEntryPoint?.uri ?? null;
}

export function mergeBusyRanges(ranges: MergedBusyRange[]): MergedBusyRange[] {
  if (ranges.length === 0) {
    return [];
  }

  const sorted = [...ranges].sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  );

  const merged: MergedBusyRange[] = [
    {
      start: sorted[0].start,
      end: sorted[0].end,
      sources: [...sorted[0].sources],
    },
  ];

  for (const current of sorted.slice(1)) {
    const last = merged[merged.length - 1];

    if (current.start.getTime() <= last.end.getTime()) {
      last.end = new Date(
        Math.max(last.end.getTime(), current.end.getTime()),
      );

      const seen = new Set(
        last.sources.map(
          (source) =>
            `${source.calendarAccountId}:${source.calendarName ?? ""}:${source.provider}`,
        ),
      );

      for (const source of current.sources) {
        const key = `${source.calendarAccountId}:${source.calendarName ?? ""}:${source.provider}`;

        if (!seen.has(key)) {
          last.sources.push(source);
          seen.add(key);
        }
      }

      continue;
    }

    merged.push({
      start: current.start,
      end: current.end,
      sources: [...current.sources],
    });
  }

  return merged;
}

async function requireProfessionalByUserId(userId: string) {
  const professional = await profileRepository.findByUserId(userId);

  if (!professional) {
    throw new Error("Professional profile not found.");
  }

  return professional;
}

async function requireGoogleCalendarAccount(accountId: string) {
  const account = await googleRepository.findCalendarAccountById(accountId);

  if (!account) {
    throw new Error("Calendar account not found.");
  }

  if (account.provider !== GOOGLE_PROVIDER) {
    throw new Error("Only Google Calendar is supported by this service.");
  }

  return account;
}

async function refreshGoogleAccessToken(account: PrismaCalendarAccount) {
  if (!account.refreshTokenEncrypted) {
    throw new Error("Google refresh token is missing.");
  }

  const refreshToken = googleAuthService.decryptToken(
    account.refreshTokenEncrypted,
  );

  const refreshed = await googleAuthService.refreshAccessToken(refreshToken);
  const encrypted = googleAuthService.encryptOAuthTokens(refreshed);

  const updated = await googleRepository.updateCalendarAccountById(account.id, {
    accessTokenEncrypted: encrypted.accessTokenEncrypted,
    refreshTokenEncrypted:
      encrypted.refreshTokenEncrypted ?? account.refreshTokenEncrypted,
    syncStatus: "CONNECTED",
    lastSyncedAt: new Date(),
  });

  return {
    account: updated,
    accessToken: refreshed.accessToken,
  };
}

async function getValidGoogleAccessToken(account: PrismaCalendarAccount) {
  const accessToken = googleAuthService.decryptToken(
    account.accessTokenEncrypted,
  );

  return {
    account,
    accessToken,
  };
}

async function parseGoogleJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    const text = await response.text();
    throw new Error(text || "Unexpected Google API response.");
  }

  return response.json() as Promise<T>;
}

async function performGoogleRequest<T>(params: {
  account: PrismaCalendarAccount;
  path: string;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  retryOnUnauthorized?: boolean;
}): Promise<T> {
  const { account } = params;
  const auth = await getValidGoogleAccessToken(account);

  const url = new URL(`${GOOGLE_CALENDAR_API_BASE}${params.path}`);

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
    const refreshed = await refreshGoogleAccessToken(account);

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
      const json = await parseGoogleJsonResponse<GoogleApiErrorResponse>(
        retryResponse,
      ).catch(() => null);

      throw new Error(
        json?.error?.message ?? "Google API request failed after token refresh.",
      );
    }

    if (retryResponse.status === 204) {
      return undefined as T;
    }

    return parseGoogleJsonResponse<T>(retryResponse);
  }

  if (!response.ok) {
    const json = await parseGoogleJsonResponse<GoogleApiErrorResponse>(
      response,
    ).catch(() => null);

    throw new Error(json?.error?.message ?? "Google API request failed.");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return parseGoogleJsonResponse<T>(response);
}

export const googleCalendarService: CalendarProviderAdapter & {
  listConnectedCalendarAccounts(userId: string): Promise<CalendarAccount[]>;
  getDefaultEventCalendarForProfessional(
    professionalId: string,
  ): Promise<CalendarAccount | null>;
  getMergedBusyRanges(input: SyncCalendarBusyTimesInput): Promise<MergedBusyRange[]>;
} = {
  async listConnectedCalendarAccounts(userId: string): Promise<CalendarAccount[]> {
    const professional = await requireProfessionalByUserId(userId);
    const accounts =
      await googleRepository.findCalendarAccountsByProfessionalId(
        professional.id,
      );

    return accounts.map((account) => mapCalendarAccount(account)!);
  },

  async getDefaultEventCalendarForProfessional(
    professionalId: string,
  ): Promise<CalendarAccount | null> {
    const account =
      await googleRepository.findDefaultEventCalendarByProfessionalId(
        professionalId,
      );

    return mapCalendarAccount(account);
  },

  async listRemoteCalendars(
    calendarAccountId: string,
  ): Promise<GoogleCalendarListItem[]> {
    const account = await requireGoogleCalendarAccount(calendarAccountId);

    const data = await performGoogleRequest<GoogleCalendarListResponse>({
      account,
      path: "/users/me/calendarList",
      method: "GET",
    });

    await googleRepository.touchLastSyncedAt(account.id, account.professionalId);

    return (data.items ?? []).map(mapRemoteCalendar);
  },

  async getBusyRangesForCalendarAccount(params: {
    calendarAccountId: string;
    start: Date | string;
    end: Date | string;
    timezone: string;
  }): Promise<MergedBusyRange[]> {
    const account = await requireGoogleCalendarAccount(params.calendarAccountId);
    const start = assertValidDate(params.start);
    const end = assertValidDate(params.end);

    const calendarId = getCalendarIdentifier(account);

    const data = await performGoogleRequest<GoogleFreeBusyResponse>({
      account,
      path: "/freeBusy",
      method: "POST",
      body: {
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        timeZone: params.timezone,
        items: [{ id: calendarId }],
      },
    });

    await googleRepository.touchLastSyncedAt(account.id, account.professionalId);

    const busy = data.calendars?.[calendarId]?.busy ?? [];
    const source: CalendarConflictSource = {
      calendarAccountId: account.id,
      calendarName: account.calendarName,
      provider: account.provider,
    };

    return busy.map((item) => ({
      start: new Date(item.start),
      end: new Date(item.end),
      sources: [source],
    }));
  },

  async getMergedBusyRanges(
    input: SyncCalendarBusyTimesInput,
  ): Promise<MergedBusyRange[]> {
    const parsed = syncCalendarBusyTimesSchema.parse(input);
    const accounts =
      await googleRepository.findConflictCheckCalendarsByProfessionalId(
        parsed.professionalId,
      );

    if (accounts.length === 0) {
      return [];
    }

    const allRanges = await Promise.all(
      accounts
        .filter((account) => account.provider === GOOGLE_PROVIDER)
        .map((account) =>
          this.getBusyRangesForCalendarAccount({
            calendarAccountId: account.id,
            start: parsed.start,
            end: parsed.end,
            timezone: parsed.timezone,
          }),
        ),
    );

    return mergeBusyRanges(allRanges.flat());
  },

  async createCalendarEvent(
    input: CreateCalendarEventInput,
  ): Promise<CreatedCalendarEvent> {
    const parsed = createCalendarEventSchema.parse(input);
    const account = await requireGoogleCalendarAccount(parsed.calendarAccountId);

    const calendarId = getCalendarIdentifier(account);

    const event = await performGoogleRequest<GoogleEventResponse>({
      account,
      path: `/calendars/${encodeURIComponent(calendarId)}/events`,
      method: "POST",
      query: {
        sendUpdates: "all",
        conferenceDataVersion: parsed.conferenceDataVersion,
      },
      body: {
        summary: parsed.title,
        description: parsed.description ?? undefined,
        location: parsed.location ?? undefined,
        start: {
          dateTime: new Date(parsed.start).toISOString(),
          timeZone: parsed.timeZone,
        },
        end: {
          dateTime: new Date(parsed.end).toISOString(),
          timeZone: parsed.timeZone,
        },
        attendees: parsed.attendees.map((attendee) => ({
          email: attendee.email,
          displayName: attendee.displayName,
          optional: attendee.optional ?? false,
        })),
        conferenceData:
          parsed.conferenceDataVersion && parsed.conferenceDataVersion > 0
            ? {
                createRequest: {
                  requestId: `req_${Date.now()}_${Math.random()
                    .toString(36)
                    .slice(2, 10)}`,
                },
              }
            : undefined,
      },
    });

    await googleRepository.touchLastSyncedAt(account.id, account.professionalId);

    return {
      externalEventId: event.id,
      eventUrl: event.htmlLink ?? null,
      meetingUrl: getMeetingUrl(event),
      status: "CREATED",
    };
  },

  async updateCalendarEvent(
    input: UpdateCalendarEventInput,
  ): Promise<CreatedCalendarEvent> {
    const parsed = updateCalendarEventSchema.parse(input);
    const account = await requireGoogleCalendarAccount(parsed.calendarAccountId);
    const calendarId = getCalendarIdentifier(account);

    const event = await performGoogleRequest<GoogleEventResponse>({
      account,
      path: `/calendars/${encodeURIComponent(
        calendarId,
      )}/events/${encodeURIComponent(parsed.externalEventId)}`,
      method: "PATCH",
      query: {
        sendUpdates: "all",
      },
      body: {
        ...(parsed.title !== undefined ? { summary: parsed.title } : {}),
        ...(parsed.description !== undefined
          ? { description: parsed.description ?? undefined }
          : {}),
        ...(parsed.location !== undefined
          ? { location: parsed.location ?? undefined }
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
                email: attendee.email,
                displayName: attendee.displayName,
                optional: attendee.optional ?? false,
              })),
            }
          : {}),
      },
    });

    await googleRepository.touchLastSyncedAt(account.id, account.professionalId);

    return {
      externalEventId: event.id,
      eventUrl: event.htmlLink ?? null,
      meetingUrl: getMeetingUrl(event),
      status: "UPDATED",
    };
  },

  async cancelCalendarEvent(params: {
    calendarAccountId: string;
    externalEventId: string;
  }): Promise<void> {
    const account = await requireGoogleCalendarAccount(params.calendarAccountId);
    const calendarId = getCalendarIdentifier(account);

    await performGoogleRequest<void>({
      account,
      path: `/calendars/${encodeURIComponent(
        calendarId,
      )}/events/${encodeURIComponent(params.externalEventId)}`,
      method: "DELETE",
      query: {
        sendUpdates: "all",
      },
    });

    await googleRepository.touchLastSyncedAt(account.id, account.professionalId);
  },
};