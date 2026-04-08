import "server-only";

import type { Prisma, Service } from "@prisma/client";
import { db } from "@/lib/db";

const serviceWithMetaInclude = Prisma.validator<Prisma.ServiceInclude>()({
  _count: {
    select: {
      qualificationQuestions: true,
      qualificationRules: true,
      bookings: true,
    },
  },
});

export type ServiceWithMeta = Prisma.ServiceGetPayload<{
  include: typeof serviceWithMetaInclude;
}>;

export const serviceRepository = {
  async findById(id: string): Promise<Service | null> {
    return db.service.findUnique({
      where: { id },
    });
  },

  async findByIdForProfessional(
    id: string,
    professionalId: string,
  ): Promise<Service | null> {
    return db.service.findFirst({
      where: {
        id,
        professionalId,
      },
    });
  },

  async findBySlugForProfessional(
    slug: string,
    professionalId: string,
  ): Promise<Service | null> {
    return db.service.findFirst({
      where: {
        slug,
        professionalId,
      },
    });
  },

  async findManyByProfessionalId(professionalId: string): Promise<Service[]> {
    return db.service.findMany({
      where: { professionalId },
      orderBy: [{ createdAt: "asc" }],
    });
  },

  async findActiveByProfessionalId(professionalId: string): Promise<Service[]> {
    return db.service.findMany({
      where: {
        professionalId,
        active: true,
      },
      orderBy: [{ createdAt: "asc" }],
    });
  },

  async findManyByProfessionalIdWithMeta(
    professionalId: string,
  ): Promise<ServiceWithMeta[]> {
    return db.service.findMany({
      where: { professionalId },
      include: serviceWithMetaInclude,
      orderBy: [{ createdAt: "asc" }],
    });
  },

  async create(data: Prisma.ServiceCreateInput): Promise<Service> {
    return db.service.create({
      data,
    });
  },

  async createForProfessional(
    professionalId: string,
    data: Omit<Prisma.ServiceUncheckedCreateInput, "professionalId">,
  ): Promise<Service> {
    return db.service.create({
      data: {
        professionalId,
        ...data,
      },
    });
  },

  async updateById(id: string, data: Prisma.ServiceUpdateInput): Promise<Service> {
    return db.service.update({
      where: { id },
      data,
    });
  },

  async updateByIdForProfessional(
    id: string,
    professionalId: string,
    data: Prisma.ServiceUpdateInput,
  ): Promise<Service> {
    return db.service.update({
      where: {
        id,
        professionalId,
      },
      data,
    });
  },

  async setActiveState(
    id: string,
    professionalId: string,
    active: boolean,
  ): Promise<Service> {
    return db.service.update({
      where: {
        id,
        professionalId,
      },
      data: { active },
    });
  },

  async deleteById(id: string): Promise<Service> {
    return db.service.delete({
      where: { id },
    });
  },

  async deleteByIdForProfessional(
    id: string,
    professionalId: string,
  ): Promise<Service> {
    return db.service.delete({
      where: {
        id,
        professionalId,
      },
    });
  },

  async countByProfessionalId(professionalId: string): Promise<number> {
    return db.service.count({
      where: { professionalId },
    });
  },
};