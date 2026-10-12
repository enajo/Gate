import "server-only";

import { PLAN_TIER_LIMITS } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { profileRepository } from "@/server/repositories/profile.repository";

export type ResetConversationAllowancesJobResult = {
  startedAt: string;
  finishedAt: string;
  resetCount: number;
};

/**
 * Monthly AI-screening allowance reset. Every professional's
 * conversationBalance is set back to their plan tier's monthly allowance,
 * regardless of what they had left — unused conversations don't roll over,
 * matching how the plan tiers were priced (a flat monthly amount, not a
 * banked credit system). Also re-arms the once-per-period "allowance used
 * up" email. Run on a monthly schedule for every professional at once rather
 * than per-user billing anniversaries, to keep the model simple.
 */
export async function resetConversationAllowancesJob(): Promise<ResetConversationAllowancesJobResult> {
  const startedAt = new Date();
  logger.info("Starting conversation allowance reset job.");

  const professionals = await profileRepository.findAllForAllowanceReset();
  const resetAt = new Date();

  for (const professional of professionals) {
    // null = unlimited; the balance is never read for those tiers.
    const allowance = PLAN_TIER_LIMITS[professional.planTier].monthlyConversations ?? 0;
    await profileRepository.setConversationBalance(professional.id, allowance, resetAt);
  }

  const finishedAt = new Date();

  logger.info("Finished conversation allowance reset job.", {
    resetCount: professionals.length,
  });

  return {
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    resetCount: professionals.length,
  };
}
