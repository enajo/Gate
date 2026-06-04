import "server-only";

import { Prisma } from "@prisma/client";
import type { Service } from "@prisma/client";
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

  /**
   * Atomically sync the full service list for a professional.
   *
   * - Services in `incoming` whose IDs already exist in the DB are updated.
   * - Services in `incoming` whose IDs do NOT exist are created (using the
   *   client-provided ID so the Control Room state stays consistent).
   * - Services that exist in the DB but are absent from `incoming` are deleted.
   *
   * Each service's qualification questions are diffed the same way.
   * Access codes are handled separately in the profile service layer.
   *
   * Everything runs inside a single Prisma transaction.
   */
  async upsertManyForProfessional(
    professionalId: string,
    incoming: Array<{
      id: string;
      title: string;
      slug?: string | null;
      headline?: string | null;
      description?: string | null;
      meetingFormat?: string | null;
      displayPrice?: string | null;
      currency?: string | null;
      durationMinutes: number;
      paymentRequired: boolean;
      qualificationRequired: boolean;
      accessCodeRequired: boolean;
      manualApprovalRequired: boolean;
      availabilityExposure: string;
      sortOrder: number;
      active: boolean;
      questions: Array<{
        id: string;
        questionText: string;
        questionType: string;
        isRequired: boolean;
        sortOrder: number;
        optionsJson?: unknown[] | null;
      }>;
    }>,
  ): Promise<Service[]> {
    return db.$transaction(async (tx) => {
      // IDs currently in the DB for this professional.
      const existing = await tx.service.findMany({
        where: { professionalId },
        select: { id: true },
      });
      const existingIds = new Set(existing.map((s) => s.id));
      const incomingIds = new Set(incoming.map((s) => s.id));

      // Delete services that were removed in the editor.
      const toDelete = [...existingIds].filter((id) => !incomingIds.has(id));
      if (toDelete.length > 0) {
        await tx.service.deleteMany({
          where: { id: { in: toDelete }, professionalId },
        });
      }

      const results: Service[] = [];

      for (const [index, svc] of incoming.entries()) {
        const serviceData = {
          title: svc.title,
          slug: svc.slug ?? null,
          headline: svc.headline ?? null,
          description: svc.description ?? null,
          meetingFormat: svc.meetingFormat ?? "Video call",
          displayPrice: svc.displayPrice ?? null,
          currency: svc.currency ?? "$",
          durationMinutes: svc.durationMinutes,
          paymentRequired: svc.paymentRequired,
          qualificationRequired: svc.qualificationRequired,
          accessCodeRequired: svc.accessCodeRequired,
          manualApprovalRequired: svc.manualApprovalRequired,
          // Cast: the value is validated against the enum before reaching here.
          availabilityExposure: svc.availabilityExposure as Service["availabilityExposure"],
          sortOrder: svc.sortOrder ?? index,
          active: svc.active,
        };

        let savedService: Service;

        if (existingIds.has(svc.id)) {
          savedService = await tx.service.update({
            where: { id: svc.id },
            data: serviceData,
          });
        } else {
          savedService = await tx.service.create({
            data: {
              id: svc.id,
              professionalId,
              ...serviceData,
            },
          });
        }

        results.push(savedService);

        // ── Qualification questions diff ──────────────────────────────────────
        const existingQs = await tx.qualificationQuestion.findMany({
          where: { serviceId: svc.id },
          select: { id: true },
        });
        const existingQIds = new Set(existingQs.map((q) => q.id));
        const incomingQIds = new Set(svc.questions.map((q) => q.id));

        const qsToDelete = [...existingQIds].filter((id) => !incomingQIds.has(id));
        if (qsToDelete.length > 0) {
          await tx.qualificationQuestion.deleteMany({
            where: { id: { in: qsToDelete } },
          });
        }

        for (const [qIndex, q] of svc.questions.entries()) {
          const qData = {
            questionText: q.questionText,
            questionType: q.questionType as "SHORT_TEXT" | "LONG_TEXT" | "NUMBER" | "MULTIPLE_CHOICE" | "YES_NO",
            isRequired: q.isRequired,
            sortOrder: q.sortOrder ?? qIndex,
            optionsJson: q.optionsJson != null
              ? (q.optionsJson as Prisma.InputJsonValue)
              : Prisma.JsonNull,
          };

          if (existingQIds.has(q.id)) {
            await tx.qualificationQuestion.update({
              where: { id: q.id },
              data: qData,
            });
          } else {
            await tx.qualificationQuestion.create({
              data: {
                id: q.id,
                professionalId,
                serviceId: svc.id,
                ...qData,
              },
            });
          }
        }
      }

      return results;
    });
  },
};