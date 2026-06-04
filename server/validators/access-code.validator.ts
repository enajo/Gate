import { z } from "zod";

const emptyStringToUndefined = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value;
};

export const createAccessCodeSchema = z
  .object({
    code: z.string().trim().min(3).max(100),
    codeLabel: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(1).max(100).nullable().optional(),
    ),
    serviceId: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(1).nullable().optional(),
    ),
    isActive: z.boolean().optional(),
  })
  .strict();

export const updateAccessCodeSchema = z
  .object({
    code: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(3).max(100).optional(),
    ),
    codeLabel: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(1).max(100).nullable().optional(),
    ),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one access code field must be provided.",
  });

export const bulkGenerateAccessCodesSchema = z
  .object({
    serviceId: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(1).nullable().optional(),
    ),
    count: z.number().int().min(1).max(50),
    labelPrefix: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(1).max(50).nullable().optional(),
    ),
  })
  .strict();

export const accessCodeValidationSchema = z
  .object({
    professionalId: z.string().trim().min(1),
    serviceId: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(1).nullable().optional(),
    ),
    code: z.string().trim().min(1).max(100),
  })
  .strict();

export const toggleAccessCodeStatusSchema = z
  .object({
    accessCodeId: z.string().trim().min(1),
    isActive: z.boolean(),
  })
  .strict();

export const accessCodeIdParamSchema = z.object({
  id: z.string().trim().min(1),
});

export type CreateAccessCodeInput = z.infer<typeof createAccessCodeSchema>;
export type UpdateAccessCodeInput = z.infer<typeof updateAccessCodeSchema>;
export type BulkGenerateAccessCodesInput = z.infer<typeof bulkGenerateAccessCodesSchema>;
export type AccessCodeValidationInput = z.infer<typeof accessCodeValidationSchema>;
export type ToggleAccessCodeStatusInput = z.infer<typeof toggleAccessCodeStatusSchema>;
export type AccessCodeIdParamInput = z.infer<typeof accessCodeIdParamSchema>;
