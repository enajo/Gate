import "server-only";

import { Prisma } from "@prisma/client";
import type { AccessCode } from "@prisma/client";
import { db } from "@/lib/db";

// ── Includes ───────────────────────────────────────────────────────────────────

const accessCodeWithServiceInclude = Prisma.validator<Prisma.AccessCodeInclude>()({
  service: { select: { id: true, title: true } },
});

export type AccessCodeWithService = Prisma.AccessCodeGetPayload<{
  include: typeof accessCodeWithServiceInclude;
}>;

// ── Repository ─────────────────────────────────────────────────────────────────

export const accessCodeRepository = {
  async findById(id: string): Promise<AccessCode | null> {
    return db.accessCode.findUnique({
      where: { id },
    });
  },

  async findByIdForProfessional(
    id: string,
    professionalId: string,
  ): Promise<AccessCode | null> {
    return db.accessCode.findFirst({
      where: {
        id,
        professionalId,
      },
    });
  },

  async findManyByProfessionalId(
    professionalId: string,
  ): Promise<AccessCode[]> {
    return db.accessCode.findMany({
      where: { professionalId },
      orderBy: [{ createdAt: "desc" }],
    });
  },

  async findManyByProfessionalAndService(
    professionalId: string,
    serviceId: string,
  ): Promise<AccessCode[]> {
    return db.accessCode.findMany({
      where: { professionalId, serviceId },
      orderBy: [{ createdAt: "desc" }],
    });
  },

  async findManyWithServiceByProfessionalId(
    professionalId: string,
  ): Promise<AccessCodeWithService[]> {
    return db.accessCode.findMany({
      where: { professionalId },
      include: accessCodeWithServiceInclude,
      orderBy: [{ createdAt: "desc" }],
    });
  },

  async findActiveByProfessionalId(
    professionalId: string,
  ): Promise<AccessCode[]> {
    return db.accessCode.findMany({
      where: {
        professionalId,
        isActive: true,
      },
      orderBy: [{ createdAt: "asc" }],
    });
  },

  /**
   * Find a valid, unused access code by its hash.
   * - Must be active
   * - Must not have been used (usedAt is null)
   * - If serviceId provided: must match that service OR be universal (serviceId is null)
   */
  async findByCodeHashForProfessional(
    professionalId: string,
    codeHash: string,
    serviceId?: string | null,
  ): Promise<AccessCode | null> {
    return db.accessCode.findFirst({
      where: {
        professionalId,
        codeHash,
        isActive: true,
        usedAt: null,
        ...(serviceId
          ? {
              OR: [
                { serviceId },
                { serviceId: null },
              ],
            }
          : {}),
      },
    });
  },

  async create(data: Prisma.AccessCodeCreateInput): Promise<AccessCode> {
    return db.accessCode.create({
      data,
    });
  },

  async createForProfessional(
    professionalId: string,
    data: Omit<Prisma.AccessCodeUncheckedCreateInput, "professionalId">,
  ): Promise<AccessCode> {
    return db.accessCode.create({
      data: {
        professionalId,
        ...data,
      },
    });
  },

  async createManyForProfessional(
    rows: Prisma.AccessCodeUncheckedCreateInput[],
  ): Promise<number> {
    const result = await db.accessCode.createMany({ data: rows });
    return result.count;
  },

  async updateById(
    id: string,
    data: Prisma.AccessCodeUpdateInput,
  ): Promise<AccessCode> {
    return db.accessCode.update({
      where: { id },
      data,
    });
  },

  async updateByIdForProfessional(
    id: string,
    professionalId: string,
    data: Prisma.AccessCodeUpdateInput,
  ): Promise<AccessCode> {
    return db.$transaction(async (tx) => {
      const existing = await tx.accessCode.findFirst({
        where: {
          id,
          professionalId,
        },
      });

      if (!existing) {
        throw new Error("Access code not found.");
      }

      return tx.accessCode.update({
        where: { id: existing.id },
        data,
      });
    });
  },

  async setActiveState(
    id: string,
    professionalId: string,
    isActive: boolean,
  ): Promise<AccessCode> {
    return db.$transaction(async (tx) => {
      const existing = await tx.accessCode.findFirst({
        where: {
          id,
          professionalId,
        },
      });

      if (!existing) {
        throw new Error("Access code not found.");
      }

      return tx.accessCode.update({
        where: { id: existing.id },
        data: { isActive },
      });
    });
  },

  /**
   * Mark a code as used by a specific email. Idempotent — if already used, no-op.
   */
  async markUsed(
    id: string,
    usedByEmail: string,
  ): Promise<AccessCode> {
    return db.accessCode.update({
      where: { id },
      data: {
        usedAt: new Date(),
        usedByEmail,
      },
    });
  },

  async deleteById(id: string): Promise<AccessCode> {
    return db.accessCode.delete({
      where: { id },
    });
  },

  async deleteByIdForProfessional(
    id: string,
    professionalId: string,
  ): Promise<AccessCode> {
    return db.$transaction(async (tx) => {
      const existing = await tx.accessCode.findFirst({
        where: {
          id,
          professionalId,
        },
      });

      if (!existing) {
        throw new Error("Access code not found.");
      }

      return tx.accessCode.delete({
        where: { id: existing.id },
      });
    });
  },

  async countByProfessionalId(professionalId: string): Promise<number> {
    return db.accessCode.count({
      where: { professionalId },
    });
  },

  async countActiveByProfessionalId(professionalId: string): Promise<number> {
    return db.accessCode.count({
      where: {
        professionalId,
        isActive: true,
      },
    });
  },

  async countStatsByProfessionalAndService(
    professionalId: string,
    serviceId: string,
  ): Promise<{ available: number; used: number; total: number }> {
    const [available, used] = await Promise.all([
      db.accessCode.count({
        where: { professionalId, serviceId, isActive: true, usedAt: null },
      }),
      db.accessCode.count({
        where: { professionalId, serviceId, usedAt: { not: null } },
      }),
    ]);
    return { available, used, total: available + used };
  },
};
