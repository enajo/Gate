import "server-only";

import { db } from "@/lib/db";
import { profileRepository } from "@/server/repositories/profile.repository";

export type PlatformStats = {
  professionals: {
    total: number;
    published: number;
  };
  leads: {
    total: number;
    byResult: Record<string, number>;
    corrected: number;
  };
  bookings: {
    total: number;
    confirmed: number;
  };
  outcomes: {
    won: number;
    lost: number;
    noResponse: number;
    totalWonValue: number;
  };
  tokenBalanceRemaining: number;
};

export type ProfessionalSummary = {
  id: string;
  fullName: string;
  slug: string;
  email: string;
  published: boolean;
  leadCount: number;
  tokenBalance: number;
  createdAt: Date;
};

const CONFIRMED_BOOKING_STATUSES = [
  "CONFIRMED",
  "EVENT_CREATION_PENDING",
  "EVENT_CREATED",
] as const;

/**
 * Founder-facing platform-wide view — not scoped to one professional.
 * Mostly read-only aggregates; the one write (unpublishProfessional) is a
 * moderation kill-switch, not a general-purpose edit surface.
 */
export const adminService = {
  async getPlatformStats(): Promise<PlatformStats> {
    const [
      totalProfessionals,
      publishedProfessionals,
      totalLeads,
      leadsByResult,
      correctedLeads,
      totalBookings,
      confirmedBookings,
      outcomeCounts,
      wonValueAgg,
      tokenBalanceAgg,
    ] = await Promise.all([
      db.professional.count(),
      db.professional.count({ where: { publishedAt: { not: null } } }),
      db.lead.count(),
      db.lead.groupBy({ by: ["qualificationResult"], _count: { _all: true } }),
      db.lead.count({ where: { correctedResult: { not: null } } }),
      db.booking.count(),
      db.booking.count({
        where: { status: { in: [...CONFIRMED_BOOKING_STATUSES] } },
      }),
      db.lead.groupBy({
        by: ["outcome"],
        _count: { _all: true },
        where: { outcome: { not: null } },
      }),
      db.lead.aggregate({
        _sum: { outcomeValue: true },
        where: { outcome: "WON" },
      }),
      db.professional.aggregate({ _sum: { tokenBalance: true } }),
    ]);

    const byResult: Record<string, number> = {};
    for (const row of leadsByResult) {
      byResult[row.qualificationResult] = row._count._all;
    }

    const outcomeMap: Record<string, number> = {};
    for (const row of outcomeCounts) {
      if (row.outcome) outcomeMap[row.outcome] = row._count._all;
    }

    return {
      professionals: {
        total: totalProfessionals,
        published: publishedProfessionals,
      },
      leads: {
        total: totalLeads,
        byResult,
        corrected: correctedLeads,
      },
      bookings: {
        total: totalBookings,
        confirmed: confirmedBookings,
      },
      outcomes: {
        won: outcomeMap.WON ?? 0,
        lost: outcomeMap.LOST ?? 0,
        noResponse: outcomeMap.NO_RESPONSE ?? 0,
        totalWonValue: wonValueAgg._sum.outcomeValue ?? 0,
      },
      tokenBalanceRemaining: tokenBalanceAgg._sum.tokenBalance ?? 0,
    };
  },

  async listProfessionals(): Promise<ProfessionalSummary[]> {
    const professionals = await db.professional.findMany({
      include: {
        user: { select: { email: true } },
        _count: { select: { leads: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return professionals.map((p) => ({
      id: p.id,
      fullName: p.fullName,
      slug: p.slug,
      email: p.user.email ?? "",
      published: Boolean(p.publishedAt),
      leadCount: p._count.leads,
      tokenBalance: p.tokenBalance,
      createdAt: p.createdAt,
    }));
  },

  /**
   * Moderation kill-switch: takes a professional's public page down
   * immediately (publishedAt -> null), independent of their own draft
   * state. They can re-publish themselves from their own Control Room
   * whenever they're ready — this only ever removes access, it never
   * grants it, so there's no risk of admin accidentally publishing a
   * draft the professional never approved.
   */
  async unpublishProfessional(professionalId: string): Promise<void> {
    await profileRepository.setPublishedAt(professionalId, null);
  },
};
