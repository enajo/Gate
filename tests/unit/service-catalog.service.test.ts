import { beforeEach, describe, expect, it, vi } from "vitest";

const mockProfileRepository = vi.hoisted(() => ({
  findByUserId: vi.fn(),
}));

const mockServiceRepository = vi.hoisted(() => ({
  findActiveByProfessionalId: vi.fn(),
  findByIdForProfessional: vi.fn(),
  findBySlugForProfessional: vi.fn(),
  createForProfessional: vi.fn(),
  updateById: vi.fn(),
  setActiveState: vi.fn(),
}));

vi.mock("@/server/repositories/profile.repository", () => ({
  profileRepository: mockProfileRepository,
}));

vi.mock("@/server/repositories/service.repository", () => ({
  serviceRepository: mockServiceRepository,
}));

import { serviceCatalogService } from "@/server/services/service-catalog.service";

const USER_ID = "user_1";
const PROFESSIONAL_ID = "professional_1";
const SERVICE_ID = "service_1";

function professional(planTier: "FREE" | "PRO" | "BUSINESS") {
  return { id: PROFESSIONAL_ID, planTier };
}

function service(overrides: Partial<{ id: string; active: boolean }> = {}) {
  return {
    id: SERVICE_ID,
    professionalId: PROFESSIONAL_ID,
    title: "Strategy Session",
    slug: null,
    headline: null,
    description: null,
    meetingFormat: null,
    displayPrice: null,
    currency: null,
    durationMinutes: 30,
    preparationInstructions: null,
    idealPersonaDescription: null,
    gateSetupAnswers: null,
    paymentRequired: false,
    qualificationRequired: false,
    accessCodeRequired: false,
    manualApprovalRequired: false,
    availabilityExposure: "TWO_WEEKS",
    sortOrder: 0,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("serviceCatalogService — plan tier active-service cap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createService", () => {
    it("blocks a 2nd active service on the FREE tier", async () => {
      mockProfileRepository.findByUserId.mockResolvedValue(professional("FREE"));
      mockServiceRepository.findActiveByProfessionalId.mockResolvedValue([
        service({ id: "existing_active" }),
      ]);

      await expect(
        serviceCatalogService.createService(USER_ID, {
          title: "Second Service",
          durationMinutes: 30,
        }),
      ).rejects.toThrow("Your plan allows 1 active service. Upgrade to add more.");

      expect(mockServiceRepository.createForProfessional).not.toHaveBeenCalled();
    });

    it("allows the 1st active service on the FREE tier", async () => {
      mockProfileRepository.findByUserId.mockResolvedValue(professional("FREE"));
      mockServiceRepository.findActiveByProfessionalId.mockResolvedValue([]);
      mockServiceRepository.createForProfessional.mockResolvedValue(service());

      const result = await serviceCatalogService.createService(USER_ID, {
        title: "First Service",
        durationMinutes: 30,
      });

      expect(mockServiceRepository.createForProfessional).toHaveBeenCalled();
      expect(result.id).toBe(SERVICE_ID);
    });

    it("allows an inactive (draft) service on the FREE tier even at the cap", async () => {
      mockProfileRepository.findByUserId.mockResolvedValue(professional("FREE"));
      mockServiceRepository.findActiveByProfessionalId.mockResolvedValue([
        service({ id: "existing_active" }),
      ]);
      mockServiceRepository.createForProfessional.mockResolvedValue(
        service({ id: "draft", active: false }),
      );

      const result = await serviceCatalogService.createService(USER_ID, {
        title: "Draft Service",
        durationMinutes: 30,
        active: false,
      });

      expect(mockServiceRepository.createForProfessional).toHaveBeenCalled();
      expect(result.active).toBe(false);
    });

    it("does not enforce a cap on the PRO tier", async () => {
      mockProfileRepository.findByUserId.mockResolvedValue(professional("PRO"));
      mockServiceRepository.createForProfessional.mockResolvedValue(service());

      await serviceCatalogService.createService(USER_ID, {
        title: "Another Service",
        durationMinutes: 30,
      });

      // Unlimited tiers never even need to count active services.
      expect(mockServiceRepository.findActiveByProfessionalId).not.toHaveBeenCalled();
      expect(mockServiceRepository.createForProfessional).toHaveBeenCalled();
    });
  });

  describe("updateService", () => {
    it("blocks activating a draft service on the FREE tier when already at the cap", async () => {
      mockProfileRepository.findByUserId.mockResolvedValue(professional("FREE"));
      mockServiceRepository.findByIdForProfessional.mockResolvedValue(
        service({ id: SERVICE_ID, active: false }),
      );
      mockServiceRepository.findActiveByProfessionalId.mockResolvedValue([
        service({ id: "other_active" }),
      ]);

      await expect(
        serviceCatalogService.updateService(USER_ID, SERVICE_ID, { active: true }),
      ).rejects.toThrow("Your plan allows 1 active service. Upgrade to add more.");

      expect(mockServiceRepository.updateById).not.toHaveBeenCalled();
    });

    it("does not re-check the cap when a service already active stays active", async () => {
      mockProfileRepository.findByUserId.mockResolvedValue(professional("FREE"));
      mockServiceRepository.findByIdForProfessional.mockResolvedValue(
        service({ id: SERVICE_ID, active: true }),
      );
      mockServiceRepository.updateById.mockResolvedValue(service({ id: SERVICE_ID }));

      await serviceCatalogService.updateService(USER_ID, SERVICE_ID, {
        title: "Renamed",
        active: true,
      });

      expect(mockServiceRepository.findActiveByProfessionalId).not.toHaveBeenCalled();
      expect(mockServiceRepository.updateById).toHaveBeenCalled();
    });

    it("allows activating a draft once upgraded to PRO", async () => {
      mockProfileRepository.findByUserId.mockResolvedValue(professional("PRO"));
      mockServiceRepository.findByIdForProfessional.mockResolvedValue(
        service({ id: SERVICE_ID, active: false }),
      );
      mockServiceRepository.updateById.mockResolvedValue(
        service({ id: SERVICE_ID, active: true }),
      );

      const result = await serviceCatalogService.updateService(USER_ID, SERVICE_ID, {
        active: true,
      });

      expect(result.active).toBe(true);
    });
  });

  describe("toggleServiceActive", () => {
    it("blocks re-activating a FREE-tier service past the cap", async () => {
      mockProfileRepository.findByUserId.mockResolvedValue(professional("FREE"));
      mockServiceRepository.findByIdForProfessional.mockResolvedValue(
        service({ id: SERVICE_ID, active: false }),
      );
      mockServiceRepository.findActiveByProfessionalId.mockResolvedValue([
        service({ id: "other_active" }),
      ]);

      await expect(
        serviceCatalogService.toggleServiceActive(USER_ID, SERVICE_ID, true),
      ).rejects.toThrow("Your plan allows 1 active service. Upgrade to add more.");

      expect(mockServiceRepository.setActiveState).not.toHaveBeenCalled();
    });

    it("allows deactivating regardless of tier", async () => {
      mockProfileRepository.findByUserId.mockResolvedValue(professional("FREE"));
      mockServiceRepository.findByIdForProfessional.mockResolvedValue(
        service({ id: SERVICE_ID, active: true }),
      );
      mockServiceRepository.setActiveState.mockResolvedValue(
        service({ id: SERVICE_ID, active: false }),
      );

      const result = await serviceCatalogService.toggleServiceActive(
        USER_ID,
        SERVICE_ID,
        false,
      );

      expect(mockServiceRepository.findActiveByProfessionalId).not.toHaveBeenCalled();
      expect(result.active).toBe(false);
    });
  });
});
