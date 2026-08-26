import "server-only";

import { OUTCOME_FOLLOW_UP_DELAY_DAYS } from "@/lib/constants";
import { generateRandomToken } from "@/lib/crypto";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { bookingRepository } from "@/server/repositories/booking.repository";
import { emailService } from "@/server/services/email.service";

export type SendOutcomeFollowUpsJobResult = {
  startedAt: string;
  finishedAt: string;
  totals: {
    scanned: number;
    sent: number;
    failed: number;
  };
};

/**
 * Finds confirmed bookings whose call happened at least
 * OUTCOME_FOLLOW_UP_DELAY_DAYS ago and whose lead hasn't been asked about
 * the outcome yet, then sends a one-click follow-up email.
 */
export async function sendOutcomeFollowUpsJob(): Promise<SendOutcomeFollowUpsJobResult> {
  const startedAt = new Date();
  logger.info("Starting outcome follow-up job.");

  const cutoff = new Date(
    Date.now() - OUTCOME_FOLLOW_UP_DELAY_DAYS * 24 * 60 * 60 * 1000,
  );
  const allBookings = await bookingRepository.findBookingsPendingOutcomeFollowUp(cutoff);
  const appUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");

  // A lead can have more than one confirmed booking (e.g. rebooked after a
  // cancellation) — ask about the outcome once per lead, not once per booking.
  const seenLeadIds = new Set<string>();
  const bookings = allBookings.filter((booking) => {
    if (seenLeadIds.has(booking.leadId)) return false;
    seenLeadIds.add(booking.leadId);
    return true;
  });

  let sent = 0;
  let failed = 0;

  for (const booking of bookings) {
    try {
      const token = generateRandomToken();

      // Mark as sent before emailing — a duplicate send is far less bad
      // than a delivery failure leaving this booking permanently unmarked
      // and re-queued forever.
      await bookingRepository.updateLeadById(booking.leadId, {
        outcomeToken: token,
        outcomeFollowUpSentAt: new Date(),
      });

      await emailService.sendOutcomeFollowUpProfessional({
        to: booking.professional.user.email ?? "",
        professionalName: booking.professional.fullName,
        visitorName: booking.lead.name,
        serviceTitle: booking.service.title,
        outcomeUrl: `${appUrl}/outcome/${token}`,
      });

      sent += 1;
    } catch (error) {
      failed += 1;
      logger.error("Outcome follow-up send failed.", {
        bookingId: booking.id,
        leadId: booking.leadId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const finishedAt = new Date();

  const summary: SendOutcomeFollowUpsJobResult = {
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    totals: {
      scanned: allBookings.length,
      sent,
      failed,
    },
  };

  logger.info("Finished outcome follow-up job.", summary.totals);

  return summary;
}
