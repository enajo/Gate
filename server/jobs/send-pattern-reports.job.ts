import "server-only";

import { logger } from "@/lib/logger";
import { bookingRepository } from "@/server/repositories/booking.repository";
import { profileRepository } from "@/server/repositories/profile.repository";
import { formatTimeProtected, timeProtectedService } from "@/server/services/time-protected.service";
import { patternReportService } from "@/server/services/pattern-report.service";
import { emailService } from "@/server/services/email.service";
import type { PatternReportLeadInput } from "@/server/services/pattern-report.service";

const LOOKBACK_DAYS = 7;
// Below this many leads in the window, there isn't enough signal for a
// pattern to mean anything — skip rather than send a report with noise.
const MIN_LEADS_FOR_REPORT = 3;

export type SendPatternReportsJobResult = {
  startedAt: string;
  finishedAt: string;
  totals: {
    eligible: number;
    sent: number;
    skippedEmptyReport: number;
    failed: number;
  };
};

type LeadAnswers = {
  conversationHistory?: Array<{ role: string; content: string }>;
};

/**
 * Finds professionals with enough recent lead activity to make a pattern
 * report meaningful, has the AI summarise their qualification transcripts,
 * and emails a weekly digest — reusing the same OpenAI plumbing and
 * token-balance metering as the live qualification gate.
 */
export async function sendPatternReportsJob(): Promise<SendPatternReportsJobResult> {
  const startedAt = new Date();
  logger.info("Starting pattern report job.");

  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const professionalIds = await bookingRepository.findProfessionalIdsWithRecentLeads(
    since,
    MIN_LEADS_FOR_REPORT,
  );

  let sent = 0;
  let skippedEmptyReport = 0;
  let failed = 0;

  for (const professionalId of professionalIds) {
    try {
      const professional = await profileRepository.findByIdWithUser(professionalId);

      if (!professional) {
        failed += 1;
        continue;
      }

      const leads = await bookingRepository.findLeadsForPatternReport(
        professionalId,
        since,
      );

      const leadInputs: PatternReportLeadInput[] = leads.map((lead) => {
        const answers = lead.answersJson as LeadAnswers | null;
        return {
          qualificationResult: lead.qualificationResult,
          correctedResult: lead.correctedResult,
          conversationHistory: answers?.conversationHistory,
          referrer: lead.referrer,
          utmSource: lead.utmSource,
        };
      });

      const report = await patternReportService.generate(
        professional.fullName,
        leadInputs,
      );

      // A channel breakdown is only worth showing once there's more than
      // one channel to compare — a single-channel week has nothing to
      // contrast against.
      const hasChannelSignal = new Set(report.channelBreakdown.map((c) => c.channel)).size > 1;

      const hasContent =
        report.topRejectionReasons.length > 0 ||
        report.commonObjections.length > 0 ||
        report.suggestion.trim().length > 0 ||
        hasChannelSignal;

      if (!hasContent) {
        skippedEmptyReport += 1;
        continue;
      }

      // Best effort — the report still goes out if this fails.
      const timeProtected = await timeProtectedService
        .forProfessional(professionalId, since)
        .catch(() => null);

      await emailService.sendPatternReportProfessional({
        to: professional.user.email ?? "",
        professionalName: professional.fullName,
        leadCount: leads.length,
        timeProtected: timeProtected
          ? { calls: timeProtected.calls, label: formatTimeProtected(timeProtected.minutes) }
          : null,
        topRejectionReasons: report.topRejectionReasons,
        commonObjections: report.commonObjections,
        suggestion: report.suggestion,
        channelBreakdown: hasChannelSignal ? report.channelBreakdown : [],
      });

      sent += 1;
    } catch (error) {
      failed += 1;
      logger.error("Pattern report failed for professional.", {
        professionalId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const finishedAt = new Date();

  const summary: SendPatternReportsJobResult = {
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    totals: {
      eligible: professionalIds.length,
      sent,
      skippedEmptyReport,
      failed,
    },
  };

  logger.info("Finished pattern report job.", summary.totals);

  return summary;
}
