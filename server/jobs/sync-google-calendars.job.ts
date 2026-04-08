import "server-only";

import { CalendarProvider, CalendarSyncStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { googleCalendarService } from "@/server/services/google-calendar.service";

export type SyncGoogleCalendarsJobResult = {
  startedAt: string;
  finishedAt: string;
  window: {
    start: string;
    end: string;
  };
  totals: {
    scanned: number;
    succeeded: number;
    failed: number;
    expired: number;
  };
  results: Array<{
    calendarAccountId: string;
    professionalId: string;
    calendarName: string | null;
    providerEmail: string | null;
    success: boolean;
    syncStatus: CalendarSyncStatus;
    busyRangeCount?: number;
    error?: string;
  }>;
};

function buildRollingWindow(daysAhead = 90) {
  const start = new Date();
  start.setSeconds(0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + daysAhead);

  return {
    start,
    end,
  };
}

function getCalendarLabel(account: {
  calendarName: string | null;
  externalCalendarId: string | null;
}) {
  return account.calendarName || account.externalCalendarId || "Unnamed calendar";
}

function classifySyncError(error: unknown): {
  syncStatus: CalendarSyncStatus;
  message: string;
} {
  const message =
    error instanceof Error ? error.message : "Unknown Google sync error.";

  const lowered = message.toLowerCase();

  if (
    lowered.includes("unauthorized") ||
    lowered.includes("invalid_grant") ||
    lowered.includes("token") ||
    lowered.includes("expired") ||
    lowered.includes("invalid credentials") ||
    lowered.includes("invalid authentication")
  ) {
    return {
      syncStatus: CalendarSyncStatus.EXPIRED,
      message,
    };
  }

  return {
    syncStatus: CalendarSyncStatus.ERROR,
    message,
  };
}

async function markCalendarStatus(params: {
  calendarAccountId: string;
  syncStatus: CalendarSyncStatus;
  successful: boolean;
}) {
  await db.calendarAccount.update({
    where: { id: params.calendarAccountId },
    data: {
      syncStatus: params.syncStatus,
      ...(params.successful ? { lastSyncedAt: new Date() } : {}),
    },
  });
}

export async function syncGoogleCalendarsJob(): Promise<SyncGoogleCalendarsJobResult> {
  const startedAt = new Date();
  const window = buildRollingWindow(90);

  const accounts = await db.calendarAccount.findMany({
    where: {
      provider: CalendarProvider.GOOGLE,
      isActive: true,
      useForConflictCheck: true,
    },
    orderBy: [{ professionalId: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      professionalId: true,
      calendarName: true,
      providerEmail: true,
      externalCalendarId: true,
      calendarTimeZone: true,
    },
  });

  const results: SyncGoogleCalendarsJobResult["results"] = [];

  logger.info("Starting Google calendar reconciliation job.", {
    accountCount: accounts.length,
    start: window.start.toISOString(),
    end: window.end.toISOString(),
  });

  for (const account of accounts) {
    try {
      const busyRanges =
        await googleCalendarService.getBusyRangesForCalendarAccount({
          calendarAccountId: account.id,
          start: window.start,
          end: window.end,
          timezone: account.calendarTimeZone ?? "UTC",
        });

      await markCalendarStatus({
        calendarAccountId: account.id,
        syncStatus: CalendarSyncStatus.CONNECTED,
        successful: true,
      });

      results.push({
        calendarAccountId: account.id,
        professionalId: account.professionalId,
        calendarName: account.calendarName,
        providerEmail: account.providerEmail,
        success: true,
        syncStatus: CalendarSyncStatus.CONNECTED,
        busyRangeCount: busyRanges.length,
      });
    } catch (error) {
      const classified = classifySyncError(error);

      await markCalendarStatus({
        calendarAccountId: account.id,
        syncStatus: classified.syncStatus,
        successful: false,
      });

      logger.error("Google calendar reconciliation failed.", {
        calendarAccountId: account.id,
        professionalId: account.professionalId,
        calendar: getCalendarLabel(account),
        error: classified.message,
      });

      results.push({
        calendarAccountId: account.id,
        professionalId: account.professionalId,
        calendarName: account.calendarName,
        providerEmail: account.providerEmail,
        success: false,
        syncStatus: classified.syncStatus,
        error: classified.message,
      });
    }
  }

  const finishedAt = new Date();

  const summary: SyncGoogleCalendarsJobResult = {
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    window: {
      start: window.start.toISOString(),
      end: window.end.toISOString(),
    },
    totals: {
      scanned: results.length,
      succeeded: results.filter((item) => item.success).length,
      failed: results.filter((item) => !item.success).length,
      expired: results.filter(
        (item) => item.syncStatus === CalendarSyncStatus.EXPIRED,
      ).length,
    },
    results,
  };

  logger.info("Finished Google calendar reconciliation job.", summary.totals);

  return summary;
}