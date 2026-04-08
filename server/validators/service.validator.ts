import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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

export const createServiceSchema = z
  .object({
    title: z.string().trim().min(2).max(120),
    slug: z.preprocess(
      emptyStringToUndefined,
      z
        .string()
        .trim()
        .min(3)
        .max(80)
        .regex(
          slugRegex,
          "Slug must contain only lowercase letters, numbers, and hyphens.",
        )
        .nullable()
        .optional(),
    ),
    description: optionalNullableTrimmedString(2000),
    displayPrice: optionalNullableTrimmedString(50),
    durationMinutes: z.coerce.number().int().min(5).max(480),
    preparationInstructions: optionalNullableTrimmedString(2000),
    active: z.boolean().optional(),
  })
  .strict();

export const updateServiceSchema = createServiceSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one service field must be provided.",
  });

export const reorderServicesSchema = z
  .object({
    serviceIds: z.array(z.string().trim().min(1)).min(1),
  })
  .strict();

export const serviceIdParamSchema = z.object({
  id: z.string().trim().min(1),
});

export const serviceSlugParamSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(3)
    .max(80)
    .regex(
      slugRegex,
      "Slug must contain only lowercase letters, numbers, and hyphens.",
    ),
});

export const serviceAvailabilityRequestSchema = z
  .object({
    serviceId: z.string().trim().min(1),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    timezone: z.string().trim().min(1).max(100).optional(),
  })
  .strict()
  .refine(
    (value) => new Date(value.endDate).getTime() > new Date(value.startDate).getTime(),
    {
      message: "endDate must be after startDate.",
      path: ["endDate"],
    },
  );

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
export type ReorderServicesInput = z.infer<typeof reorderServicesSchema>;
export type ServiceIdParamInput = z.infer<typeof serviceIdParamSchema>;
export type ServiceSlugParamInput = z.infer<typeof serviceSlugParamSchema>;
export type ServiceAvailabilityRequestInput = z.infer<
  typeof serviceAvailabilityRequestSchema
>;