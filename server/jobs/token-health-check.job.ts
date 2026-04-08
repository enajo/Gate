import "server-only";

import { CalendarProvider, CalendarSyncStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { googleCalendarService } from "@/server/services/google-calendar.service";

export type TokenHealthCheckJobResult = {
  startedAt: string;
  finishedAt: string;
  totals: {
    scanned: number;
    healthy: number;
    expired: number;
    failed: number;
  };
  results: Array<{
    calendarAccountId: string;
    professionalId: string;
    provider: CalendarProvider;
    calendarName: string | null;
    providerEmail: string | null;
    success: boolean;
    syncStatus: CalendarSyncStatus;
    reason?: string;
  }>;
};

function classifyTokenError(error: unknown): {
  syncStatus: CalendarSyncStatus;
  reason: string;
} {
  const reason =
    error instanceof Error ? error.message : "Unknown token health error.";

  const lowered = reason.toLowerCase();

  if (
    lowered.includes("unauthorized") ||
    lowered.includes("invalid_grant") ||
    lowered.includes("expired") ||
    lowered.includes("revoked") ||
    lowered.includes("token") ||
    lowered.includes("invalid credentials") ||
    lowered.includes("invalid authentication")
  ) {
    return {
      syncStatus: CalendarSyncStatus.EXPIRED,
      reason,
    };
  }

  return {
    syncStatus: CalendarSyncStatus.ERROR,
    reason,
  };
}

export async function tokenHealthCheckJob(): Promise<TokenHealthCheckJobResult> {
  const startedAt = new Date();

  logger.info("Starting token health check job.");

  const googleAccounts = await db.calendarAccount.findMany({
    where: {
      provider: CalendarProvider.GOOGLE,
      isActive: true,
    },
    orderBy: [{ professionalId: "asc" }, { updatedAt: "asc" }],
    select: {
      id: true,
      professionalId: true,
      provider: true,
      calendarName: true,
      providerEmail: true,
      calendarTimeZone: true,
    },
  });

  const results: TokenHealthCheckJobResult["results"] = [];

  for (const account of googleAccounts) {
    try {
      await googleCalendarService.getBusyRangesForCalendarAccount({
        calendarAccountId: account.id,
        start: new Date(),
        end: new Date(Date.now() + 60 * 60 * 1000),
        timezone: account.calendarTimeZone ?? "UTC",
      });

      await db.calendarAccount.update({
        where: { id: account.id },
        data: {
          syncStatus: CalendarSyncStatus.CONNECTED,
          lastSyncedAt: new Date(),
        },
      });

      results.push({
        calendarAccountId: account.id,
        professionalId: account.professionalId,
        provider: account.provider,
        calendarName: account.calendarName,
        providerEmail: account.providerEmail,
        success: true,
        syncStatus: CalendarSyncStatus.CONNECTED,
      });
    } catch (error) {
      const classified = classifyTokenError(error);

      await db.calendarAccount.update({
        where: { id: account.id },
        data: {
          syncStatus: classified.syncStatus,
        },
      });

      logger.error("Token health check failed.", {
        calendarAccountId: account.id,
        professionalId: account.professionalId,
        reason: classified.reason,
      });

      results.push({
        calendarAccountId: account.id,
        professionalId: account.professionalId,
        provider: account.provider,
        calendarName: account.calendarName,
        providerEmail: account.providerEmail,
        success: false,
        syncStatus: classified.syncStatus,
        reason: classified.reason,
      });
    }
  }

  const finishedAt = new Date();

  const summary: TokenHealthCheckJobResult = {
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    totals: {
      scanned: results.length,
      healthy: results.filter((item) => item.success).length,
      expired: results.filter(
        (item) => item.syncStatus === CalendarSyncStatus.EXPIRED,
      ).length,
      failed: results.filter(
        (item) =>
          !item.success && item.syncStatus === CalendarSyncStatus.ERROR,
      ).length,
    },
    results,
  };

  logger.info("Finished token health check job.", summary.totals);

  return summary;
}