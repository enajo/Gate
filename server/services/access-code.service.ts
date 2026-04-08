import "server-only";

import type {
  AccessCode,
  AccessCodeListItem,
  AccessCodeValidationInput,
  AccessCodeValidationResult,
  CreateAccessCodeInput,
  ToggleAccessCodeStatusInput,
  UpdateAccessCodeInput,
} from "@/types/access-code";
import { hashAccessCode } from "@/lib/crypto";
import { profileRepository } from "@/server/repositories/profile.repository";
import { accessCodeRepository } from "@/server/repositories/access-code.repository";
import {
  accessCodeValidationSchema,
  createAccessCodeSchema,
  toggleAccessCodeStatusSchema,
  updateAccessCodeSchema,
} from "@/server/validators/access-code.validator";

function mapAccessCode(
  accessCode: Awaited<ReturnType<typeof accessCodeRepository.findById>>,
): AccessCode | null {
  if (!accessCode) {
    return null;
  }

  return {
    id: accessCode.id,
    professionalId: accessCode.professionalId,
    codeHash: accessCode.codeHash,
    codeLabel: accessCode.codeLabel,
    isActive: accessCode.isActive,
    createdAt: accessCode.createdAt,
    updatedAt: accessCode.updatedAt,
  };
}

function toListItem(accessCode: AccessCode): AccessCodeListItem {
  return {
    id: accessCode.id,
    professionalId: accessCode.professionalId,
    codeLabel: accessCode.codeLabel,
    isActive: accessCode.isActive,
    createdAt: accessCode.createdAt,
    updatedAt: accessCode.updatedAt,
  };
}

async function requireProfessionalByUserId(userId: string) {
  const professional = await profileRepository.findByUserId(userId);

  if (!professional) {
    throw new Error("Professional profile not found.");
  }

  return professional;
}

export const accessCodeService = {
  async getById(
    userId: string,
    accessCodeId: string,
  ): Promise<AccessCode | null> {
    const professional = await requireProfessionalByUserId(userId);
    const accessCode = await accessCodeRepository.findByIdForProfessional(
      accessCodeId,
      professional.id,
    );

    return mapAccessCode(accessCode);
  },

  async list(userId: string): Promise<AccessCodeListItem[]> {
    const professional = await requireProfessionalByUserId(userId);
    const accessCodes = await accessCodeRepository.findManyByProfessionalId(
      professional.id,
    );

    return accessCodes
      .map((accessCode) => mapAccessCode(accessCode)!)
      .map(toListItem);
  },

  async listActive(userId: string): Promise<AccessCodeListItem[]> {
    const professional = await requireProfessionalByUserId(userId);
    const accessCodes = await accessCodeRepository.findActiveByProfessionalId(
      professional.id,
    );

    return accessCodes
      .map((accessCode) => mapAccessCode(accessCode)!)
      .map(toListItem);
  },

  async create(
    userId: string,
    input: CreateAccessCodeInput,
  ): Promise<AccessCode> {
    const professional = await requireProfessionalByUserId(userId);
    const parsed = createAccessCodeSchema.parse(input);

    const created = await accessCodeRepository.createForProfessional(
      professional.id,
      {
        codeHash: hashAccessCode(parsed.code),
        codeLabel: parsed.codeLabel ?? null,
        isActive: parsed.isActive ?? true,
      },
    );

    return mapAccessCode(created)!;
  },

  async update(
    userId: string,
    accessCodeId: string,
    input: UpdateAccessCodeInput,
  ): Promise<AccessCode> {
    const professional = await requireProfessionalByUserId(userId);
    const existing = await accessCodeRepository.findByIdForProfessional(
      accessCodeId,
      professional.id,
    );

    if (!existing) {
      throw new Error("Access code not found.");
    }

    const parsed = updateAccessCodeSchema.parse(input);

    const updated = await accessCodeRepository.updateById(existing.id, {
      ...(parsed.code !== undefined
        ? { codeHash: hashAccessCode(parsed.code) }
        : {}),
      ...(parsed.codeLabel !== undefined
        ? { codeLabel: parsed.codeLabel ?? null }
        : {}),
      ...(parsed.isActive !== undefined ? { isActive: parsed.isActive } : {}),
    });

    return mapAccessCode(updated)!;
  },

  async toggleStatus(
    userId: string,
    input: ToggleAccessCodeStatusInput,
  ): Promise<AccessCode> {
    const professional = await requireProfessionalByUserId(userId);
    const parsed = toggleAccessCodeStatusSchema.parse(input);

    const existing = await accessCodeRepository.findByIdForProfessional(
      parsed.accessCodeId,
      professional.id,
    );

    if (!existing) {
      throw new Error("Access code not found.");
    }

    const updated = await accessCodeRepository.setActiveState(
      existing.id,
      professional.id,
      parsed.isActive,
    );

    return mapAccessCode(updated)!;
  },

  async delete(userId: string, accessCodeId: string): Promise<void> {
    const professional = await requireProfessionalByUserId(userId);
    const existing = await accessCodeRepository.findByIdForProfessional(
      accessCodeId,
      professional.id,
    );

    if (!existing) {
      throw new Error("Access code not found.");
    }

    await accessCodeRepository.deleteById(existing.id);
  },

  async validate(
    input: AccessCodeValidationInput,
  ): Promise<AccessCodeValidationResult> {
    const parsed = accessCodeValidationSchema.parse(input);
    const hashedCode = hashAccessCode(parsed.code);

    const matched = await accessCodeRepository.findByCodeHashForProfessional(
      parsed.professionalId,
      hashedCode,
    );

    if (!matched) {
      return {
        isValid: false,
        matchedCodeId: null,
        codeLabel: null,
      };
    }

    return {
      isValid: true,
      matchedCodeId: matched.id,
      codeLabel: matched.codeLabel,
    };
  },

  async count(userId: string): Promise<number> {
    const professional = await requireProfessionalByUserId(userId);
    return accessCodeRepository.countByProfessionalId(professional.id);
  },

  async countActive(userId: string): Promise<number> {
    const professional = await requireProfessionalByUserId(userId);
    return accessCodeRepository.countActiveByProfessionalId(professional.id);
  },
};