import "server-only";

import type { Lead, Visit } from "@prisma/client";
import { db } from "@/lib/db";

export const visitRepository = {
  async createVisit(data: {
    professionalId: string;
    visitorId: string;
    referrer?: string | null;
    utmSource?: string | null;
    utmMedium?: string | null;
    utmCampaign?: string | null;
    landingPath?: string | null;
  }): Promise<Visit> {
    return db.visit.create({ data });
  },

  /** Backfills every un-linked visit from this visitor on this professional's page onto the new Lead. */
  async linkVisitsToLead(params: {
    professionalId: string;
    visitorId: string;
    leadId: string;
  }): Promise<void> {
    await db.visit.updateMany({
      where: {
        professionalId: params.professionalId,
        visitorId: params.visitorId,
        leadId: null,
      },
      data: { leadId: params.leadId },
    });
  },

  /**
   * The most recent Lead this visitor's earlier visits were stitched onto,
   * for this professional — i.e. "have we seen this browser become a lead
   * here before?". Null for a first-time or never-converted visitor.
   */
  async findMostRecentLinkedLead(params: {
    professionalId: string;
    visitorId: string;
  }): Promise<(Lead & { service: { title: string } }) | null> {
    const visit = await db.visit.findFirst({
      where: {
        professionalId: params.professionalId,
        visitorId: params.visitorId,
        leadId: { not: null },
      },
      orderBy: { createdAt: "desc" },
      include: { lead: { include: { service: { select: { title: true } } } } },
    });

    return visit?.lead ?? null;
  },

  async linkVisitToLead(visitId: string, leadId: string): Promise<void> {
    await db.visit.update({ where: { id: visitId }, data: { leadId } });
  },
};
