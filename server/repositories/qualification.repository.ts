import "server-only";

import type {
  Prisma,
  QualificationQuestion,
  QualificationRule,
} from "@prisma/client";
import { db } from "@/lib/db";

export const qualificationRepository = {
  async findQuestionById(id: string): Promise<QualificationQuestion | null> {
    return db.qualificationQuestion.findUnique({
      where: { id },
    });
  },

  async findQuestionByIdForProfessional(
    id: string,
    professionalId: string,
  ): Promise<QualificationQuestion | null> {
    return db.qualificationQuestion.findFirst({
      where: {
        id,
        professionalId,
      },
    });
  },

  async findQuestionsByProfessionalId(
    professionalId: string,
  ): Promise<QualificationQuestion[]> {
    return db.qualificationQuestion.findMany({
      where: { professionalId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  },

  async findQuestionsByServiceId(
    serviceId: string,
    professionalId?: string,
  ): Promise<QualificationQuestion[]> {
    return db.qualificationQuestion.findMany({
      where: {
        serviceId,
        ...(professionalId ? { professionalId } : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  },

  async findQuestionsForFlow(params: {
    professionalId: string;
    serviceId?: string | null;
  }): Promise<QualificationQuestion[]> {
    const { professionalId, serviceId } = params;

    return db.qualificationQuestion.findMany({
      where: {
        professionalId,
        OR: [{ serviceId: null }, ...(serviceId ? [{ serviceId }] : [])],
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  },

  async createQuestion(
    data: Prisma.QualificationQuestionCreateInput,
  ): Promise<QualificationQuestion> {
    return db.qualificationQuestion.create({
      data,
    });
  },

  async createQuestionForProfessional(
    professionalId: string,
    data: Omit<
      Prisma.QualificationQuestionUncheckedCreateInput,
      "professionalId"
    >,
  ): Promise<QualificationQuestion> {
    return db.qualificationQuestion.create({
      data: {
        professionalId,
        ...data,
      },
    });
  },

  async updateQuestionById(
    id: string,
    data: Prisma.QualificationQuestionUpdateInput,
  ): Promise<QualificationQuestion> {
    return db.qualificationQuestion.update({
      where: { id },
      data,
    });
  },

  async deleteQuestionById(id: string): Promise<QualificationQuestion> {
    return db.qualificationQuestion.delete({
      where: { id },
    });
  },

  async countQuestionsByProfessionalId(professionalId: string): Promise<number> {
    return db.qualificationQuestion.count({
      where: { professionalId },
    });
  },

  async findRuleById(id: string): Promise<QualificationRule | null> {
    return db.qualificationRule.findUnique({
      where: { id },
    });
  },

  async findRuleByIdForProfessional(
    id: string,
    professionalId: string,
  ): Promise<QualificationRule | null> {
    return db.qualificationRule.findFirst({
      where: {
        id,
        professionalId,
      },
    });
  },

  async findRulesByProfessionalId(
    professionalId: string,
  ): Promise<QualificationRule[]> {
    return db.qualificationRule.findMany({
      where: { professionalId },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    });
  },

  async findRulesByServiceId(
    serviceId: string,
    professionalId?: string,
  ): Promise<QualificationRule[]> {
    return db.qualificationRule.findMany({
      where: {
        serviceId,
        ...(professionalId ? { professionalId } : {}),
      },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    });
  },

  async findRulesForEvaluation(params: {
    professionalId: string;
    serviceId?: string | null;
  }): Promise<QualificationRule[]> {
    const { professionalId, serviceId } = params;

    return db.qualificationRule.findMany({
      where: {
        professionalId,
        active: true,
        OR: [{ serviceId: null }, ...(serviceId ? [{ serviceId }] : [])],
      },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    });
  },

  async createRule(
    data: Prisma.QualificationRuleCreateInput,
  ): Promise<QualificationRule> {
    return db.qualificationRule.create({
      data,
    });
  },

  async createRuleForProfessional(
    professionalId: string,
    data: Omit<Prisma.QualificationRuleUncheckedCreateInput, "professionalId">,
  ): Promise<QualificationRule> {
    return db.qualificationRule.create({
      data: {
        professionalId,
        ...data,
      },
    });
  },

  async updateRuleById(
    id: string,
    data: Prisma.QualificationRuleUpdateInput,
  ): Promise<QualificationRule> {
    return db.qualificationRule.update({
      where: { id },
      data,
    });
  },

  async deleteRuleById(id: string): Promise<QualificationRule> {
    return db.qualificationRule.delete({
      where: { id },
    });
  },

  async countRulesByProfessionalId(professionalId: string): Promise<number> {
    return db.qualificationRule.count({
      where: { professionalId },
    });
  },

  async getFlowData(params: {
    professionalId: string;
    serviceId?: string | null;
  }): Promise<{
    questions: QualificationQuestion[];
    rules: QualificationRule[];
  }> {
    const [questions, rules] = await db.$transaction([
      db.qualificationQuestion.findMany({
        where: {
          professionalId: params.professionalId,
          OR: [
            { serviceId: null },
            ...(params.serviceId ? [{ serviceId: params.serviceId }] : []),
          ],
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      }),
      db.qualificationRule.findMany({
        where: {
          professionalId: params.professionalId,
          active: true,
          OR: [
            { serviceId: null },
            ...(params.serviceId ? [{ serviceId: params.serviceId }] : []),
          ],
        },
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      }),
    ]);

    return { questions, rules };
  },
};