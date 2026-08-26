import { z } from "zod";

const emptyStringToUndefined = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value;
};

const dateInputSchema = z.union([z.date(), z.string().datetime()]);

export const bookingHoldStatusSchema = z.enum([
  "ACTIVE",
  "EXPIRED",
  "CONVERTED",
  "RELEASED",
]);

export const bookingStatusSchema = z.enum([
  "PENDING_CODE",
  "CODE_INVALID",
  "CONFIRMED",
  "EVENT_CREATION_PENDING",
  "EVENT_CREATED",
  "CANCELLED",
]);

export const codeValidationStatusSchema = z.enum([
  "PENDING",
  "VALID",
  "INVALID",
]);

export const calendarStatusSchema = z.enum([
  "PENDING",
  "CREATED",
  "FAILED",
]);

export const leadQualificationResultSchema = z.enum([
  "QUALIFIED",
  "REJECTED",
  "REDIRECTED",
]);

export const leadCorrectionSchema = z.object({
  correctedResult: leadQualificationResultSchema,
  note: z.string().trim().max(500).optional(),
});

export const leadOutcomeSubmissionSchema = z.object({
  result: z.enum(["WON", "LOST", "NO_RESPONSE"]),
  value: z.coerce.number().int().positive().max(100_000_000).optional(),
});

export const createBookingHoldSchema = z
  .object({
    professionalId: z.string().trim().min(1),
    serviceId: z.string().trim().min(1),
    leadId: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(1).nullable().optional(),
    ),
    slotStart: dateInputSchema,
    slotEnd: dateInputSchema,
    expiresAt: dateInputSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    const slotStart = new Date(value.slotStart).getTime();
    const slotEnd = new Date(value.slotEnd).getTime();
    const expiresAt = new Date(value.expiresAt).getTime();

    if (slotEnd <= slotStart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["slotEnd"],
        message: "slotEnd must be after slotStart.",
      });
    }

    if (expiresAt <= Date.now()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expiresAt"],
        message: "expiresAt must be in the future.",
      });
    }

    if (expiresAt > slotStart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expiresAt"],
        message: "expiresAt must be before or equal to slotStart.",
      });
    }
  });

export const createLeadSchema = z
  .object({
    professionalId: z.string().trim().min(1),
    serviceId: z.string().trim().min(1),
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(320),
    answersJson: z.record(z.string().trim().min(1), z.unknown()),
    qualificationResult: leadQualificationResultSchema,
  })
  .strict();

export const confirmBookingSchema = z
  .object({
    professionalId: z.string().trim().min(1),
    serviceId: z.string().trim().min(1),
    leadId: z.string().trim().min(1),
    holdId: z.string().trim().min(1),
    timezone: z.string().trim().min(1).max(100),
    accessCode: z.string().trim().min(1).max(100),
  })
  .strict();

export const createBookingSchema = z
  .object({
    professionalId: z.string().trim().min(1),
    serviceId: z.string().trim().min(1),
    leadId: z.string().trim().min(1),
    holdId: z.string().trim().min(1),
    slotStart: dateInputSchema,
    slotEnd: dateInputSchema,
    timezone: z.string().trim().min(1).max(100),
    status: bookingStatusSchema.optional(),
    codeValidationStatus: codeValidationStatusSchema.optional(),
    calendarStatus: calendarStatusSchema.optional(),
  })
  .strict()
  .refine(
    (value) => new Date(value.slotEnd).getTime() > new Date(value.slotStart).getTime(),
    {
      message: "slotEnd must be after slotStart.",
      path: ["slotEnd"],
    },
  );

export const updateBookingStatusSchema = z
  .object({
    bookingId: z.string().trim().min(1),
    status: bookingStatusSchema.optional(),
    codeValidationStatus: codeValidationStatusSchema.optional(),
    calendarStatus: calendarStatusSchema.optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.status !== undefined ||
      value.codeValidationStatus !== undefined ||
      value.calendarStatus !== undefined,
    {
      message: "At least one booking status field must be provided.",
    },
  );

export const releaseBookingHoldSchema = z
  .object({
    holdId: z.string().trim().min(1),
    status: z.enum(["EXPIRED", "RELEASED"]).optional(),
  })
  .strict();

export const bookingSlotSelectionSchema = z
  .object({
    serviceId: z.string().trim().min(1),
    slotStart: z.string().datetime(),
    slotEnd: z.string().datetime(),
    timezone: z.string().trim().min(1).max(100),
  })
  .strict()
  .refine(
    (value) => new Date(value.slotEnd).getTime() > new Date(value.slotStart).getTime(),
    {
      message: "slotEnd must be after slotStart.",
      path: ["slotEnd"],
    },
  );

export const publicBookingRequestSchema = z
  .object({
    slug: z.string().trim().min(3).max(80),
    serviceId: z.string().trim().min(1),
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(320),
    answersJson: z.record(z.string().trim().min(1), z.unknown()),
    slotStart: z.string().datetime(),
    slotEnd: z.string().datetime(),
    timezone: z.string().trim().min(1).max(100),
    accessCode: z.string().trim().min(1).max(100),
  })
  .strict()
  .refine(
    (value) => new Date(value.slotEnd).getTime() > new Date(value.slotStart).getTime(),
    {
      message: "slotEnd must be after slotStart.",
      path: ["slotEnd"],
    },
  );

export const bookingSuccessLookupSchema = z.object({
  bookingId: z.string().trim().min(1),
});

export const bookingIdParamSchema = z.object({
  id: z.string().trim().min(1),
});

export const holdIdParamSchema = z.object({
  id: z.string().trim().min(1),
});

export type BookingHoldStatusInput = z.infer<typeof bookingHoldStatusSchema>;
export type BookingStatusInput = z.infer<typeof bookingStatusSchema>;
export type CodeValidationStatusInput = z.infer<
  typeof codeValidationStatusSchema
>;
export type CalendarStatusInput = z.infer<typeof calendarStatusSchema>;
export type LeadQualificationResultInput = z.infer<
  typeof leadQualificationResultSchema
>;
export type LeadCorrectionInput = z.infer<typeof leadCorrectionSchema>;
export type CreateBookingHoldInput = z.infer<typeof createBookingHoldSchema>;
export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type ConfirmBookingInput = z.infer<typeof confirmBookingSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingStatusInput = z.infer<
  typeof updateBookingStatusSchema
>;
export type ReleaseBookingHoldInput = z.infer<
  typeof releaseBookingHoldSchema
>;
export type BookingSlotSelectionInput = z.infer<
  typeof bookingSlotSelectionSchema
>;
export type PublicBookingRequestInput = z.infer<
  typeof publicBookingRequestSchema
>;
export type BookingSuccessLookupInput = z.infer<
  typeof bookingSuccessLookupSchema
>;
export type BookingIdParamInput = z.infer<typeof bookingIdParamSchema>;
export type HoldIdParamInput = z.infer<typeof holdIdParamSchema>;