import "server-only";

import type { AccessCode, Prisma } from "@prisma/client";
import { db } from "@/lib/db";

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
      orderBy: [{ createdAt: "asc" }],
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

  async findByCodeHashForProfessional(
    professionalId: string,
    codeHash: string,
  ): Promise<AccessCode | null> {
    return db.accessCode.findFirst({
      where: {
        professionalId,
        codeHash,
        isActive: true,
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
};