import { beforeEach, describe, expect, it, vi } from "vitest";

const mockProfileRepository = vi.hoisted(() => ({
  findAllForTokenReset: vi.fn(),
  setTokenBalance: vi.fn(),
}));

vi.mock("@/server/repositories/profile.repository", () => ({
  profileRepository: mockProfileRepository,
}));

import { PLAN_TIER_LIMITS } from "@/lib/constants";
import { resetTokenBalancesJob } from "@/server/jobs/reset-token-balances.job";

describe("resetTokenBalancesJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resets each professional to their own tier's monthly allowance", async () => {
    mockProfileRepository.findAllForTokenReset.mockResolvedValue([
      { id: "free_pro", planTier: "FREE" },
      { id: "pro_pro", planTier: "PRO" },
      { id: "business_pro", planTier: "BUSINESS" },
    ]);

    const result = await resetTokenBalancesJob();

    expect(mockProfileRepository.setTokenBalance).toHaveBeenCalledWith(
      "free_pro",
      PLAN_TIER_LIMITS.FREE.monthlyTokenAllowance,
      expect.any(Date),
    );
    expect(mockProfileRepository.setTokenBalance).toHaveBeenCalledWith(
      "pro_pro",
      PLAN_TIER_LIMITS.PRO.monthlyTokenAllowance,
      expect.any(Date),
    );
    expect(mockProfileRepository.setTokenBalance).toHaveBeenCalledWith(
      "business_pro",
      PLAN_TIER_LIMITS.BUSINESS.monthlyTokenAllowance,
      expect.any(Date),
    );
    expect(result.resetCount).toBe(3);
  });

  it("resets zero professionals without error when there are none", async () => {
    mockProfileRepository.findAllForTokenReset.mockResolvedValue([]);

    const result = await resetTokenBalancesJob();

    expect(mockProfileRepository.setTokenBalance).not.toHaveBeenCalled();
    expect(result.resetCount).toBe(0);
  });
});
