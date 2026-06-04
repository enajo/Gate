export type QuestionType =
  | "SHORT_TEXT"
  | "LONG_TEXT"
  | "NUMBER"
  | "MULTIPLE_CHOICE"
  | "YES_NO";

export type QualificationOutcomeType =
  | "ALLOW_BOOKING"
  | "REJECT"
  | "REDIRECT"
  | "MANUAL_REVIEW";

export type LeadQualificationResult =
  | "QUALIFIED"
  | "REJECTED"
  | "REDIRECTED"
  | "PENDING_REVIEW";

export type QualificationQuestion = {
  id: string;
  professionalId: string;
  serviceId?: string | null;
  questionText: string;
  questionType: QuestionType;
  optionsJson?: string[] | null;
  helpText?: string | null;
  sortOrder: number;
  isRequired: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateQualificationQuestionInput = {
  serviceId?: string | null;
  questionText: string;
  questionType: QuestionType;
  optionsJson?: string[] | null;
  helpText?: string | null;
  sortOrder?: number;
  isRequired?: boolean;
};

export type UpdateQualificationQuestionInput =
  Partial<CreateQualificationQuestionInput>;

export type QualificationFieldOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "contains"
  | "not_contains"
  | "in"
  | "not_in"
  | "is_true"
  | "is_false";

export type QualificationRuleCondition = {
  field: string;
  operator: QualificationFieldOperator;
  value?: string | number | boolean | string[] | number[] | null;
};

export type QualificationConditionGroup = {
  all?: QualificationRuleCondition[];
  any?: QualificationRuleCondition[];
};

export type QualificationRule = {
  id: string;
  professionalId: string;
  serviceId?: string | null;
  conditionsJson: QualificationConditionGroup;
  outcomeType: QualificationOutcomeType;
  outcomeValue?: string | null;
  priority: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateQualificationRuleInput = {
  serviceId?: string | null;
  conditionsJson: QualificationConditionGroup;
  outcomeType: QualificationOutcomeType;
  outcomeValue?: string | null;
  priority?: number;
  active?: boolean;
};

export type UpdateQualificationRuleInput =
  Partial<CreateQualificationRuleInput>;

export type QualificationAnswerValue =
  | string
  | number
  | boolean
  | string[]
  | null;

export type QualificationAnswers = Record<string, QualificationAnswerValue>;

export type QualificationSubmissionInput = {
  professionalId: string;
  serviceId: string;
  name: string;
  email: string;
  answers: QualificationAnswers;
};

export type QualificationEvaluationResult = {
  result: LeadQualificationResult;
  outcomeType: QualificationOutcomeType;
  outcomeValue?: string | null;
  matchedRuleId?: string | null;
};

export type QualificationFlowData = {
  questions: QualificationQuestion[];
  rules: QualificationRule[];
};

export type QualificationQuestionSummary = Pick<
  QualificationQuestion,
  "id" | "questionText" | "questionType" | "sortOrder" | "isRequired"
> & {
  optionsJson?: string[] | null;
  helpText?: string | null;
};

export type QualificationRuleSummary = Pick<
  QualificationRule,
  "id" | "outcomeType" | "outcomeValue" | "priority" | "active"
>;

export type QualificationPreviewPayload = {
  answers: QualificationAnswers;
  rules: QualificationRule[];
};

export type QualificationPreviewResult = QualificationEvaluationResult & {
  matchedConditions?: QualificationRuleCondition[];
};

export type QualificationQuestionListItem = QualificationQuestionSummary & {
  serviceId?: string | null;
};

export type QualificationRuleListItem = QualificationRuleSummary & {
  serviceId?: string | null;
  conditionsJson: QualificationConditionGroup;
};