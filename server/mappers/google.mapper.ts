import type { CalendarAccount as PrismaCalendarAccount } from "@prisma/client";
import type {
  CalendarAccount,
  CalendarConflictSource,
  CreatedCalendarEvent,
  GoogleCalendarListItem,
  MergedBusyRange,
} from "@/types/google";

export type GoogleCalendarListApiItem = {
  id: string;
  summary?: string;
  description?: string;
  primary?: boolean;
  selected?: boolean;
  accessRole?: string;
  timeZone?: string;
  backgroundColor?: string;
  foregroundColor?: string;
};

export type GoogleEventApiResponse = {
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

export type GoogleBusyTimeRangeApiItem = {
  start: string;
  end: string;
};

export function mapPrismaCalendarAccountToCalendarAccount(
  account: PrismaCalendarAccount,
): CalendarAccount {
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

export function mapPrismaCalendarAccountsToCalendarAccounts(
  accounts: PrismaCalendarAccount[],
): CalendarAccount[] {
  return accounts.map(mapPrismaCalendarAccountToCalendarAccount);
}

export function mapGoogleCalendarListItem(
  item: GoogleCalendarListApiItem,
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

export function mapGoogleCalendarListItems(
  items: GoogleCalendarListApiItem[],
): GoogleCalendarListItem[] {
  return items.map(mapGoogleCalendarListItem);
}

export function getCalendarIdentifier(
  account: Pick<
    CalendarAccount,
    "externalCalendarId" | "providerEmail" | "externalAccountId"
  >,
): string {
  return (
    account.externalCalendarId ??
    account.providerEmail ??
    account.externalAccountId
  );
}

export function getCalendarConflictSource(
  account: Pick<CalendarAccount, "id" | "calendarName" | "provider">,
): CalendarConflictSource {
  return {
    calendarAccountId: account.id,
    calendarName: account.calendarName ?? null,
    provider: account.provider,
  };
}

export function getMeetingUrlFromGoogleEvent(
  event: GoogleEventApiResponse,
): string | null {
  if (event.hangoutLink) {
    return event.hangoutLink;
  }

  const videoEntry = event.conferenceData?.entryPoints?.find(
    (entry) => entry.entryPointType === "video" && entry.uri,
  );

  return videoEntry?.uri ?? null;
}

export function mapGoogleEventToCreatedCalendarEvent(
  event: GoogleEventApiResponse,
  status: CreatedCalendarEvent["status"] = "CREATED",
): CreatedCalendarEvent {
  return {
    externalEventId: event.id,
    eventUrl: event.htmlLink ?? null,
    meetingUrl: getMeetingUrlFromGoogleEvent(event),
    status,
  };
}

export function mapGoogleBusyRangesToMergedBusyRanges(params: {
  account: Pick<CalendarAccount, "id" | "calendarName" | "provider">;
  busy: GoogleBusyTimeRangeApiItem[];
}): MergedBusyRange[] {
  const source = getCalendarConflictSource(params.account);

  return params.busy.map((item) => ({
    start: new Date(item.start),
    end: new Date(item.end),
    sources: [source],
  }));
}

export function mergeBusyRanges(
  ranges: MergedBusyRange[],
): MergedBusyRange[] {
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