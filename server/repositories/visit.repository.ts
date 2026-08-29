import "server-only";

import type { Visit } from "@prisma/client";
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
};
