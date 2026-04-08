import { z } from "zod";

const emptyStringToUndefined = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value;
};

const dateInputSchema = z.union([z.date(), z.string().datetime()]);

export const calendarProviderSchema = z.enum(["GOOGLE", "OUTLOOK"]);

export const calendarSyncStatusSchema = z.enum([
  "PENDING",
  "CONNECTED",
  "SYNCING",
  "ERROR",
  "EXPIRED",
  "DISCONNECTED",
]);

export const calendarEventSyncStatusSchema = z.enum([
  "PENDING",
  "CREATED",
  "UPDATED",
  "FAILED",
  "CANCELLED",
]);

export const createCalendarAccountSchema = z
  .object({
    provider: calendarProviderSchema,
    externalAccountId: z.string().trim().min(1).max(255),
    externalCalendarId: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(1).max(255).nullable().optional(),
    ),
    providerEmail: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().email().max(320).nullable().optional(),
    ),
    calendarName: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(1).max(255).nullable().optional(),
    ),
    calendarTimeZone: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(1).max(100).nullable().optional(),
    ),
    accessTokenEncrypted: z.string().trim().min(1),
    refreshTokenEncrypted: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(1).nullable().optional(),
    ),
    syncStatus: calendarSyncStatusSchema.optional(),
    isActive: z.boolean().optional(),
    useForConflictCheck: z.boolean().optional(),
    isDefaultEventCalendar: z.boolean().optional(),
    lastSyncedAt: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.coerce.date().nullable().optional(),
    ),
  })
  .strict();

export const updateCalendarAccountSchema = createCalendarAccountSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one calendar account field must be provided.",
  });

export const googleOAuthUrlParamsSchema = z
  .object({
    accessType: z.enum(["offline", "online"]).optional(),
    prompt: z.enum(["consent", "none", "select_account"]).optional(),
    state: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(1).max(500).optional(),
    ),
  })
  .strict();

export const googleOAuthTokensSchema = z
  .object({
    accessToken: z.string().trim().min(1),
    refreshToken: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(1).nullable().optional(),
    ),
    expiryDate: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.number().int().positive().nullable().optional(),
    ),
    scope: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(1).nullable().optional(),
    ),
    tokenType: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(1).nullable().optional(),
    ),
    idToken: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(1).nullable().optional(),
    ),
  })
  .strict();

export const googleCallbackPayloadSchema = z
  .object({
    code: z.string().trim().min(1),
    state: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(1).optional(),
    ),
  })
  .strict();

export const googleCalendarListItemSchema = z
  .object({
    id: z.string().trim().min(1),
    summary: z.string().trim().min(1),
    description: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(1).nullable().optional(),
    ),
    primary: z.boolean().optional(),
    selected: z.boolean().optional(),
    accessRole: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(1).nullable().optional(),
    ),
    timeZone: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(1).nullable().optional(),
    ),
    backgroundColor: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(1).nullable().optional(),
    ),
    foregroundColor: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(1).nullable().optional(),
    ),
  })
  .strict();

export const calendarEventAttendeeSchema = z
  .object({
    email: z.string().trim().email().max(320),
    displayName: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(1).max(255).optional(),
    ),
    optional: z.boolean().optional(),
  })
  .strict();

export const createCalendarEventSchema = z
  .object({
    calendarAccountId: z.string().trim().min(1),
    title: z.string().trim().min(2).max(255),
    description: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(1).max(5000).nullable().optional(),
    ),
    start: dateInputSchema,
    end: dateInputSchema,
    timeZone: z.string().trim().min(1).max(100),
    attendees: z.array(calendarEventAttendeeSchema).max(50),
    location: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(1).max(500).nullable().optional(),
    ),
    conferenceDataVersion: z.coerce.number().int().min(0).max(10).optional(),
  })
  .strict()
  .refine(
    (value) => new Date(value.end).getTime() > new Date(value.start).getTime(),
    {
      message: "end must be after start.",
      path: ["end"],
    },
  );

export const updateCalendarEventSchema = z
  .object({
    calendarAccountId: z.string().trim().min(1),
    externalEventId: z.string().trim().min(1),
    title: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(2).max(255).optional(),
    ),
    description: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(1).max(5000).nullable().optional(),
    ),
    start: dateInputSchema.optional(),
    end: dateInputSchema.optional(),
    timeZone: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(1).max(100).optional(),
    ),
    attendees: z.array(calendarEventAttendeeSchema).max(50).optional(),
    location: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(1).max(500).nullable().optional(),
    ),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 2, {
    message: "At least one event field must be provided.",
  })
  .superRefine((value, ctx) => {
    if (value.start && value.end) {
      const start = new Date(value.start).getTime();
      const end = new Date(value.end).getTime();

      if (end <= start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["end"],
          message: "end must be after start.",
        });
      }
    }
  });

export const syncCalendarBusyTimesSchema = z
  .object({
    professionalId: z.string().trim().min(1),
    start: dateInputSchema,
    end: dateInputSchema,
    timezone: z.string().trim().min(1).max(100),
  })
  .strict()
  .refine(
    (value) => new Date(value.end).getTime() > new Date(value.start).getTime(),
    {
      message: "end must be after start.",
      path: ["end"],
    },
  );

export const defaultEventCalendarSelectionSchema = z
  .object({
    professionalId: z.string().trim().min(1),
    calendarAccountId: z.string().trim().min(1),
  })
  .strict();

export const toggleCalendarConflictCheckSchema = z
  .object({
    professionalId: z.string().trim().min(1),
    calendarAccountId: z.string().trim().min(1),
    useForConflictCheck: z.boolean(),
  })
  .strict();

export const calendarAccountIdParamSchema = z.object({
  id: z.string().trim().min(1),
});

export type CalendarProviderInput = z.infer<typeof calendarProviderSchema>;
export type CalendarSyncStatusInput = z.infer<typeof calendarSyncStatusSchema>;
export type CalendarEventSyncStatusInput = z.infer<
  typeof calendarEventSyncStatusSchema
>;
export type CreateCalendarAccountInput = z.infer<
  typeof createCalendarAccountSchema
>;
export type UpdateCalendarAccountInput = z.infer<
  typeof updateCalendarAccountSchema
>;
export type GoogleOAuthUrlParamsInput = z.infer<
  typeof googleOAuthUrlParamsSchema
>;
export type GoogleOAuthTokensInput = z.infer<typeof googleOAuthTokensSchema>;
export type GoogleCallbackPayloadInput = z.infer<
  typeof googleCallbackPayloadSchema
>;
export type GoogleCalendarListItemInput = z.infer<
  typeof googleCalendarListItemSchema
>;
export type CalendarEventAttendeeInput = z.infer<
  typeof calendarEventAttendeeSchema
>;
export type CreateCalendarEventInput = z.infer<
  typeof createCalendarEventSchema
>;
export type UpdateCalendarEventInput = z.infer<
  typeof updateCalendarEventSchema
>;
export type SyncCalendarBusyTimesInput = z.infer<
  typeof syncCalendarBusyTimesSchema
>;
export type DefaultEventCalendarSelectionInput = z.infer<
  typeof defaultEventCalendarSelectionSchema
>;
export type ToggleCalendarConflictCheckInput = z.infer<
  typeof toggleCalendarConflictCheckSchema
>;
export type CalendarAccountIdParamInput = z.infer<
  typeof calendarAccountIdParamSchema
>;