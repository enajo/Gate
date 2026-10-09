import "server-only";

import { subDays } from "date-fns";

import { GHOST_RETURN_ALERT_COOLDOWN_DAYS } from "@/lib/constants";
import { env } from "@/lib/env";
import { getLeadSourceLabel } from "@/lib/lead-source";
import { logger } from "@/lib/logger";
import { bookingRepository } from "@/server/repositories/booking.repository";
import { profileRepository } from "@/server/repositories/profile.repository";
import { visitRepository } from "@/server/repositories/visit.repository";
import { emailService } from "@/server/services/email.service";

/**
 * Ghost recovery. A NO_RESPONSE outcome used to be a dead end — nothing
 * noticed if that person came back. Visit stitching already knows which
 * browser became which lead, so a new visit from a ghost's browser is a
 * specific, timely re-engagement signal.
 *
 * Gate only tells the professional; it never contacts the visitor itself.
 */
export const ghostRecoveryService = {
  /**
   * Called for every logged visit (after the response is sent). Never
   * throws — a failure here must not affect visit logging.
   */
  async handleVisit(params: {
    visitId: string;
    professionalId: string;
    visitorId: string;
    referrer?: string | null;
    utmSource?: string | null;
    now?: Date;
  }): Promise<void> {
    try {
      const lead = await visitRepository.findMostRecentLinkedLead({
        professionalId: params.professionalId,
        visitorId: params.visitorId,
      });

      if (!lead || lead.outcome !== "NO_RESPONSE") return;

      // Every return visit joins the lead's path in the inbox, even within
      // the alert cooldown, so the professional sees the full trail.
      await visitRepository.linkVisitToLead(params.visitId, lead.id);

      const now = params.now ?? new Date();
      const claimed = await bookingRepository.claimGhostReturnAlert(
        lead.id,
        now,
        subDays(now, GHOST_RETURN_ALERT_COOLDOWN_DAYS),
      );
      if (!claimed) return;

      const professional = await profileRepository.findByIdWithUser(
        params.professionalId,
      );
      if (!professional) return;

      await emailService.sendGhostReturnedProfessional({
        to: professional.user.email,
        professionalName: professional.fullName,
        visitorName: lead.name,
        visitorEmail: lead.email,
        serviceTitle: lead.service.title,
        markedNoResponseAt: lead.outcomeRespondedAt,
        returnSource: getLeadSourceLabel({
          referrer: params.referrer,
          utmSource: params.utmSource,
        }),
        appUrl: env.NEXT_PUBLIC_APP_URL.replace(/\/$/, ""),
      });
    } catch (error) {
      logger.error("ghostRecoveryService.handleVisit failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
};
