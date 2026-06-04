import { z } from "zod";

const emptyStringToUndefined = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value;
};

const optionalNullableTrimmedString = (max: number) =>
  z.preprocess(
    emptyStringToUndefined,
    z.string().trim().min(1).max(max).nullable().optional(),
  );

export const questionTypeSchema = z.enum([
  "SHORT_TEXT",
  "LONG_TEXT",
  "NUMBER",
  "MULTIPLE_CHOICE",
  "YES_NO",
]);

export const qualificationOutcomeTypeSchema = z.enum([
  "ALLOW_BOOKING",
  "REJECT",
  "REDIRECT",
]);

export const leadQualificationResultSchema = z.enum([
  "QUALIFIED",
  "REJECTED",
  "REDIRECTED",
]);

export const qualificationFieldOperatorSchema = z.enum([
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "contains",
  "not_contains",
  "in",
  "not_in",
  "is_true",
  "is_false",
]);

export const qualificationAnswerValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
  z.null(),
]);

// Base object (no refinements) — used by the update schema to call .partial().
const qualificationQuestionBaseSchema = z
  .object({
    serviceId: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(1).nullable().optional(),
    ),
    questionText: z.string().trim().min(5).max(500),
    questionType: questionTypeSchema,
    optionsJson: z
      .preprocess(
        (value) => {
          if (value === "" || value == null) {
            return undefined;
          }

          return value;
        },
        z.array(z.string().trim().min(1).max(200)).min(2).max(20).nullable().optional(),
      ),
    helpText: optionalNullableTrimmedString(500),
    sortOrder: z.coerce.number().int().min(0).max(999).optional(),
    isRequired: z.boolean().optional(),
  })
  .strict();

export const createQualificationQuestionSchema =
  qualificationQuestionBaseSchema.superRefine((value, ctx) => {
    if (value.questionType === "MULTIPLE_CHOICE") {
      if (!value.optionsJson || value.optionsJson.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["optionsJson"],
          message:
            "Multiple choice questions must include at least two options.",
        });
      }
    }

    if (
      value.questionType !== "MULTIPLE_CHOICE" &&
      value.optionsJson &&
      value.optionsJson.length > 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["optionsJson"],
        message: "optionsJson is only allowed for MULTIPLE_CHOICE questions.",
      });
    }
  });

export const updateQualificationQuestionSchema =
  qualificationQuestionBaseSchema
    .partial()
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one question field must be provided.",
    })
    .superRefine((value, ctx) => {
      if (
        value.questionType === "MULTIPLE_CHOICE" &&
        value.optionsJson &&
        value.optionsJson.length < 2
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["optionsJson"],
          message:
            "Multiple choice questions must include at least two options.",
        });
      }

      if (
        value.questionType &&
        value.questionType !== "MULTIPLE_CHOICE" &&
        value.optionsJson &&
        value.optionsJson.length > 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["optionsJson"],
          message: "optionsJson is only allowed for MULTIPLE_CHOICE questions.",
        });
      }
    });

export const qualificationRuleConditionSchema = z
  .object({
    field: z.string().trim().min(1),
    operator: qualificationFieldOperatorSchema,
    value: z
      .union([
        z.string(),
        z.number(),
        z.boolean(),
        z.array(z.string()),
        z.array(z.number()),
        z.null(),
      ])
      .optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const requiresNoValue =
      value.operator === "is_true" || value.operator === "is_false";

    if (requiresNoValue && value.value !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["value"],
        message: `${value.operator} must not include a value.`,
      });
    }

    if (!requiresNoValue && value.value === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["value"],
        message: `${value.operator} requires a comparison value.`,
      });
    }

    if (
      (value.operator === "in" || value.operator === "not_in") &&
      value.value !== undefined &&
      !Array.isArray(value.value)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["value"],
        message: `${value.operator} requires an array value.`,
      });
    }
  });

export const qualificationConditionGroupSchema = z
  .object({
    all: z.array(qualificationRuleConditionSchema).min(1).optional(),
    any: z.array(qualificationRuleConditionSchema).min(1).optional(),
  })
  .strict()
  .refine((value) => Boolean(value.all?.length || value.any?.length), {
    message: "At least one condition group is required.",
  });

// Base object (no refinements) — used by the update schema to call .partial().
const qualificationRuleBaseSchema = z
  .object({
    serviceId: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(1).nullable().optional(),
    ),
    conditionsJson: qualificationConditionGroupSchema,
    outcomeType: qualificationOutcomeTypeSchema,
    outcomeValue: optionalNullableTrimmedString(2000),
    priority: z.coerce.number().int().min(0).max(999).optional(),
    active: z.boolean().optional(),
  })
  .strict();

export const createQualificationRuleSchema =
  qualificationRuleBaseSchema.superRefine((value, ctx) => {
    if (value.outcomeType === "REDIRECT" && !value.outcomeValue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["outcomeValue"],
        message: "REDIRECT rules require an outcomeValue URL or path.",
      });
    }

    if (value.outcomeType === "REJECT" && !value.outcomeValue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["outcomeValue"],
        message: "REJECT rules require a rejection message.",
      });
    }
  });

export const updateQualificationRuleSchema = qualificationRuleBaseSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one rule field must be provided.",
  })
  .superRefine((value, ctx) => {
    if (value.outcomeType === "REDIRECT" && value.outcomeValue === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["outcomeValue"],
        message: "REDIRECT rules require an outcomeValue URL or path.",
      });
    }

    if (value.outcomeType === "REJECT" && value.outcomeValue === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["outcomeValue"],
        message: "REJECT rules require a rejection message.",
      });
    }
  });

export const qualificationAnswersSchema = z.record(
  z.string().trim().min(1),
  qualificationAnswerValueSchema,
);

export const qualificationSubmissionSchema = z
  .object({
    professionalId: z.string().trim().min(1),
    serviceId: z.string().trim().min(1),
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(320),
    answers: qualificationAnswersSchema,
  })
  .strict();

export const qualificationPreviewSchema = z
  .object({
    answers: qualificationAnswersSchema,
    rules: z.array(
      z.object({
        id: z.string().trim().min(1),
        professionalId: z.string().trim().min(1),
        serviceId: z.string().trim().min(1).nullable().optional(),
        conditionsJson: qualificationConditionGroupSchema,
        outcomeType: qualificationOutcomeTypeSchema,
        outcomeValue: z.string().nullable().optional(),
        priority: z.number().int(),
        active: z.boolean(),
        createdAt: z.date().optional(),
        updatedAt: z.date().optional(),
      }),
    ),
  })
  .strict();

export const questionIdParamSchema = z.object({
  id: z.string().trim().min(1),
});

export const ruleIdParamSchema = z.object({
  id: z.string().trim().min(1),
});

export const qualificationServiceQuerySchema = z.object({
  serviceId: z.preprocess(
    emptyStringToUndefined,
    z.string().trim().min(1).optional(),
  ),
});

export type QuestionTypeInput = z.infer<typeof questionTypeSchema>;
export type QualificationOutcomeTypeInput = z.infer<
  typeof qualificationOutcomeTypeSchema
>;
export type LeadQualificationResultInput = z.infer<
  typeof leadQualificationResultSchema
>;
export type QualificationFieldOperatorInput = z.infer<
  typeof qualificationFieldOperatorSchema
>;
export type QualificationAnswerValueInput = z.infer<
  typeof qualificationAnswerValueSchema
>;
export type CreateQualificationQuestionInput = z.infer<
  typeof createQualificationQuestionSchema
>;
export type UpdateQualificationQuestionInput = z.infer<
  typeof updateQualificationQuestionSchema
>;
export type QualificationRuleConditionInput = z.infer<
  typeof qualificationRuleConditionSchema
>;
export type QualificationConditionGroupInput = z.infer<
  typeof qualificationConditionGroupSchema
>;
export type CreateQualificationRuleInput = z.infer<
  typeof createQualificationRuleSchema
>;
export type UpdateQualificationRuleInput = z.infer<
  typeof updateQualificationRuleSchema
>;
export type QualificationAnswersInput = z.infer<
  typeof qualificationAnswersSchema
>;
export type QualificationSubmissionInput = z.infer<
  typeof qualificationSubmissionSchema
>;
export type QualificationPreviewInput = z.infer<
  typeof qualificationPreviewSchema
>;
export type QuestionIdParamInput = z.infer<typeof questionIdParamSchema>;
export type RuleIdParamInput = z.infer<typeof ruleIdParamSchema>;
export type QualificationServiceQueryInput = z.infer<
  typeof qualificationServiceQuerySchema
>;