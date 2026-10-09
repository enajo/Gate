import { z } from "zod";

// Provider-neutral schemas (calendarProviderSchema, createCalendarEventSchema,
// syncCalendarBusyTimesSchema, etc.) already live in google.validator.ts
// despite the filename — import those instead of redeclaring them here.

const emptyStringToUndefined = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value;
};

export const outlookOAuthTokensSchema = z
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
  })
  .strict();

export const outlookCallbackPayloadSchema = z
  .object({
    code: z.string().trim().min(1),
    state: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(1).optional(),
    ),
  })
  .strict();

export const outlookCalendarListItemSchema = z
  .object({
    id: z.string().trim().min(1),
    name: z.string().trim().min(1),
    isDefaultCalendar: z.boolean().optional(),
    canEdit: z.boolean().optional(),
    owner: z
      .object({
        name: z.preprocess(
          emptyStringToUndefined,
          z.string().trim().min(1).nullable().optional(),
        ),
        address: z.preprocess(
          emptyStringToUndefined,
          z.string().trim().email().nullable().optional(),
        ),
      })
      .nullable()
      .optional(),
  })
  .strict();

export type OutlookOAuthTokensInput = z.infer<typeof outlookOAuthTokensSchema>;
export type OutlookCallbackPayloadInput = z.infer<
  typeof outlookCallbackPayloadSchema
>;
export type OutlookCalendarListItemInput = z.infer<
  typeof outlookCalendarListItemSchema
>;
