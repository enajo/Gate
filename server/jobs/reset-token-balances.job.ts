import "server-only";

import { PLAN_TIER_LIMITS } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { profileRepository } from "@/server/repositories/profile.repository";

export type ResetTokenBalancesJobResult = {
  startedAt: string;
  finishedAt: string;
  resetCount: number;
};

/**
 * Monthly AI-qualification allowance reset. Every professional's
 * tokenBalance is set back to their plan tier's monthly allowance,
 * regardless of what they had left — unused balance doesn't roll over,
 * matching how the plan tiers were priced (a flat monthly amount, not a
 * banked credit system). Run on a monthly schedule for every professional
 * at once rather than per-user billing anniversaries, to keep the model
 * simple.
 */
export async function resetTokenBalancesJob(): Promise<ResetTokenBalancesJobResult> {
  const startedAt = new Date();
  logger.info("Starting token balance reset job.");

  const professionals = await profileRepository.findAllForTokenReset();
  const resetAt = new Date();

  for (const professional of professionals) {
    const allowance = PLAN_TIER_LIMITS[professional.planTier].monthlyTokenAllowance;
    await profileRepository.setTokenBalance(professional.id, allowance, resetAt);
  }

  const finishedAt = new Date();

  logger.info("Finished token balance reset job.", {
    resetCount: professionals.length,
  });

  return {
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    resetCount: professionals.length,
  };
}
