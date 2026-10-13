import { beforeEach, describe, expect, it, vi } from "vitest";

const mockProfileRepository = vi.hoisted(() => ({
  findBySlug: vi.fn(),
  recordSignupReferral: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/server/repositories/profile.repository", () => ({ profileRepository: mockProfileRepository }));
vi.mock("@/server/repositories/service.repository", () => ({ serviceRepository: {} }));

import { profileService } from "@/server/services/profile.service";

describe("profileService.recordSignupReferral", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("credits the professional whose gate link they followed", async () => {
    mockProfileRepository.findBySlug.mockResolvedValue({ id: "pro_sarah", userId: "user_sarah" });

    await profileService.recordSignupReferral("user_new", { slug: "sarah-malik", source: "email" });

    expect(mockProfileRepository.recordSignupReferral).toHaveBeenCalledWith({
      userId: "user_new",
      referredByProfessionalId: "pro_sarah",
      signupSource: "email",
    });
  });

  it("credits nobody for an unknown slug", async () => {
    mockProfileRepository.findBySlug.mockResolvedValue(null);

    await profileService.recordSignupReferral("user_new", { slug: "nobody", source: "page" });

    expect(mockProfileRepository.recordSignupReferral).not.toHaveBeenCalled();
  });

  it("never credits someone for referring themselves", async () => {
    mockProfileRepository.findBySlug.mockResolvedValue({ id: "pro_sarah", userId: "user_sarah" });

    await profileService.recordSignupReferral("user_sarah", { slug: "sarah-malik", source: "page" });

    expect(mockProfileRepository.recordSignupReferral).not.toHaveBeenCalled();
  });

  it("never fails onboarding when recording goes wrong", async () => {
    mockProfileRepository.findBySlug.mockRejectedValue(new Error("db down"));

    await expect(
      profileService.recordSignupReferral("user_new", { slug: "sarah-malik", source: "page" }),
    ).resolves.toBeUndefined();
  });
});
