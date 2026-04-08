import { beforeEach, describe, expect, it, vi } from "vitest";

const mockProfileRepository = vi.hoisted(() => ({
  findByUserId: vi.fn(),
}));

const mockAccessCodeRepository = vi.hoisted(() => ({
  findByProfessionalId: vi.fn(),
  createForProfessional: vi.fn(),
  findByIdForProfessional: vi.fn(),
  updateById: vi.fn(),
  deleteById: vi.fn(),
  findValidCodeForProfessional: vi.fn(),
}));

vi.mock("@/server/repositories/profile.repository", () => ({
  profileRepository: mockProfileRepository,
}));

vi.mock("@/server/repositories/access-code.repository", () => ({
  accessCodeRepository: mockAccessCodeRepository,
}));

vi.mock("@/server/validators/access-code.validator", () => ({
  createAccessCodeSchema: { parse: vi.fn((value) => value) },
  updateAccessCodeSchema: { parse: vi.fn((value) => value) },
}));

import { accessCodeService } from "@/server/services/access-code.service";

describe("accessCodeService", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockProfileRepository.findByUserId.mockResolvedValue({
      id: "professional_1",
      userId: "user_1",
      fullName: "John Carter",
    });
  });

  describe("listAccessCodes", () => {
    it("returns access codes for the current professional", async () => {
      const accessCodes = [
        {
          id: "code_1",
          professionalId: "professional_1",
          code: "BETA2026",
          codeLabel: "Founder beta invite",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockAccessCodeRepository.findByProfessionalId.mockResolvedValue(accessCodes);

      const result = await accessCodeService.listAccessCodes("user_1");

      expect(mockProfileRepository.findByUserId).toHaveBeenCalledWith("user_1");
      expect(mockAccessCodeRepository.findByProfessionalId).toHaveBeenCalledWith(
        "professional_1",
      );
      expect(result).toEqual(accessCodes);
    });

    it("throws when the professional profile does not exist", async () => {
      mockProfileRepository.findByUserId.mockResolvedValueOnce(null);

      await expect(accessCodeService.listAccessCodes("user_1")).rejects.toThrow(
        "Professional profile not found.",
      );

      expect(
        mockAccessCodeRepository.findByProfessionalId,
      ).not.toHaveBeenCalled();
    });
  });

  describe("createAccessCode", () => {
    it("creates a new access code for the professional", async () => {
      const createdAccessCode = {
        id: "code_1",
        professionalId: "professional_1",
        code: "BETA2026",
        codeLabel: "Founder beta invite",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAccessCodeRepository.createForProfessional.mockResolvedValue(
        createdAccessCode,
      );

      const result = await accessCodeService.createAccessCode("user_1", {
        code: "BETA2026",
        codeLabel: "Founder beta invite",
        isActive: true,
      });

      expect(mockAccessCodeRepository.createForProfessional).toHaveBeenCalledWith(
        "professional_1",
        {
          code: "BETA2026",
          codeLabel: "Founder beta invite",
          isActive: true,
        },
      );
      expect(result).toEqual(createdAccessCode);
    });

    it("normalizes code input before creating", async () => {
      mockAccessCodeRepository.createForProfessional.mockResolvedValue({
        id: "code_1",
        professionalId: "professional_1",
        code: "BETA2026",
        codeLabel: "Founder beta invite",
        isActive: true,
      });

      await accessCodeService.createAccessCode("user_1", {
        code: "  beta2026  ",
        codeLabel: "  Founder beta invite  ",
        isActive: true,
      });

      expect(mockAccessCodeRepository.createForProfessional).toHaveBeenCalledWith(
        "professional_1",
        {
          code: "BETA2026",
          codeLabel: "Founder beta invite",
          isActive: true,
        },
      );
    });

    it("throws when the code is blank after normalization", async () => {
      await expect(
        accessCodeService.createAccessCode("user_1", {
          code: "   ",
          codeLabel: "Blank",
          isActive: true,
        }),
      ).rejects.toThrow("Access code is required.");

      expect(mockAccessCodeRepository.createForProfessional).not.toHaveBeenCalled();
    });
  });

  describe("updateAccessCode", () => {
    it("updates an existing access code for the professional", async () => {
      mockAccessCodeRepository.findByIdForProfessional.mockResolvedValue({
        id: "code_1",
        professionalId: "professional_1",
        code: "BETA2026",
        codeLabel: "Founder beta invite",
        isActive: true,
      });

      mockAccessCodeRepository.updateById.mockResolvedValue({
        id: "code_1",
        professionalId: "professional_1",
        code: "VIP2026",
        codeLabel: "VIP invite",
        isActive: false,
        updatedAt: new Date(),
      });

      const result = await accessCodeService.updateAccessCode("user_1", "code_1", {
        code: " vip2026 ",
        codeLabel: " VIP invite ",
        isActive: false,
      });

      expect(
        mockAccessCodeRepository.findByIdForProfessional,
      ).toHaveBeenCalledWith("professional_1", "code_1");
      expect(mockAccessCodeRepository.updateById).toHaveBeenCalledWith("code_1", {
        code: "VIP2026",
        codeLabel: "VIP invite",
        isActive: false,
      });
      expect(result).toMatchObject({
        id: "code_1",
        code: "VIP2026",
        codeLabel: "VIP invite",
        isActive: false,
      });
    });

    it("throws when the access code does not belong to the professional", async () => {
      mockAccessCodeRepository.findByIdForProfessional.mockResolvedValueOnce(null);

      await expect(
        accessCodeService.updateAccessCode("user_1", "missing_code", {
          codeLabel: "Updated label",
        }),
      ).rejects.toThrow("Access code not found.");

      expect(mockAccessCodeRepository.updateById).not.toHaveBeenCalled();
    });

    it("does not require all fields for patch updates", async () => {
      mockAccessCodeRepository.findByIdForProfessional.mockResolvedValue({
        id: "code_1",
        professionalId: "professional_1",
        code: "BETA2026",
        codeLabel: "Founder beta invite",
        isActive: true,
      });

      mockAccessCodeRepository.updateById.mockResolvedValue({
        id: "code_1",
        professionalId: "professional_1",
        code: "BETA2026",
        codeLabel: "Updated label",
        isActive: true,
      });

      await accessCodeService.updateAccessCode("user_1", "code_1", {
        codeLabel: " Updated label ",
      });

      expect(mockAccessCodeRepository.updateById).toHaveBeenCalledWith("code_1", {
        codeLabel: "Updated label",
      });
    });
  });

  describe("deleteAccessCode", () => {
    it("deletes an access code for the professional", async () => {
      mockAccessCodeRepository.findByIdForProfessional.mockResolvedValue({
        id: "code_1",
        professionalId: "professional_1",
      });

      mockAccessCodeRepository.deleteById.mockResolvedValue({
        id: "code_1",
      });

      await accessCodeService.deleteAccessCode("user_1", "code_1");

      expect(
        mockAccessCodeRepository.findByIdForProfessional,
      ).toHaveBeenCalledWith("professional_1", "code_1");
      expect(mockAccessCodeRepository.deleteById).toHaveBeenCalledWith("code_1");
    });

    it("throws when deleting a missing access code", async () => {
      mockAccessCodeRepository.findByIdForProfessional.mockResolvedValueOnce(null);

      await expect(
        accessCodeService.deleteAccessCode("user_1", "missing_code"),
      ).rejects.toThrow("Access code not found.");

      expect(mockAccessCodeRepository.deleteById).not.toHaveBeenCalled();
    });
  });

  describe("validateAccessCode", () => {
    it("returns the access code when it is valid and active", async () => {
      mockAccessCodeRepository.findValidCodeForProfessional.mockResolvedValue({
        id: "code_1",
        professionalId: "professional_1",
        code: "BETA2026",
        codeLabel: "Founder beta invite",
        isActive: true,
      });

      const result = await accessCodeService.validateAccessCode(
        "professional_1",
        " beta2026 ",
      );

      expect(
        mockAccessCodeRepository.findValidCodeForProfessional,
      ).toHaveBeenCalledWith("professional_1", "BETA2026");
      expect(result).toMatchObject({
        id: "code_1",
        code: "BETA2026",
        isActive: true,
      });
    });

    it("returns null when the code is not valid", async () => {
      mockAccessCodeRepository.findValidCodeForProfessional.mockResolvedValue(null);

      const result = await accessCodeService.validateAccessCode(
        "professional_1",
        "wrong-code",
      );

      expect(result).toBeNull();
    });

    it("returns null when the input code is blank", async () => {
      const result = await accessCodeService.validateAccessCode(
        "professional_1",
        "   ",
      );

      expect(result).toBeNull();
      expect(
        mockAccessCodeRepository.findValidCodeForProfessional,
      ).not.toHaveBeenCalled();
    });
  });
});