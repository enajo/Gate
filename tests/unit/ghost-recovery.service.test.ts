import { beforeEach, describe, expect, it, vi } from "vitest";

const mockVisitRepository = vi.hoisted(() => ({
  findMostRecentLinkedLead: vi.fn(),
  linkVisitToLead: vi.fn(),
}));

const mockBookingRepository = vi.hoisted(() => ({
  claimGhostReturnAlert: vi.fn(),
}));

const mockProfileRepository = vi.hoisted(() => ({
  findByIdWithUser: vi.fn(),
}));

const mockEmailService = vi.hoisted(() => ({
  sendGhostReturnedProfessional: vi.fn(),
}));

vi.mock("@/server/repositories/visit.repository", () => ({
  visitRepository: mockVisitRepository,
}));
vi.mock("@/server/repositories/booking.repository", () => ({
  bookingRepository: mockBookingRepository,
}));
vi.mock("@/server/repositories/profile.repository", () => ({
  profileRepository: mockProfileRepository,
}));
vi.mock("@/server/services/email.service", () => ({
  emailService: mockEmailService,
}));

import { ghostRecoveryService } from "@/server/services/ghost-recovery.service";

const NOW = new Date("2026-10-09T12:00:00.000Z");
const MARKED_AT = new Date("2026-09-25T12:00:00.000Z");

const VISIT = {
  visitId: "visit_2",
  professionalId: "professional_1",
  visitorId: "visitor_abc",
  referrer: "https://www.linkedin.com/feed/",
  utmSource: null,
  now: NOW,
};

const GHOST_LEAD = {
  id: "lead_1",
  name: "Jordan Rivera",
  email: "jordan@example.com",
  outcome: "NO_RESPONSE",
  outcomeRespondedAt: MARKED_AT,
  service: { title: "Strategy Session" },
};

describe("ghostRecoveryService.handleVisit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVisitRepository.findMostRecentLinkedLead.mockResolvedValue(GHOST_LEAD);
    mockBookingRepository.claimGhostReturnAlert.mockResolvedValue(true);
    mockProfileRepository.findByIdWithUser.mockResolvedValue({
      id: "professional_1",
      fullName: "Sarah Malik",
      user: { email: "sarah@example.com" },
    });
  });

  it("links the return visit and alerts the professional when a NO_RESPONSE lead comes back", async () => {
    await ghostRecoveryService.handleVisit(VISIT);

    expect(mockVisitRepository.linkVisitToLead).toHaveBeenCalledWith("visit_2", "lead_1");
    expect(mockBookingRepository.claimGhostReturnAlert).toHaveBeenCalledWith(
      "lead_1",
      NOW,
      new Date("2026-10-02T12:00:00.000Z"),
    );
    expect(mockEmailService.sendGhostReturnedProfessional).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "sarah@example.com",
        visitorName: "Jordan Rivera",
        visitorEmail: "jordan@example.com",
        serviceTitle: "Strategy Session",
        markedNoResponseAt: MARKED_AT,
        returnSource: "linkedin.com",
      }),
    );
  });

  it("does nothing for a visitor who never became a lead", async () => {
    mockVisitRepository.findMostRecentLinkedLead.mockResolvedValue(null);

    await ghostRecoveryService.handleVisit(VISIT);

    expect(mockVisitRepository.linkVisitToLead).not.toHaveBeenCalled();
    expect(mockEmailService.sendGhostReturnedProfessional).not.toHaveBeenCalled();
  });

  it.each(["WON", "LOST", null])("does nothing when the lead's outcome is %s", async (outcome) => {
    mockVisitRepository.findMostRecentLinkedLead.mockResolvedValue({ ...GHOST_LEAD, outcome });

    await ghostRecoveryService.handleVisit(VISIT);

    expect(mockVisitRepository.linkVisitToLead).not.toHaveBeenCalled();
    expect(mockEmailService.sendGhostReturnedProfessional).not.toHaveBeenCalled();
  });

  it("still links the visit but sends no email inside the cooldown", async () => {
    mockBookingRepository.claimGhostReturnAlert.mockResolvedValue(false);

    await ghostRecoveryService.handleVisit(VISIT);

    expect(mockVisitRepository.linkVisitToLead).toHaveBeenCalledWith("visit_2", "lead_1");
    expect(mockEmailService.sendGhostReturnedProfessional).not.toHaveBeenCalled();
  });

  it("never throws, even when a repository call fails", async () => {
    mockVisitRepository.findMostRecentLinkedLead.mockRejectedValue(new Error("db down"));

    await expect(ghostRecoveryService.handleVisit(VISIT)).resolves.toBeUndefined();
  });
});
