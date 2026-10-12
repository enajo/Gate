import { beforeEach, describe, expect, it, vi } from "vitest";

const mockProfileRepository = vi.hoisted(() => ({
  findAllForAllowanceReset: vi.fn(),
  setConversationBalance: vi.fn(),
}));

vi.mock("@/server/repositories/profile.repository", () => ({
  profileRepository: mockProfileRepository,
}));

import { resetConversationAllowancesJob } from "@/server/jobs/reset-conversation-allowances.job";

describe("resetConversationAllowancesJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resets each professional to their own tier's monthly conversations", async () => {
    mockProfileRepository.findAllForAllowanceReset.mockResolvedValue([
      { id: "free_pro", planTier: "FREE" },
      { id: "pro_pro", planTier: "PRO" },
      { id: "business_pro", planTier: "BUSINESS" },
    ]);

    const result = await resetConversationAllowancesJob();

    expect(mockProfileRepository.setConversationBalance).toHaveBeenCalledWith("free_pro", 10, expect.any(Date));
    expect(mockProfileRepository.setConversationBalance).toHaveBeenCalledWith("pro_pro", 100, expect.any(Date));
    // Unlimited — the balance is stored but never read.
    expect(mockProfileRepository.setConversationBalance).toHaveBeenCalledWith("business_pro", 0, expect.any(Date));
    expect(result.resetCount).toBe(3);
  });

  it("resets zero professionals without error when there are none", async () => {
    mockProfileRepository.findAllForAllowanceReset.mockResolvedValue([]);

    const result = await resetConversationAllowancesJob();

    expect(mockProfileRepository.setConversationBalance).not.toHaveBeenCalled();
    expect(result.resetCount).toBe(0);
  });
});
