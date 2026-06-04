import { z } from "zod";

const emptyStringToUndefined = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value;
};

export const weekdaySchema = z.enum([
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
]);

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const dateInputSchema = z.union([z.date(), z.string().datetime()]);

export const createAvailabilityRuleSchema = z
  .object({
    weekday: weekdaySchema,
    startTime: z
      .string()
      .trim()
      .regex(timeRegex, "startTime must be in HH:mm format."),
    endTime: z
      .string()
      .trim()
      .regex(timeRegex, "endTime must be in HH:mm format."),
    active: z.boolean().optional(),
  })
  .strict()
  .refine((value) => value.startTime < value.endTime, {
    message: "endTime must be later than startTime.",
    path: ["endTime"],
  });

export const updateAvailabilityRuleSchema = z
  .object({
    weekday: weekdaySchema.optional(),
    startTime: z
      .string()
      .trim()
      .regex(timeRegex, "startTime must be in HH:mm format.")
      .optional(),
    endTime: z
      .string()
      .trim()
      .regex(timeRegex, "endTime must be in HH:mm format.")
      .optional(),
    active: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one availability field must be provided.",
  })
  .superRefine((value, ctx) => {
    if (value.startTime && value.endTime && value.startTime >= value.endTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endTime"],
        message: "endTime must be later than startTime.",
      });
    }
  });

export const createBlockedDateSchema = z
  .object({
    startDateTime: dateInputSchema,
    endDateTime: dateInputSchema,
    reason: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(1).max(500).nullable().optional(),
    ),
  })
  .strict()
  .refine(
    (value) =>
      new Date(value.endDateTime).getTime() >
      new Date(value.startDateTime).getTime(),
    {
      message: "endDateTime must be after startDateTime.",
      path: ["endDateTime"],
    },
  );

export const updateBlockedDateSchema = z
  .object({
    startDateTime: dateInputSchema.optional(),
    endDateTime: dateInputSchema.optional(),
    reason: z
      .preprocess(
        emptyStringToUndefined,
        z.string().trim().min(1).max(500).nullable().optional(),
      )
      .optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one blocked date field must be provided.",
  })
  .superRefine((value, ctx) => {
    if (value.startDateTime && value.endDateTime) {
      const start = new Date(value.startDateTime).getTime();
      const end = new Date(value.endDateTime).getTime();

      if (end <= start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["endDateTime"],
          message: "endDateTime must be after startDateTime.",
        });
      }
    }
  });

export const availabilityRangeQuerySchema = z
  .object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    timezone: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(1).max(100).optional(),
    ),
  })
  .strict()
  .refine(
    (value) =>
      new Date(value.endDate).getTime() > new Date(value.startDate).getTime(),
    {
      message: "endDate must be after startDate.",
      path: ["endDate"],
    },
  );

export const busyTimeRangeSchema = z
  .object({
    start: z.coerce.date(),
    end: z.coerce.date(),
    source: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(1).max(200).optional(),
    ),
  })
  .strict()
  .refine((value) => value.end.getTime() > value.start.getTime(), {
    message: "Busy range end must be after start.",
    path: ["end"],
  });

export const bookingConflictCheckSchema = z
  .object({
    slotStart: dateInputSchema,
    slotEnd: dateInputSchema,
    busyRanges: z.array(busyTimeRangeSchema),
    blockedDates: z.array(
      z.object({
        id: z.string().trim().min(1),
        professionalId: z.string().trim().min(1),
        startDateTime: z.coerce.date(),
        endDateTime: z.coerce.date(),
        reason: z.string().nullable().optional(),
        createdAt: z.coerce.date().optional(),
        updatedAt: z.coerce.date().optional(),
      }),
    ),
  })
  .strict()
  .refine(
    (value) =>
      new Date(value.slotEnd).getTime() > new Date(value.slotStart).getTime(),
    {
      message: "slotEnd must be after slotStart.",
      path: ["slotEnd"],
    },
  );

export const availabilityRuleIdParamSchema = z.object({
  id: z.string().trim().min(1),
});

export const blockedDateIdParamSchema = z.object({
  id: z.string().trim().min(1),
});

export type WeekdayInput = z.infer<typeof weekdaySchema>;
export type CreateAvailabilityRuleInput = z.infer<
  typeof createAvailabilityRuleSchema
>;
export type UpdateAvailabilityRuleInput = z.infer<
  typeof updateAvailabilityRuleSchema
>;
export type CreateBlockedDateInput = z.infer<typeof createBlockedDateSchema>;
export type UpdateBlockedDateInput = z.infer<typeof updateBlockedDateSchema>;
export type AvailabilityRangeQueryInput = z.infer<
  typeof availabilityRangeQuerySchema
>;
export type BusyTimeRangeInput = z.infer<typeof busyTimeRangeSchema>;
export type BookingConflictCheckInput = z.infer<
  typeof bookingConflictCheckSchema
>;
export type AvailabilityRuleIdParamInput = z.infer<
  typeof availabilityRuleIdParamSchema
>;
export type BlockedDateIdParamInput = z.infer<
  typeof blockedDateIdParamSchema
>;