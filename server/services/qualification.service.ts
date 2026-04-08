import "server-only";

import type { Prisma } from "@prisma/client";
import type { Lead } from "@/types/booking";
import type {
  CreateQualificationQuestionInput,
  CreateQualificationRuleInput,
  LeadQualificationResult,
  QualificationAnswerValue,
  QualificationAnswers,
  QualificationConditionGroup,
  QualificationEvaluationResult,
  QualificationFlowData,
  QualificationPreviewPayload,
  QualificationPreviewResult,
  QualificationQuestion,
  QualificationQuestionListItem,
  QualificationRule,
  QualificationRuleCondition,
  QualificationRuleListItem,
  QualificationSubmissionInput,
  UpdateQualificationQuestionInput,
  UpdateQualificationRuleInput,
} from "@/types/qualification";
import { bookingRepository } from "@/server/repositories/booking.repository";
import { profileRepository } from "@/server/repositories/profile.repository";
import { qualificationRepository } from "@/server/repositories/qualification.repository";
import { serviceRepository } from "@/server/repositories/service.repository";
import {
  createQualificationQuestionSchema,
  createQualificationRuleSchema,
  qualificationPreviewSchema,
  qualificationSubmissionSchema,
  updateQualificationQuestionSchema,
  updateQualificationRuleSchema,
} from "@/server/validators/qualification.validator";

const DEFAULT_REJECTION_MESSAGE = "This request is not a fit right now.";

function mapQuestion(
  question: Awaited<ReturnType<typeof qualificationRepository.findQuestionById>>,
): QualificationQuestion | null {
  if (!question) {
    return null;
  }

  return {
    id: question.id,
    professionalId: question.professionalId,
    serviceId: question.serviceId,
    questionText: question.questionText,
    questionType: question.questionType,
    optionsJson: (question.optionsJson as string[] | null) ?? null,
    helpText: question.helpText,
    sortOrder: question.sortOrder,
    isRequired: question.isRequired,
    createdAt: question.createdAt,
    updatedAt: question.updatedAt,
  };
}

function mapRule(
  rule: Awaited<ReturnType<typeof qualificationRepository.findRuleById>>,
): QualificationRule | null {
  if (!rule) {
    return null;
  }

  return {
    id: rule.id,
    professionalId: rule.professionalId,
    serviceId: rule.serviceId,
    conditionsJson: rule.conditionsJson as QualificationConditionGroup,
    outcomeType: rule.outcomeType,
    outcomeValue: rule.outcomeValue,
    priority: rule.priority,
    active: rule.active,
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
  };
}

function mapLead(
  lead: Awaited<ReturnType<typeof bookingRepository.findLeadById>>,
): Lead | null {
  if (!lead) {
    return null;
  }

  return {
    id: lead.id,
    professionalId: lead.professionalId,
    serviceId: lead.serviceId,
    name: lead.name,
    email: lead.email,
    answersJson: lead.answersJson as Record<string, unknown>,
    qualificationResult: lead.qualificationResult,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  };
}

function isBlankAnswer(value: QualificationAnswerValue | undefined): boolean {
  if (value === undefined || value === null) {
    return true;
  }

  if (typeof value === "string") {
    return value.trim().length === 0;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  return false;
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  return value.trim().toLowerCase();
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function normalizeBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["true", "yes", "y", "1"].includes(normalized)) {
      return true;
    }

    if (["false", "no", "n", "0"].includes(normalized)) {
      return false;
    }
  }

  if (typeof value === "number") {
    if (value === 1) {
      return true;
    }

    if (value === 0) {
      return false;
    }
  }

  return null;
}

function valuesEqual(left: unknown, right: unknown): boolean {
  const leftNumber = normalizeNumber(left);
  const rightNumber = normalizeNumber(right);

  if (leftNumber !== null && rightNumber !== null) {
    return leftNumber === rightNumber;
  }

  const leftBoolean = normalizeBoolean(left);
  const rightBoolean = normalizeBoolean(right);

  if (leftBoolean !== null && rightBoolean !== null) {
    return leftBoolean === rightBoolean;
  }

  const leftString = normalizeString(left);
  const rightString = normalizeString(right);

  if (leftString !== null && rightString !== null) {
    return leftString === rightString;
  }

  return left === right;
}

function includesValue(haystack: unknown, needle: unknown): boolean {
  if (typeof haystack === "string" && typeof needle === "string") {
    return haystack.toLowerCase().includes(needle.toLowerCase());
  }

  if (Array.isArray(haystack)) {
    return haystack.some((item) => valuesEqual(item, needle));
  }

  return false;
}

function overlapsWithAny(answer: unknown, candidates: unknown[]): boolean {
  if (Array.isArray(answer)) {
    return answer.some((item) =>
      candidates.some((candidate) => valuesEqual(item, candidate)),
    );
  }

  return candidates.some((candidate) => valuesEqual(answer, candidate));
}

function evaluateCondition(
  answers: QualificationAnswers,
  condition: QualificationRuleCondition,
): boolean {
  const answer = answers[condition.field];

  switch (condition.operator) {
    case "eq":
      return valuesEqual(answer, condition.value);

    case "neq":
      return !valuesEqual(answer, condition.value);

    case "gt": {
      const left = normalizeNumber(answer);
      const right = normalizeNumber(condition.value);
      return left !== null && right !== null ? left > right : false;
    }

    case "gte": {
      const left = normalizeNumber(answer);
      const right = normalizeNumber(condition.value);
      return left !== null && right !== null ? left >= right : false;
    }

    case "lt": {
      const left = normalizeNumber(answer);
      const right = normalizeNumber(condition.value);
      return left !== null && right !== null ? left < right : false;
    }

    case "lte": {
      const left = normalizeNumber(answer);
      const right = normalizeNumber(condition.value);
      return left !== null && right !== null ? left <= right : false;
    }

    case "contains":
      return includesValue(answer, condition.value);

    case "not_contains":
      return !includesValue(answer, condition.value);

    case "in":
      return Array.isArray(condition.value)
        ? overlapsWithAny(answer, condition.value)
        : false;

    case "not_in":
      return Array.isArray(condition.value)
        ? !overlapsWithAny(answer, condition.value)
        : false;

    case "is_true":
      return normalizeBoolean(answer) === true;

    case "is_false":
      return normalizeBoolean(answer) === false;

    default:
      return false;
  }
}

function evaluateConditionGroup(
  answers: QualificationAnswers,
  group: QualificationConditionGroup,
): { matches: boolean; matchedConditions: QualificationRuleCondition[] } {
  const matchedConditions: QualificationRuleCondition[] = [];

  const allMatches = group.all
    ? group.all.every((condition) => {
        const matched = evaluateCondition(answers, condition);

        if (matched) {
          matchedConditions.push(condition);
        }

        return matched;
      })
    : true;

  const anyMatches = group.any
    ? group.any.some((condition) => {
        const matched = evaluateCondition(answers, condition);

        if (matched) {
          matchedConditions.push(condition);
        }

        return matched;
      })
    : true;

  return {
    matches: allMatches && anyMatches,
    matchedConditions,
  };
}

function outcomeToLeadResult(
  outcomeType: QualificationRule["outcomeType"],
): LeadQualificationResult {
  switch (outcomeType) {
    case "ALLOW_BOOKING":
      return "QUALIFIED";
    case "REDIRECT":
      return "REDIRECTED";
    case "REJECT":
    default:
      return "REJECTED";
  }
}

function ensureRequiredAnswers(
  questions: QualificationQuestion[],
  answers: QualificationAnswers,
) {
  for (const question of questions) {
    if (!question.isRequired) {
      continue;
    }

    const value = answers[question.id];

    if (isBlankAnswer(value)) {
      throw new Error(`Missing answer for required question: ${question.questionText}`);
    }
  }
}

function evaluateRules(
  answers: QualificationAnswers,
  rules: QualificationRule[],
): QualificationPreviewResult {
  const orderedRules = [...rules]
    .filter((rule) => rule.active)
    .sort((a, b) => a.priority - b.priority);

  for (const rule of orderedRules) {
    const evaluation = evaluateConditionGroup(answers, rule.conditionsJson);

    if (!evaluation.matches) {
      continue;
    }

    return {
      result: outcomeToLeadResult(rule.outcomeType),
      outcomeType: rule.outcomeType,
      outcomeValue: rule.outcomeValue ?? null,
      matchedRuleId: rule.id,
      matchedConditions: evaluation.matchedConditions,
    };
  }

  return {
    result: "REJECTED",
    outcomeType: "REJECT",
    outcomeValue: DEFAULT_REJECTION_MESSAGE,
    matchedRuleId: null,
    matchedConditions: [],
  };
}

async function requireProfessionalByUserId(userId: string) {
  const professional = await profileRepository.findByUserId(userId);

  if (!professional) {
    throw new Error("Professional profile not found.");
  }

  return professional;
}

async function requireProfessionalById(professionalId: string) {
  const professional = await profileRepository.findById(professionalId);

  if (!professional) {
    throw new Error("Professional profile not found.");
  }

  return professional;
}

async function assertServiceBelongsToProfessional(
  professionalId: string,
  serviceId?: string | null,
) {
  if (!serviceId) {
    return;
  }

  const service = await serviceRepository.findByIdForProfessional(
    serviceId,
    professionalId,
  );

  if (!service) {
    throw new Error("Service not found.");
  }
}

export const qualificationService = {
  async listQuestions(
    userId: string,
    serviceId?: string | null,
  ): Promise<QualificationQuestionListItem[]> {
    const professional = await requireProfessionalByUserId(userId);

    if (serviceId) {
      await assertServiceBelongsToProfessional(professional.id, serviceId);
    }

    const questions = serviceId
      ? await qualificationRepository.findQuestionsForFlow({
          professionalId: professional.id,
          serviceId,
        })
      : await qualificationRepository.findQuestionsByProfessionalId(
          professional.id,
        );

    return questions.map((question) => ({
      id: question.id,
      questionText: question.questionText,
      questionType: question.questionType,
      optionsJson: (question.optionsJson as string[] | null) ?? null,
      helpText: question.helpText,
      sortOrder: question.sortOrder,
      isRequired: question.isRequired,
      serviceId: question.serviceId,
    }));
  },

  async getQuestionById(
    userId: string,
    questionId: string,
  ): Promise<QualificationQuestion | null> {
    const professional = await requireProfessionalByUserId(userId);
    const question =
      await qualificationRepository.findQuestionByIdForProfessional(
        questionId,
        professional.id,
      );

    return mapQuestion(question);
  },

  async createQuestion(
    userId: string,
    input: CreateQualificationQuestionInput,
  ): Promise<QualificationQuestion> {
    const professional = await requireProfessionalByUserId(userId);
    const parsed = createQualificationQuestionSchema.parse(input);

    await assertServiceBelongsToProfessional(professional.id, parsed.serviceId);

    const question =
      await qualificationRepository.createQuestionForProfessional(
        professional.id,
        {
          serviceId: parsed.serviceId ?? null,
          questionText: parsed.questionText,
          questionType: parsed.questionType,
          optionsJson:
            (parsed.optionsJson ?? Prisma.JsonNull) as
              | Prisma.InputJsonValue
              | Prisma.NullableJsonNullValueInput,
          helpText: parsed.helpText ?? null,
          sortOrder: parsed.sortOrder ?? 0,
          isRequired: parsed.isRequired ?? true,
        },
      );

    return mapQuestion(question)!;
  },

  async updateQuestion(
    userId: string,
    questionId: string,
    input: UpdateQualificationQuestionInput,
  ): Promise<QualificationQuestion> {
    const professional = await requireProfessionalByUserId(userId);
    const existing =
      await qualificationRepository.findQuestionByIdForProfessional(
        questionId,
        professional.id,
      );

    if (!existing) {
      throw new Error("Qualification question not found.");
    }

    const parsed = updateQualificationQuestionSchema.parse(input);

    if (parsed.serviceId !== undefined) {
      await assertServiceBelongsToProfessional(professional.id, parsed.serviceId);
    }

    const updated = await qualificationRepository.updateQuestionById(
      existing.id,
      {
        ...(parsed.serviceId !== undefined
          ? { serviceId: parsed.serviceId ?? null }
          : {}),
        ...(parsed.questionText !== undefined
          ? { questionText: parsed.questionText }
          : {}),
        ...(parsed.questionType !== undefined
          ? { questionType: parsed.questionType }
          : {}),
        ...(parsed.optionsJson !== undefined
          ? {
              optionsJson:
                (parsed.optionsJson ?? Prisma.JsonNull) as
                  | Prisma.InputJsonValue
                  | Prisma.NullableJsonNullValueInput,
            }
          : {}),
        ...(parsed.helpText !== undefined
          ? { helpText: parsed.helpText ?? null }
          : {}),
        ...(parsed.sortOrder !== undefined
          ? { sortOrder: parsed.sortOrder }
          : {}),
        ...(parsed.isRequired !== undefined
          ? { isRequired: parsed.isRequired }
          : {}),
      },
    );

    return mapQuestion(updated)!;
  },

  async deleteQuestion(userId: string, questionId: string): Promise<void> {
    const professional = await requireProfessionalByUserId(userId);
    const existing =
      await qualificationRepository.findQuestionByIdForProfessional(
        questionId,
        professional.id,
      );

    if (!existing) {
      throw new Error("Qualification question not found.");
    }

    await qualificationRepository.deleteQuestionById(existing.id);
  },

  async listRules(
    userId: string,
    serviceId?: string | null,
  ): Promise<QualificationRuleListItem[]> {
    const professional = await requireProfessionalByUserId(userId);

    if (serviceId) {
      await assertServiceBelongsToProfessional(professional.id, serviceId);
    }

    const rules = serviceId
      ? await qualificationRepository.findRulesForEvaluation({
          professionalId: professional.id,
          serviceId,
        })
      : await qualificationRepository.findRulesByProfessionalId(
          professional.id,
        );

    return rules.map((rule) => ({
      id: rule.id,
      outcomeType: rule.outcomeType,
      outcomeValue: rule.outcomeValue,
      priority: rule.priority,
      active: rule.active,
      serviceId: rule.serviceId,
      conditionsJson: rule.conditionsJson as QualificationConditionGroup,
    }));
  },

  async getRuleById(
    userId: string,
    ruleId: string,
  ): Promise<QualificationRule | null> {
    const professional = await requireProfessionalByUserId(userId);
    const rule = await qualificationRepository.findRuleByIdForProfessional(
      ruleId,
      professional.id,
    );

    return mapRule(rule);
  },

  async createRule(
    userId: string,
    input: CreateQualificationRuleInput,
  ): Promise<QualificationRule> {
    const professional = await requireProfessionalByUserId(userId);
    const parsed = createQualificationRuleSchema.parse(input);

    await assertServiceBelongsToProfessional(professional.id, parsed.serviceId);

    const rule = await qualificationRepository.createRuleForProfessional(
      professional.id,
      {
        serviceId: parsed.serviceId ?? null,
        conditionsJson: parsed.conditionsJson as Prisma.InputJsonValue,
        outcomeType: parsed.outcomeType,
        outcomeValue: parsed.outcomeValue ?? null,
        priority: parsed.priority ?? 0,
        active: parsed.active ?? true,
      },
    );

    return mapRule(rule)!;
  },

  async updateRule(
    userId: string,
    ruleId: string,
    input: UpdateQualificationRuleInput,
  ): Promise<QualificationRule> {
    const professional = await requireProfessionalByUserId(userId);
    const existing = await qualificationRepository.findRuleByIdForProfessional(
      ruleId,
      professional.id,
    );

    if (!existing) {
      throw new Error("Qualification rule not found.");
    }

    const parsed = updateQualificationRuleSchema.parse(input);

    if (parsed.serviceId !== undefined) {
      await assertServiceBelongsToProfessional(professional.id, parsed.serviceId);
    }

    const updated = await qualificationRepository.updateRuleById(existing.id, {
      ...(parsed.serviceId !== undefined
        ? { serviceId: parsed.serviceId ?? null }
        : {}),
      ...(parsed.conditionsJson !== undefined
        ? { conditionsJson: parsed.conditionsJson as Prisma.InputJsonValue }
        : {}),
      ...(parsed.outcomeType !== undefined
        ? { outcomeType: parsed.outcomeType }
        : {}),
      ...(parsed.outcomeValue !== undefined
        ? { outcomeValue: parsed.outcomeValue ?? null }
        : {}),
      ...(parsed.priority !== undefined ? { priority: parsed.priority } : {}),
      ...(parsed.active !== undefined ? { active: parsed.active } : {}),
    });

    return mapRule(updated)!;
  },

  async deleteRule(userId: string, ruleId: string): Promise<void> {
    const professional = await requireProfessionalByUserId(userId);
    const existing = await qualificationRepository.findRuleByIdForProfessional(
      ruleId,
      professional.id,
    );

    if (!existing) {
      throw new Error("Qualification rule not found.");
    }

    await qualificationRepository.deleteRuleById(existing.id);
  },

  async getFlowData(params: {
    professionalId: string;
    serviceId?: string | null;
  }): Promise<QualificationFlowData> {
    await requireProfessionalById(params.professionalId);
    await assertServiceBelongsToProfessional(
      params.professionalId,
      params.serviceId,
    );

    const flow = await qualificationRepository.getFlowData({
      professionalId: params.professionalId,
      serviceId: params.serviceId,
    });

    return {
      questions: flow.questions.map((question) => mapQuestion(question)!),
      rules: flow.rules.map((rule) => mapRule(rule)!),
    };
  },

  async previewEvaluation(
    input: QualificationPreviewPayload,
  ): Promise<QualificationPreviewResult> {
    const parsed = qualificationPreviewSchema.parse(input);

    const rules = parsed.rules.map((rule) => ({
      id: rule.id,
      professionalId: rule.professionalId,
      serviceId: rule.serviceId ?? null,
      conditionsJson: rule.conditionsJson,
      outcomeType: rule.outcomeType,
      outcomeValue: rule.outcomeValue ?? null,
      priority: rule.priority,
      active: rule.active,
      createdAt: rule.createdAt ?? new Date(),
      updatedAt: rule.updatedAt ?? new Date(),
    })) satisfies QualificationRule[];

    return evaluateRules(parsed.answers, rules);
  },

  async submitQualification(input: QualificationSubmissionInput): Promise<{
    lead: Lead;
    evaluation: QualificationEvaluationResult;
  }> {
    const parsed = qualificationSubmissionSchema.parse(input);

    await requireProfessionalById(parsed.professionalId);
    await assertServiceBelongsToProfessional(
      parsed.professionalId,
      parsed.serviceId,
    );

    const flow = await this.getFlowData({
      professionalId: parsed.professionalId,
      serviceId: parsed.serviceId,
    });

    ensureRequiredAnswers(flow.questions, parsed.answers);

    const evaluation = evaluateRules(parsed.answers, flow.rules);

    const lead = await bookingRepository.createLeadForProfessional(
      parsed.professionalId,
      {
        serviceId: parsed.serviceId,
        name: parsed.name,
        email: parsed.email,
        answersJson: parsed.answers as Prisma.InputJsonValue,
        qualificationResult: evaluation.result,
      },
    );

    return {
      lead: mapLead(lead)!,
      evaluation: {
        result: evaluation.result,
        outcomeType: evaluation.outcomeType,
        outcomeValue: evaluation.outcomeValue ?? null,
        matchedRuleId: evaluation.matchedRuleId ?? null,
      },
    };
  },
};