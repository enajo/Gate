import "server-only";

import type { AvailabilityRule, BlockedDate, Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const availabilityRepository = {
  async findAvailabilityRuleById(id: string): Promise<AvailabilityRule | null> {
    return db.availabilityRule.findUnique({
      where: { id },
    });
  },

  async findAvailabilityRuleByIdForProfessional(
    id: string,
    professionalId: string,
  ): Promise<AvailabilityRule | null> {
    return db.availabilityRule.findFirst({
      where: {
        id,
        professionalId,
      },
    });
  },

  async findAvailabilityRulesByProfessionalId(
    professionalId: string,
  ): Promise<AvailabilityRule[]> {
    return db.availabilityRule.findMany({
      where: { professionalId },
      orderBy: [{ weekday: "asc" }, { startTime: "asc" }, { createdAt: "asc" }],
    });
  },

  async findActiveAvailabilityRulesByProfessionalId(
    professionalId: string,
  ): Promise<AvailabilityRule[]> {
    return db.availabilityRule.findMany({
      where: {
        professionalId,
        active: true,
      },
      orderBy: [{ weekday: "asc" }, { startTime: "asc" }, { createdAt: "asc" }],
    });
  },

  async createAvailabilityRule(
    data: Prisma.AvailabilityRuleCreateInput,
  ): Promise<AvailabilityRule> {
    return db.availabilityRule.create({
      data,
    });
  },

  async createAvailabilityRuleForProfessional(
    professionalId: string,
    data: Omit<Prisma.AvailabilityRuleUncheckedCreateInput, "professionalId">,
  ): Promise<AvailabilityRule> {
    return db.availabilityRule.create({
      data: {
        professionalId,
        ...data,
      },
    });
  },

  async updateAvailabilityRuleById(
    id: string,
    data: Prisma.AvailabilityRuleUpdateInput,
  ): Promise<AvailabilityRule> {
    return db.availabilityRule.update({
      where: { id },
      data,
    });
  },

  async updateAvailabilityRuleByIdForProfessional(
    id: string,
    professionalId: string,
    data: Prisma.AvailabilityRuleUpdateInput,
  ): Promise<AvailabilityRule> {
    return db.$transaction(async (tx) => {
      const existing = await tx.availabilityRule.findFirst({
        where: {
          id,
          professionalId,
        },
      });

      if (!existing) {
        throw new Error("Availability rule not found.");
      }

      return tx.availabilityRule.update({
        where: { id: existing.id },
        data,
      });
    });
  },

  async deleteAvailabilityRuleById(id: string): Promise<AvailabilityRule> {
    return db.availabilityRule.delete({
      where: { id },
    });
  },

  async deleteAvailabilityRuleByIdForProfessional(
    id: string,
    professionalId: string,
  ): Promise<AvailabilityRule> {
    return db.$transaction(async (tx) => {
      const existing = await tx.availabilityRule.findFirst({
        where: {
          id,
          professionalId,
        },
      });

      if (!existing) {
        throw new Error("Availability rule not found.");
      }

      return tx.availabilityRule.delete({
        where: { id: existing.id },
      });
    });
  },

  async findBlockedDateById(id: string): Promise<BlockedDate | null> {
    return db.blockedDate.findUnique({
      where: { id },
    });
  },

  async findBlockedDateByIdForProfessional(
    id: string,
    professionalId: string,
  ): Promise<BlockedDate | null> {
    return db.blockedDate.findFirst({
      where: {
        id,
        professionalId,
      },
    });
  },

  async findBlockedDatesByProfessionalId(
    professionalId: string,
  ): Promise<BlockedDate[]> {
    return db.blockedDate.findMany({
      where: { professionalId },
      orderBy: [{ startDateTime: "asc" }, { createdAt: "asc" }],
    });
  },

  async findBlockedDatesInRange(params: {
    professionalId: string;
    start: Date;
    end: Date;
  }): Promise<BlockedDate[]> {
    return db.blockedDate.findMany({
      where: {
        professionalId: params.professionalId,
        startDateTime: {
          lt: params.end,
        },
        endDateTime: {
          gt: params.start,
        },
      },
      orderBy: [{ startDateTime: "asc" }, { createdAt: "asc" }],
    });
  },

  async createBlockedDate(
    data: Prisma.BlockedDateCreateInput,
  ): Promise<BlockedDate> {
    return db.blockedDate.create({
      data,
    });
  },

  async createBlockedDateForProfessional(
    professionalId: string,
    data: Omit<Prisma.BlockedDateUncheckedCreateInput, "professionalId">,
  ): Promise<BlockedDate> {
    return db.blockedDate.create({
      data: {
        professionalId,
        ...data,
      },
    });
  },

  async updateBlockedDateById(
    id: string,
    data: Prisma.BlockedDateUpdateInput,
  ): Promise<BlockedDate> {
    return db.blockedDate.update({
      where: { id },
      data,
    });
  },

  async updateBlockedDateByIdForProfessional(
    id: string,
    professionalId: string,
    data: Prisma.BlockedDateUpdateInput,
  ): Promise<BlockedDate> {
    return db.$transaction(async (tx) => {
      const existing = await tx.blockedDate.findFirst({
        where: {
          id,
          professionalId,
        },
      });

      if (!existing) {
        throw new Error("Blocked date not found.");
      }

      return tx.blockedDate.update({
        where: { id: existing.id },
        data,
      });
    });
  },

  async deleteBlockedDateById(id: string): Promise<BlockedDate> {
    return db.blockedDate.delete({
      where: { id },
    });
  },

  async deleteBlockedDateByIdForProfessional(
    id: string,
    professionalId: string,
  ): Promise<BlockedDate> {
    return db.$transaction(async (tx) => {
      const existing = await tx.blockedDate.findFirst({
        where: {
          id,
          professionalId,
        },
      });

      if (!existing) {
        throw new Error("Blocked date not found.");
      }

      return tx.blockedDate.delete({
        where: { id: existing.id },
      });
    });
  },

  async getAvailabilityData(params: {
    professionalId: string;
    start: Date;
    end: Date;
  }): Promise<{
    rules: AvailabilityRule[];
    blockedDates: BlockedDate[];
  }> {
    const [rules, blockedDates] = await db.$transaction([
      db.availabilityRule.findMany({
        where: {
          professionalId: params.professionalId,
          active: true,
        },
        orderBy: [
          { weekday: "asc" },
          { startTime: "asc" },
          { createdAt: "asc" },
        ],
      }),
      db.blockedDate.findMany({
        where: {
          professionalId: params.professionalId,
          startDateTime: {
            lt: params.end,
          },
          endDateTime: {
            gt: params.start,
          },
        },
        orderBy: [{ startDateTime: "asc" }, { createdAt: "asc" }],
      }),
    ]);

    return { rules, blockedDates };
  },

  async countAvailabilityRulesByProfessionalId(
    professionalId: string,
  ): Promise<number> {
    return db.availabilityRule.count({
      where: { professionalId },
    });
  },

  async countBlockedDatesByProfessionalId(
    professionalId: string,
  ): Promise<number> {
    return db.blockedDate.count({
      where: { professionalId },
    });
  },
};