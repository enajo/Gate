import "server-only";

import { randomBytes } from "crypto";

import type {
  AccessCode,
  AccessCodeListItem,
  AccessCodeValidationInput,
  AccessCodeValidationResult,
  BulkGenerateAccessCodesInput,
  BulkGenerateAccessCodesResult,
  CreateAccessCodeInput,
  ToggleAccessCodeStatusInput,
  UpdateAccessCodeInput,
} from "@/types/access-code";
import { hashAccessCode } from "@/lib/crypto";
import { profileRepository } from "@/server/repositories/profile.repository";
import { accessCodeRepository } from "@/server/repositories/access-code.repository";
import type { AccessCodeWithService } from "@/server/repositories/access-code.repository";
import {
  accessCodeValidationSchema,
  bulkGenerateAccessCodesSchema,
  createAccessCodeSchema,
  toggleAccessCodeStatusSchema,
  updateAccessCodeSchema,
} from "@/server/validators/access-code.validator";

// ── Helpers ───────────────────────────────────────────────────────────────────

function mapAccessCode(
  accessCode: Awaited<ReturnType<typeof accessCodeRepository.findById>>,
): AccessCode | null {
  if (!accessCode) {
    return null;
  }

  return {
    id: accessCode.id,
    professionalId: accessCode.professionalId,
    serviceId: accessCode.serviceId,
    codeHash: accessCode.codeHash,
    codeLabel: accessCode.codeLabel,
    isActive: accessCode.isActive,
    usedAt: accessCode.usedAt,
    usedByEmail: accessCode.usedByEmail,
    createdAt: accessCode.createdAt,
    updatedAt: accessCode.updatedAt,
  };
}

function mapWithService(row: AccessCodeWithService): AccessCodeListItem & { serviceName: string | null } {
  return {
    id: row.id,
    professionalId: row.professionalId,
    serviceId: row.serviceId,
    codeLabel: row.codeLabel,
    isActive: row.isActive,
    usedAt: row.usedAt,
    usedByEmail: row.usedByEmail,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    serviceName: row.service?.title ?? null,
  };
}

/** Generate a random code like `A3B7F2E9` (8 hex chars, uppercase) */
function generateRandomCode(prefix?: string | null): string {
  const rand = randomBytes(4).toString("hex").toUpperCase();
  return prefix ? `${prefix}-${rand}` : rand;
}

async function requireProfessionalByUserId(userId: string) {
  const professional = await profileRepository.findByUserId(userId);

  if (!professional) {
    throw new Error("Professional profile not found.");
  }

  return professional;
}

// ── Service ───────────────────────────────────────────────────────────────────

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

  async list(userId: string): Promise<(AccessCodeListItem & { serviceName: string | null })[]> {
    const professional = await requireProfessionalByUserId(userId);
    const accessCodes = await accessCodeRepository.findManyWithServiceByProfessionalId(
      professional.id,
    );

    return accessCodes.map(mapWithService);
  },

  async listByService(
    userId: string,
    serviceId: string,
  ): Promise<AccessCodeListItem[]> {
    const professional = await requireProfessionalByUserId(userId);
    const codes = await accessCodeRepository.findManyByProfessionalAndService(
      professional.id,
      serviceId,
    );
    return codes.map(
      (ac): AccessCodeListItem => ({
        id: ac.id,
        professionalId: ac.professionalId,
        serviceId: ac.serviceId,
        codeLabel: ac.codeLabel,
        isActive: ac.isActive,
        usedAt: ac.usedAt,
        usedByEmail: ac.usedByEmail,
        createdAt: ac.createdAt,
        updatedAt: ac.updatedAt,
      }),
    );
  },

  async listActive(userId: string): Promise<AccessCodeListItem[]> {
    const professional = await requireProfessionalByUserId(userId);
    const accessCodes = await accessCodeRepository.findActiveByProfessionalId(
      professional.id,
    );

    return accessCodes.map((ac) => mapAccessCode(ac)!);
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
        serviceId: parsed.serviceId ?? null,
        isActive: parsed.isActive ?? true,
      },
    );

    return mapAccessCode(created)!;
  },

  /**
   * Bulk-generate N single-use access codes for a given service.
   * Returns the plain code values (shown once — not stored).
   * The codeLabel is set to the plain code value so the professional
   * can identify codes in the dashboard.
   */
  async bulkGenerate(
    userId: string,
    input: BulkGenerateAccessCodesInput,
  ): Promise<BulkGenerateAccessCodesResult> {
    const professional = await requireProfessionalByUserId(userId);
    const parsed = bulkGenerateAccessCodesSchema.parse(input);

    const rows: Array<{
      id: string;
      codeValue: string;
      codeLabel: string;
      serviceId: string | null;
    }> = [];

    const dbRows = [];

    for (let i = 0; i < parsed.count; i++) {
      const codeValue = generateRandomCode(parsed.labelPrefix ?? null);
      const label = codeValue; // label = the code itself for easy identification
      const id = crypto.randomUUID();

      rows.push({ id, codeValue, codeLabel: label, serviceId: parsed.serviceId ?? null });
      dbRows.push({
        id,
        professionalId: professional.id,
        serviceId: parsed.serviceId ?? null,
        codeHash: hashAccessCode(codeValue),
        codeLabel: label,
        isActive: true,
      });
    }

    await accessCodeRepository.createManyForProfessional(dbRows);

    return { codes: rows };
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
    // Normalize to uppercase before hashing — generated codes are always
    // uppercase, so this makes validation case-insensitive for typed input.
    const normalizedCode = parsed.code.trim().toUpperCase();
    const hashedCode = hashAccessCode(normalizedCode);

    const matched = await accessCodeRepository.findByCodeHashForProfessional(
      parsed.professionalId,
      hashedCode,
      parsed.serviceId ?? null,
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

  /**
   * Mark a code as used. Called after the hold is successfully created.
   * Silently no-ops if the code doesn't exist (validation already passed).
   */
  async markUsed(accessCodeId: string, usedByEmail: string): Promise<void> {
    try {
      await accessCodeRepository.markUsed(accessCodeId, usedByEmail);
    } catch {
      // Non-fatal — booking already created, don't block the response
    }
  },

  async count(userId: string): Promise<number> {
    const professional = await requireProfessionalByUserId(userId);
    return accessCodeRepository.countByProfessionalId(professional.id);
  },

  async countActive(userId: string): Promise<number> {
    const professional = await requireProfessionalByUserId(userId);
    return accessCodeRepository.countActiveByProfessionalId(professional.id);
  },

  async statsByService(
    userId: string,
    serviceId: string,
  ): Promise<{ available: number; used: number; total: number }> {
    const professional = await requireProfessionalByUserId(userId);
    return accessCodeRepository.countStatsByProfessionalAndService(
      professional.id,
      serviceId,
    );
  },
};
