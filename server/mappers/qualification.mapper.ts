import type {
  QualificationQuestion as PrismaQualificationQuestion,
  QualificationRule as PrismaQualificationRule,
} from "@prisma/client";
import type {
  QualificationConditionGroup,
  QualificationQuestion,
  QualificationQuestionListItem,
  QualificationRule,
  QualificationRuleListItem,
  QualificationRuleSummary,
} from "@/types/qualification";

export function mapQualificationQuestion(
  question: PrismaQualificationQuestion,
): QualificationQuestion {
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

export function mapQualificationQuestions(
  questions: PrismaQualificationQuestion[],
): QualificationQuestion[] {
  return questions.map(mapQualificationQuestion);
}

export function mapQualificationQuestionListItem(
  question: PrismaQualificationQuestion,
): QualificationQuestionListItem {
  return {
    id: question.id,
    questionText: question.questionText,
    questionType: question.questionType,
    optionsJson: (question.optionsJson as string[] | null) ?? null,
    helpText: question.helpText,
    sortOrder: question.sortOrder,
    isRequired: question.isRequired,
    serviceId: question.serviceId,
  };
}

export function mapQualificationQuestionListItems(
  questions: PrismaQualificationQuestion[],
): QualificationQuestionListItem[] {
  return questions.map(mapQualificationQuestionListItem);
}

export function mapQualificationRule(
  rule: PrismaQualificationRule,
): QualificationRule {
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

export function mapQualificationRules(
  rules: PrismaQualificationRule[],
): QualificationRule[] {
  return rules.map(mapQualificationRule);
}

export function mapQualificationRuleSummary(
  rule: PrismaQualificationRule,
): QualificationRuleSummary {
  return {
    id: rule.id,
    outcomeType: rule.outcomeType,
    outcomeValue: rule.outcomeValue,
    priority: rule.priority,
    active: rule.active,
  };
}

export function mapQualificationRuleListItem(
  rule: PrismaQualificationRule,
): QualificationRuleListItem {
  return {
    id: rule.id,
    outcomeType: rule.outcomeType,
    outcomeValue: rule.outcomeValue,
    priority: rule.priority,
    active: rule.active,
    serviceId: rule.serviceId,
    conditionsJson: rule.conditionsJson as QualificationConditionGroup,
  };
}

export function mapQualificationRuleListItems(
  rules: PrismaQualificationRule[],
): QualificationRuleListItem[] {
  return rules.map(mapQualificationRuleListItem);
}