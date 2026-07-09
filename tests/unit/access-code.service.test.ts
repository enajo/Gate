import { beforeEach, describe, expect, it, vi } from "vitest";

const mockProfileRepository = vi.hoisted(() => ({
  findByUserId: vi.fn(),
}));

const mockAccessCodeRepository = vi.hoisted(() => ({
  findManyWithServiceByProfessionalId: vi.fn(),
  findManyByProfessionalAndService: vi.fn(),
  findActiveByProfessionalId: vi.fn(),
  createForProfessional: vi.fn(),
  findByIdForProfessional: vi.fn(),
  updateById: vi.fn(),
  deleteById: vi.fn(),
  findByCodeHashForProfessional: vi.fn(),
  setActiveState: vi.fn(),
  countByProfessionalId: vi.fn(),
  countActiveByProfessionalId: vi.fn(),
  countStatsByProfessionalAndService: vi.fn(),
  createManyForProfessional: vi.fn(),
  markUsed: vi.fn(),
}));

// hashAccessCode is a real crypto function — stub it to avoid
// dependency on the ENCRYPTION_KEY / ACCESS_CODE_PEPPER env vars in unit tests.
vi.mock("@/lib/crypto", () => ({
  hashAccessCode: vi.fn((code: string) => `hashed:${code.toUpperCase()}`),
}));

vi.mock("@/server/repositories/profile.repository", () => ({
  profileRepository: mockProfileRepository,
}));

vi.mock("@/server/repositories/access-code.repository", () => ({
  accessCodeRepository: mockAccessCodeRepository,
}));

import { accessCodeService } from "@/server/services/access-code.service";
import { hashAccessCode } from "@/lib/crypto";

const PROFESSIONAL_ID = "professional_1";
const USER_ID = "user_1";
const NOW = new Date("2026-04-01T12:00:00.000Z");

describe("accessCodeService", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockProfileRepository.findByUserId.mockResolvedValue({
      id: PROFESSIONAL_ID,
      userId: USER_ID,
      fullName: "John Carter",
      timezone: "Europe/Berlin",
    });
  });

  // ── list ────────────────────────────────────────────────────────────────────

  describe("list", () => {
    it("returns access codes with service name for the professional", async () => {
      mockAccessCodeRepository.findManyWithServiceByProfessionalId.mockResolvedValue([
        {
          id: "code_1",
          professionalId: PROFESSIONAL_ID,
          serviceId: "service_1",
          codeHash: "hashed:BETA2026",
          codeLabel: "Founder beta invite",
          isActive: true,
          usedAt: null,
          usedByEmail: null,
          createdAt: NOW,
          updatedAt: NOW,
          service: { title: "Strategy Session" },
        },
      ]);

      const result = await accessCodeService.list(USER_ID);

      expect(mockAccessCodeRepository.findManyWithServiceByProfessionalId).toHaveBeenCalledWith(
        PROFESSIONAL_ID,
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "code_1",
        codeLabel: "Founder beta invite",
        isActive: true,
        serviceName: "Strategy Session",
      });
    });

    it("returns empty array when the professional has no codes", async () => {
      mockAccessCodeRepository.findManyWithServiceByProfessionalId.mockResolvedValue([]);
      const result = await accessCodeService.list(USER_ID);
      expect(result).toEqual([]);
    });
  });

  // ── create ──────────────────────────────────────────────────────────────────

  describe("create", () => {
    it("creates a code with a hashed value", async () => {
      mockAccessCodeRepository.createForProfessional.mockResolvedValue({
        id: "code_new",
        professionalId: PROFESSIONAL_ID,
        serviceId: "service_1",
        codeHash: "hashed:BETA2026",
        codeLabel: "Founder invite",
        isActive: true,
        usedAt: null,
        usedByEmail: null,
        createdAt: NOW,
        updatedAt: NOW,
      });

      const result = await accessCodeService.create(USER_ID, {
        code: "BETA2026",
        codeLabel: "Founder invite",
        serviceId: "service_1",
        isActive: true,
      });

      expect(mockAccessCodeRepository.createForProfessional).toHaveBeenCalledWith(
        PROFESSIONAL_ID,
        expect.objectContaining({
          codeHash: "hashed:BETA2026",
          codeLabel: "Founder invite",
          serviceId: "service_1",
          isActive: true,
        }),
      );
      expect(result.id).toBe("code_new");
    });

    it("stores the hash, never the plain code", async () => {
      mockAccessCodeRepository.createForProfessional.mockResolvedValue({
        id: "code_2",
        professionalId: PROFESSIONAL_ID,
        serviceId: null,
        codeHash: "hashed:SECRET",
        codeLabel: null,
        isActive: true,
        usedAt: null,
        usedByEmail: null,
        createdAt: NOW,
        updatedAt: NOW,
      });

      await accessCodeService.create(USER_ID, { code: "SECRET" });

      const [, storedFields] = mockAccessCodeRepository.createForProfessional.mock.calls[0];
      // codeHash must be the processed hash, never the raw plain code
      expect(storedFields.codeHash).toBe("hashed:SECRET");
      expect(storedFields.codeHash).not.toBe("SECRET");
    });
  });

  // ── update ──────────────────────────────────────────────────────────────────

  describe("update", () => {
    const existing = {
      id: "code_1",
      professionalId: PROFESSIONAL_ID,
      serviceId: null,
      codeHash: "hashed:OLD",
      codeLabel: "Old label",
      isActive: true,
      usedAt: null,
      usedByEmail: null,
      createdAt: NOW,
      updatedAt: NOW,
    };

    it("updates the label of an existing code", async () => {
      mockAccessCodeRepository.findByIdForProfessional.mockResolvedValue(existing);
      mockAccessCodeRepository.updateById.mockResolvedValue({ ...existing, codeLabel: "New label" });

      const result = await accessCodeService.update(USER_ID, "code_1", {
        codeLabel: "New label",
      });

      expect(mockAccessCodeRepository.updateById).toHaveBeenCalledWith(
        "code_1",
        expect.objectContaining({ codeLabel: "New label" }),
      );
      expect(result.codeLabel).toBe("New label");
    });

    it("hashes the new code value when the code is changed", async () => {
      mockAccessCodeRepository.findByIdForProfessional.mockResolvedValue(existing);
      mockAccessCodeRepository.updateById.mockResolvedValue({ ...existing, codeHash: "hashed:NEWCODE" });

      await accessCodeService.update(USER_ID, "code_1", { code: "NEWCODE" });

      expect(mockAccessCodeRepository.updateById).toHaveBeenCalledWith(
        "code_1",
        expect.objectContaining({ codeHash: "hashed:NEWCODE" }),
      );
    });

    it("throws when the code does not belong to the professional", async () => {
      mockAccessCodeRepository.findByIdForProfessional.mockResolvedValue(null);

      await expect(
        accessCodeService.update(USER_ID, "nonexistent", { codeLabel: "x" }),
      ).rejects.toThrow("Access code not found.");

      expect(mockAccessCodeRepository.updateById).not.toHaveBeenCalled();
    });
  });

  // ── delete ──────────────────────────────────────────────────────────────────

  describe("delete", () => {
    it("deletes a code that belongs to the professional", async () => {
      mockAccessCodeRepository.findByIdForProfessional.mockResolvedValue({
        id: "code_1",
        professionalId: PROFESSIONAL_ID,
        serviceId: null,
        codeHash: "hashed:BETA",
        codeLabel: null,
        isActive: true,
        usedAt: null,
        usedByEmail: null,
        createdAt: NOW,
        updatedAt: NOW,
      });
      mockAccessCodeRepository.deleteById.mockResolvedValue(undefined);

      await accessCodeService.delete(USER_ID, "code_1");

      expect(mockAccessCodeRepository.deleteById).toHaveBeenCalledWith("code_1");
    });

    it("throws when the code does not belong to the professional", async () => {
      mockAccessCodeRepository.findByIdForProfessional.mockResolvedValue(null);

      await expect(
        accessCodeService.delete(USER_ID, "nonexistent"),
      ).rejects.toThrow("Access code not found.");

      expect(mockAccessCodeRepository.deleteById).not.toHaveBeenCalled();
    });
  });

  // ── validate ────────────────────────────────────────────────────────────────

  describe("validate", () => {
    it("returns valid when hash matches an active code", async () => {
      mockAccessCodeRepository.findByCodeHashForProfessional.mockResolvedValue({
        id: "code_1",
        codeLabel: "Founder invite",
        isActive: true,
      });

      const result = await accessCodeService.validate({
        professionalId: PROFESSIONAL_ID,
        code: "BETA2026",
      });

      expect(result.isValid).toBe(true);
      expect(result.matchedCodeId).toBe("code_1");
      expect(result.codeLabel).toBe("Founder invite");
    });

    it("returns invalid when no matching code is found", async () => {
      mockAccessCodeRepository.findByCodeHashForProfessional.mockResolvedValue(null);

      const result = await accessCodeService.validate({
        professionalId: PROFESSIONAL_ID,
        code: "WRONGCODE",
      });

      expect(result.isValid).toBe(false);
      expect(result.matchedCodeId).toBeNull();
    });

    it("normalises the code to uppercase before hashing", async () => {
      mockAccessCodeRepository.findByCodeHashForProfessional.mockResolvedValue(null);

      await accessCodeService.validate({
        professionalId: PROFESSIONAL_ID,
        code: "beta2026",
      });

      expect(hashAccessCode).toHaveBeenCalledWith("BETA2026");
    });
  });
});
