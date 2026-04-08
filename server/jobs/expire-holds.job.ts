import "server-only";

import { BookingHoldStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export type ExpireHoldsJobResult = {
  startedAt: string;
  finishedAt: string;
  expiredCount: number;
  expiredHoldIds: string[];
};

export async function expireHoldsJob(): Promise<ExpireHoldsJobResult> {
  const startedAt = new Date();
  const now = new Date();

  logger.info("Starting expire holds job.", {
    now: now.toISOString(),
  });

  const expiredHolds = await db.bookingHold.findMany({
    where: {
      status: BookingHoldStatus.ACTIVE,
      expiresAt: {
        lte: now,
      },
    },
    select: {
      id: true,
    },
  });

  const expiredHoldIds = expiredHolds.map((hold) => hold.id);

  if (expiredHoldIds.length > 0) {
    await db.bookingHold.updateMany({
      where: {
        id: {
          in: expiredHoldIds,
        },
      },
      data: {
        status: BookingHoldStatus.EXPIRED,
      },
    });
  }

  const finishedAt = new Date();

  const result: ExpireHoldsJobResult = {
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    expiredCount: expiredHoldIds.length,
    expiredHoldIds,
  };

  logger.info("Finished expire holds job.", {
    expiredCount: result.expiredCount,
  });

  return result;
}