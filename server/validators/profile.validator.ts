import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const hexColorRegex = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const emptyStringToUndefined = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") return undefined;
  return value;
};

const optionalNullableTrimmedString = (max: number) =>
  z.preprocess(
    emptyStringToUndefined,
    z.string().trim().min(1).max(max).nullable().optional(),
  );

const optionalUrl = z.preprocess(
  emptyStringToUndefined,
  z.string().trim().url().max(2048).nullable().optional(),
);

// ── Brand settings ────────────────────────────────────────────────────────────
// Only accentColor and backgroundColor are required — the Control Room only
// exposes these two pickers. Additional fields (fontPair, theme) can be added
// later without a breaking change.

export const brandSettingsSchema = z.object({
  accentColor: z
    .string()
    .trim()
    .regex(hexColorRegex, "Accent color must be a valid hex color."),
  backgroundColor: z
    .string()
    .trim()
    .regex(hexColorRegex, "Background color must be a valid hex color."),
});

export const socialLinksSchema = z
  .object({
    website: optionalUrl,
    linkedin: optionalUrl,
    x: optionalUrl,
    instagram: optionalUrl,
    youtube: optionalUrl,
    github: optionalUrl,
  })
  .strict();

// ── Public page settings (metrics + featured review) ─────────────────────────

const publicMetricSchema = z.object({
  id: z.string().min(1),
  label: z.string().trim().min(1).max(100),
  value: z.union([z.string(), z.number()]).nullable().optional(),
  sortOrder: z.number().int().optional(),
});

const publicReviewSchema = z.object({
  id: z.string().min(1),
  quote: z.string().trim().min(1).max(500),
  author: z.string().trim().min(1).max(100),
  role: z.string().trim().max(100).nullable().optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
});

export const publicPageSettingsSchema = z.object({
  metrics: z.array(publicMetricSchema).optional(),
  featuredReview: publicReviewSchema.nullable().optional(),
});

// ── Profile upsert ────────────────────────────────────────────────────────────

export const upsertProfessionalProfileSchema = z
  .object({
    fullName: z.string().trim().min(2).max(100),
    slug: z
      .string()
      .trim()
      .min(3)
      .max(50)
      .regex(
        slugRegex,
        "Slug must contain only lowercase letters, numbers, and hyphens.",
      ),
    title: optionalNullableTrimmedString(100),
    headline: optionalNullableTrimmedString(160),
    bio: optionalNullableTrimmedString(2000),
    avatarUrl: optionalUrl,
    brandSettings: brandSettingsSchema.nullable().optional(),
    socialLinks: socialLinksSchema.nullable().optional(),
    timezone: z.string().trim().min(1).max(100),
    bufferBeforeMinutes: z.coerce.number().int().min(0).max(240).optional(),
    bufferAfterMinutes: z.coerce.number().int().min(0).max(240).optional(),
    minimumNoticeMinutes: z.coerce.number().int().min(0).max(10080).optional(),
    maxBookingsPerDay: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.coerce.number().int().min(1).max(100).nullable().optional(),
    ),
    onboardingCompleted: z.boolean().optional(),
  })
  .strict();

// ── Testimonials ──────────────────────────────────────────────────────────────

export const createTestimonialSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    role: optionalNullableTrimmedString(100),
    company: optionalNullableTrimmedString(100),
    content: z.string().trim().min(10).max(2000),
    rating: z.coerce.number().int().min(1).max(5).nullable().optional(),
    avatarUrl: optionalUrl,
    approved: z.boolean().optional(),
    featured: z.boolean().optional(),
    hidden: z.boolean().optional(),
    sortOrder: z.coerce.number().int().min(0).max(999).optional(),
  })
  .strict();

export const updateTestimonialSchema = createTestimonialSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one testimonial field must be provided.",
  });

// ── Params ────────────────────────────────────────────────────────────────────

export const professionalSlugParamSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(3)
    .max(50)
    .regex(
      slugRegex,
      "Slug must contain only lowercase letters, numbers, and hyphens.",
    ),
});

export const testimonialIdParamSchema = z.object({
  id: z.string().trim().min(1),
});

// ── Inferred types ────────────────────────────────────────────────────────────

export type BrandSettingsInput = z.infer<typeof brandSettingsSchema>;
export type SocialLinksInput = z.infer<typeof socialLinksSchema>;
export type PublicPageSettingsInput = z.infer<typeof publicPageSettingsSchema>;
export type UpsertProfessionalProfileInput = z.infer<typeof upsertProfessionalProfileSchema>;
export type UpdateBrandSettingsInput = z.infer<typeof brandSettingsSchema>;
export type UpdateSocialLinksInput = z.infer<typeof socialLinksSchema>;
export type CreateTestimonialInput = z.infer<typeof createTestimonialSchema>;
export type UpdateTestimonialInput = z.infer<typeof updateTestimonialSchema>;
export type ProfessionalSlugParamInput = z.infer<typeof professionalSlugParamSchema>;
export type TestimonialIdParamInput = z.infer<typeof testimonialIdParamSchema>;
