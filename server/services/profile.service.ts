import "server-only";

import { Prisma } from "@prisma/client";
import type {
  BrandSettings,
  CreateTestimonialInput,
  ProfessionalProfile,
  ProfileCompletionState,
  ProfileWithTestimonials,
  PublicPageSettings,
  PublicProfessionalProfile,
  SocialLinks,
  Testimonial,
  UpdateBrandSettingsInput,
  UpdateSocialLinksInput,
  UpsertProfessionalProfileInput,
} from "@/types/profile";
import type { PublicSalesPageTemplateData } from "@/components/public-page/public-sales-page-template";
import {
  brandSettingsSchema,
  publicPageSettingsSchema,
  socialLinksSchema,
  upsertProfessionalProfileSchema,
} from "@/server/validators/profile.validator";
import { db } from "@/lib/db";
import { profileRepository } from "@/server/repositories/profile.repository";
import { serviceRepository } from "@/server/repositories/service.repository";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (!remaining) return `${hours} hr`;
  return `${hours} hr ${remaining} min`;
}

function parseDurationMinutes(duration: string): number {
  const hrMatch = duration.match(/(\d+)\s*hr/);
  const minMatch = duration.match(/(\d+)\s*min/);
  const hours = hrMatch ? parseInt(hrMatch[1], 10) : 0;
  const minutes = minMatch ? parseInt(minMatch[1], 10) : 0;
  const total = hours * 60 + minutes;
  return total > 0 ? total : 30;
}

function mapQuestionTypeToDb(
  uiType: "textarea" | "select" | "text",
): "SHORT_TEXT" | "LONG_TEXT" | "MULTIPLE_CHOICE" {
  if (uiType === "textarea") return "LONG_TEXT";
  if (uiType === "select") return "MULTIPLE_CHOICE";
  return "SHORT_TEXT";
}

function mapQuestionTypeFromDb(
  dbType: string,
): "textarea" | "select" | "text" {
  if (dbType === "LONG_TEXT") return "textarea";
  if (dbType === "MULTIPLE_CHOICE" || dbType === "YES_NO") return "select";
  return "text";
}

function mapProfessional(
  profile: Awaited<ReturnType<typeof profileRepository.findByUserId>>,
): ProfessionalProfile | null {
  if (!profile) return null;

  return {
    id: profile.id,
    userId: profile.userId,
    fullName: profile.fullName,
    slug: profile.slug,
    title: profile.title,
    headline: profile.headline,
    bio: profile.bio,
    avatarUrl: profile.avatarUrl,
    brandSettings: (profile.brandSettings as BrandSettings | null) ?? null,
    socialLinks: (profile.socialLinks as SocialLinks | null) ?? null,
    timezone: profile.timezone,
    onboardingCompleted: profile.onboardingCompleted,
    publishedAt: profile.publishedAt,
    bufferBeforeMinutes: profile.bufferBeforeMinutes,
    bufferAfterMinutes: profile.bufferAfterMinutes,
    minimumNoticeMinutes: profile.minimumNoticeMinutes,
    maxBookingsPerDay: profile.maxBookingsPerDay,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

function mapTestimonial(
  testimonial: Awaited<
    ReturnType<typeof profileRepository.findTestimonialById>
  >,
): Testimonial | null {
  if (!testimonial) return null;

  return {
    id: testimonial.id,
    professionalId: testimonial.professionalId,
    name: testimonial.name,
    role: testimonial.role,
    company: testimonial.company,
    content: testimonial.content,
    rating: testimonial.rating,
    avatarUrl: testimonial.avatarUrl,
    approved: testimonial.approved,
    featured: testimonial.featured,
    hidden: testimonial.hidden,
    sortOrder: testimonial.sortOrder,
    createdAt: testimonial.createdAt,
    updatedAt: testimonial.updatedAt,
  };
}

function buildProfileCompletionState(
  profile: ProfessionalProfile | null,
): ProfileCompletionState {
  if (!profile) {
    return {
      hasIdentity: false,
      hasHeadline: false,
      hasBio: false,
      hasAvatar: false,
      hasBranding: false,
      hasGateSettings: false,
      hasSocialLinks: false,
    };
  }

  const socialLinks = profile.socialLinks ?? {};
  const hasAnySocialLink = Object.values(socialLinks).some(Boolean);

  return {
    hasIdentity: Boolean(profile.fullName && profile.slug && profile.title),
    hasHeadline: Boolean(profile.headline),
    hasBio: Boolean(profile.bio),
    hasAvatar: Boolean(profile.avatarUrl),
    hasBranding: Boolean(
      profile.brandSettings?.accentColor &&
        profile.brandSettings?.backgroundColor,
    ),
    hasGateSettings: false, // set to true once first service with gate config saved
    hasSocialLinks: hasAnySocialLink,
  };
}

async function requireProfileByUserId(userId: string) {
  const profile = await profileRepository.findByUserId(userId);
  if (!profile) throw new Error("Professional profile not found.");
  return profile;
}

async function assertSlugAvailable(slug: string, userId: string) {
  const existing = await profileRepository.findBySlug(slug);
  if (existing && existing.userId !== userId) {
    throw new Error("This slug is already in use.");
  }
}

// ── Service ───────────────────────────────────────────────────────────────────

export const profileService = {
  // ── Basic profile ────────────────────────────────────────────────────────────

  async getProfileByUserId(userId: string): Promise<ProfessionalProfile | null> {
    const profile = await profileRepository.findByUserId(userId);
    return mapProfessional(profile);
  },

  async getProfileWithTestimonials(
    userId: string,
  ): Promise<ProfileWithTestimonials | null> {
    const profile =
      await profileRepository.findByUserIdWithTestimonials(userId);
    if (!profile) return null;

    return {
      ...mapProfessional(profile)!,
      testimonials: profile.testimonials.map((t) => mapTestimonial(t)!),
    };
  },

  async upsertProfile(
    userId: string,
    input: UpsertProfessionalProfileInput,
  ): Promise<ProfessionalProfile> {
    const parsed = upsertProfessionalProfileSchema.parse(input);
    await assertSlugAvailable(parsed.slug, userId);

    const profile = await profileRepository.upsertByUserId(userId, {
      fullName: parsed.fullName,
      slug: parsed.slug,
      title: parsed.title ?? null,
      headline: parsed.headline ?? null,
      bio: parsed.bio ?? null,
      avatarUrl: parsed.avatarUrl ?? null,
      brandSettings: (parsed.brandSettings ??
        Prisma.JsonNull) as Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput,
      socialLinks: (parsed.socialLinks ??
        Prisma.JsonNull) as Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput,
      timezone: parsed.timezone,
      onboardingCompleted: parsed.onboardingCompleted ?? false,
      bufferBeforeMinutes: parsed.bufferBeforeMinutes ?? 0,
      bufferAfterMinutes: parsed.bufferAfterMinutes ?? 0,
      minimumNoticeMinutes: parsed.minimumNoticeMinutes ?? 0,
      maxBookingsPerDay: parsed.maxBookingsPerDay ?? null,
    });

    return mapProfessional(profile)!;
  },

  async updateBrandSettings(
    userId: string,
    input: UpdateBrandSettingsInput,
  ): Promise<ProfessionalProfile> {
    const parsed = brandSettingsSchema.parse(input);
    const profile = await requireProfileByUserId(userId);
    const updated = await profileRepository.updateBrandSettings(
      profile.id,
      parsed as Prisma.InputJsonValue,
    );
    return mapProfessional(updated)!;
  },

  async updateSocialLinks(
    userId: string,
    input: UpdateSocialLinksInput,
  ): Promise<ProfessionalProfile> {
    const parsed = socialLinksSchema.parse(input);
    const profile = await requireProfileByUserId(userId);
    const updated = await profileRepository.updateSocialLinks(
      profile.id,
      parsed as Prisma.InputJsonValue,
    );
    return mapProfessional(updated)!;
  },

  async markOnboardingCompleted(userId: string): Promise<ProfessionalProfile> {
    const profile = await requireProfileByUserId(userId);
    const updated = await profileRepository.setOnboardingCompleted(profile.id, true);
    return mapProfessional(updated)!;
  },

  async getProfileCompletionState(
    userId: string,
  ): Promise<ProfileCompletionState> {
    const profile = await this.getProfileByUserId(userId);
    return buildProfileCompletionState(profile);
  },

  // ── Control Room ─────────────────────────────────────────────────────────────

  /**
   * Returns everything the Control Room editor needs, shaped as
   * PublicSalesPageTemplateData so it can be dropped straight into state.
   */
  async getControlRoomState(
    userId: string,
  ): Promise<{ profile: PublicSalesPageTemplateData; publishedAt: string | null }> {
    const professional =
      await profileRepository.findByUserIdForControlRoom(userId);

    if (!professional) {
      throw new Error("Professional profile not found.");
    }

    // If a draft blob exists, return it directly — it's the source of truth
    // for the Control Room editor. The live columns only matter to the public page.
    if (professional.draftSettings) {
      const draft = professional.draftSettings as PublicSalesPageTemplateData;
      return {
        profile: {
          ...draft,
          availableDates: [], // Phase 2
          availableTimes: [], // Phase 2
        },
        publishedAt: professional.publishedAt?.toISOString() ?? null,
      };
    }

    // No draft yet — reconstruct from live columns (first-load for existing profiles).
    const brandSettings = professional.brandSettings as BrandSettings | null;
    const publicPageSettings =
      professional.publicPageSettings as PublicPageSettings | null;

    const services: PublicSalesPageTemplateData["services"] =
      professional.services.map((svc) => {
        const activeCode = svc.accessCodes[0] ?? null;

        return {
          id: svc.id,
          title: svc.title,
          headline: svc.headline ?? "",
          duration: formatDuration(svc.durationMinutes),
          format: svc.meetingFormat ?? "Video call",
          price: svc.displayPrice ?? "",
          currency: svc.currency ?? "$",
          qualificationRequired: svc.qualificationRequired,
          paymentRequired: svc.paymentRequired,
          accessCodeRequired: svc.accessCodeRequired,
          manualApprovalRequired: svc.manualApprovalRequired,
          availabilityExposure:
            svc.availabilityExposure as PublicSalesPageTemplateData["services"][number]["availabilityExposure"],
          currentAccessCode: activeCode?.codeLabel ?? undefined,
          questions: svc.qualificationQuestions.map((q) => ({
            id: q.id,
            label: q.questionText,
            type: mapQuestionTypeFromDb(q.questionType),
            required: q.isRequired,
            options: (q.optionsJson as string[] | null) ?? [],
          })),
        };
      });

    const profileData: PublicSalesPageTemplateData = {
      name: professional.fullName,
      role: professional.title ?? "",
      bio: professional.bio ?? undefined,
      avatarUrl: professional.avatarUrl ?? null,
      theme: {
        accentColor: brandSettings?.accentColor ?? "#DFA767",
        backgroundColor: brandSettings?.backgroundColor ?? "#F6F2EA",
      },
      services,
      activeServiceId: services[0]?.id ?? "",
      timezone: professional.timezone,
      availableDates: [], // Phase 2
      availableTimes: [], // Phase 2
      metrics: publicPageSettings?.metrics ?? [],
      featuredReview: publicPageSettings?.featuredReview ?? null,
    };

    return {
      profile: profileData,
      publishedAt: professional.publishedAt?.toISOString() ?? null,
    };
  },

  /**
   * Saves the Control Room draft WITHOUT affecting the live public page.
   *
   * The full PublicSalesPageTemplateData blob is stored in `draftSettings`.
   * The individual live columns (fullName, bio, brandSettings, services, etc.)
   * are only updated when the user explicitly clicks Publish.
   *
   * A minimal upsert still writes fullName / slug / timezone because those
   * are required NOT NULL columns — but visitors only see the page once
   * publishedAt is set (via publishControlRoom).
   */
  async saveControlRoomDraft(
    userId: string,
    input: PublicSalesPageTemplateData,
  ): Promise<{ profile: PublicSalesPageTemplateData; publishedAt: string | null }> {
    const slug = input.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "untitled";

    await assertSlugAvailable(slug, userId);

    // Write the draft blob + the minimum required columns.
    // Everything else (bio, brandSettings, services …) is NOT touched —
    // public visitors keep seeing the last-published snapshot.
    await profileRepository.upsertByUserId(userId, {
      fullName: input.name || "Untitled",
      slug,
      timezone: input.timezone,
      onboardingCompleted: true,
      draftSettings: input as unknown as Prisma.InputJsonValue,
    });

    const professional = await profileRepository.findByUserId(userId);
    return {
      profile: input,
      publishedAt: professional?.publishedAt?.toISOString() ?? null,
    };
  },

  /**
   * Publishes the current draft.
   *
   * Reads draftSettings and writes all fields to the live columns so the
   * public page reflects the latest draft. Sets publishedAt to now.
   */
  async publishControlRoom(userId: string): Promise<void> {
    const professional = await requireProfileByUserId(userId);

    const draft = professional.draftSettings as PublicSalesPageTemplateData | null;

    if (!draft) {
      throw new Error("No draft to publish. Save your changes first.");
    }

    const slug = draft.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "untitled";

    const brandSettings = brandSettingsSchema.parse(draft.theme);
    const publicPageSettings = publicPageSettingsSchema.parse({
      metrics: draft.metrics ?? [],
      featuredReview: draft.featuredReview ?? null,
    });

    // Write ALL draft fields to live columns in one transaction.
    await db.$transaction(async (tx) => {
      await tx.professional.update({
        where: { id: professional.id },
        data: {
          fullName: draft.name,
          slug,
          title: draft.role || null,
          bio: draft.bio ?? null,
          avatarUrl: draft.avatarUrl ?? null,
          brandSettings: brandSettings as Prisma.InputJsonValue,
          publicPageSettings: publicPageSettings as Prisma.InputJsonValue,
          timezone: draft.timezone,
          publishedAt: new Date(),
        },
      });

      // Sync services from the draft.
      const incomingServices = draft.services.map((svc, index) => ({
        id: svc.id,
        title: svc.title,
        headline: svc.headline || null,
        meetingFormat: svc.format || "Video call",
        displayPrice: svc.price || null,
        currency: svc.currency || "$",
        durationMinutes: parseDurationMinutes(svc.duration),
        paymentRequired: svc.paymentRequired,
        qualificationRequired: svc.qualificationRequired,
        accessCodeRequired: svc.accessCodeRequired,
        manualApprovalRequired: svc.manualApprovalRequired,
        availabilityExposure: svc.availabilityExposure,
        sortOrder: index,
        active: true,
        questions: svc.questions.map((q, qIndex) => ({
          id: q.id,
          questionText: q.label,
          questionType: mapQuestionTypeToDb(q.type),
          isRequired: q.required ?? true,
          sortOrder: qIndex,
          optionsJson: q.options && q.options.length > 0 ? q.options : null,
        })),
      }));

      await serviceRepository.upsertManyForProfessional(
        professional.id,
        incomingServices,
      );

      // Access codes are now managed entirely through the dashboard bulk-generator.
      // We no longer auto-create codes on publish — professionals generate
      // codes explicitly before sharing them with clients.
    });
  },

  async unpublishControlRoom(userId: string): Promise<void> {
    const profile = await requireProfileByUserId(userId);
    await profileRepository.setPublishedAt(profile.id, null);
  },

  // ── Public page ───────────────────────────────────────────────────────────────

  /**
   * Returns data for the public page. Only published profiles are returned.
   * Returns null if the profile doesn't exist or isn't published.
   */
  async getPublicPageData(
    slug: string,
  ): Promise<PublicSalesPageTemplateData | null> {
    const professional = await profileRepository.findPublishedBySlug(slug);
    if (!professional) return null;

    const brandSettings = professional.brandSettings as BrandSettings | null;
    const publicPageSettings =
      professional.publicPageSettings as PublicPageSettings | null;

    const services: PublicSalesPageTemplateData["services"] =
      professional.services.map((svc) => {
        const activeCode = svc.accessCodes[0] ?? null;

        return {
          id: svc.id,
          title: svc.title,
          headline: svc.headline ?? "",
          duration: formatDuration(svc.durationMinutes),
          format: svc.meetingFormat ?? "Video call",
          price: svc.displayPrice ?? undefined,
          currency: svc.currency ?? "$",
          qualificationRequired: svc.qualificationRequired,
          paymentRequired: svc.paymentRequired,
          accessCodeRequired: svc.accessCodeRequired,
          manualApprovalRequired: svc.manualApprovalRequired,
          availabilityExposure:
            svc.availabilityExposure as PublicSalesPageTemplateData["services"][number]["availabilityExposure"],
          // Never expose the code on the public page — it's for display in the
          // Control Room only. Access code validation happens server-side.
          currentAccessCode: undefined,
          questions: svc.qualificationQuestions.map((q) => ({
            id: q.id,
            label: q.questionText,
            type: mapQuestionTypeFromDb(q.questionType),
            required: q.isRequired,
            options: (q.optionsJson as string[] | null) ?? [],
          })),
        };
      });

    return {
      name: professional.fullName,
      role: professional.title ?? "",
      bio: professional.bio ?? undefined,
      avatarUrl: professional.avatarUrl ?? null,
      theme: {
        accentColor: brandSettings?.accentColor ?? "#DFA767",
        backgroundColor: brandSettings?.backgroundColor ?? "#F6F2EA",
      },
      services,
      activeServiceId: services[0]?.id ?? "",
      timezone: professional.timezone,
      availableDates: [], // Phase 2: real slots injected here
      availableTimes: [], // Phase 2: real slots injected here
      metrics: publicPageSettings?.metrics ?? [],
      featuredReview: publicPageSettings?.featuredReview ?? null,
    };
  },

  async getPublicProfileBySlug(
    slug: string,
  ): Promise<PublicProfessionalProfile | null> {
    const professional = await profileRepository.findPublishedBySlug(slug);
    if (!professional) return null;

    const brandSettings = professional.brandSettings as BrandSettings | null;
    const publicPageSettings =
      professional.publicPageSettings as PublicPageSettings | null;

    return {
      id: professional.id,
      fullName: professional.fullName,
      slug: professional.slug,
      title: professional.title,
      headline: professional.headline,
      bio: professional.bio,
      avatarUrl: professional.avatarUrl,
      brandSettings,
      socialLinks: (professional.socialLinks as SocialLinks | null) ?? null,
      timezone: professional.timezone,
      publishedAt: professional.publishedAt,
      testimonials: professional.testimonials.map((t) => ({
        id: t.id,
        name: t.name,
        role: t.role,
        company: t.company,
        content: t.content,
        rating: t.rating,
        avatarUrl: t.avatarUrl,
        featured: t.featured,
      })),
      metrics: publicPageSettings?.metrics ?? [],
      featuredReview: publicPageSettings?.featuredReview ?? null,
    };
  },

  // ── Testimonials ──────────────────────────────────────────────────────────────

  async listTestimonials(userId: string): Promise<Testimonial[]> {
    const profile = await requireProfileByUserId(userId);
    const testimonials = await profileRepository.listTestimonials(profile.id);
    return testimonials.map((t) => mapTestimonial(t)!);
  },

  async createTestimonial(
    userId: string,
    input: CreateTestimonialInput,
  ): Promise<Testimonial> {
    const profile = await requireProfileByUserId(userId);
    const testimonial = await profileRepository.createTestimonial(profile.id, {
      name: input.name,
      role: input.role ?? null,
      company: input.company ?? null,
      content: input.content,
      rating: input.rating ?? null,
      avatarUrl: input.avatarUrl ?? null,
      approved: input.approved ?? true,
      featured: input.featured ?? false,
      hidden: input.hidden ?? false,
      sortOrder: input.sortOrder ?? 0,
    });
    return mapTestimonial(testimonial)!;
  },

  async updateTestimonial(
    userId: string,
    testimonialId: string,
    input: Partial<CreateTestimonialInput>,
  ): Promise<Testimonial> {
    const profile = await requireProfileByUserId(userId);
    const existing =
      await profileRepository.findTestimonialById(testimonialId);

    if (!existing || existing.professionalId !== profile.id) {
      throw new Error("Testimonial not found.");
    }

    const updated = await profileRepository.updateTestimonialById(
      testimonialId,
      {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.role !== undefined && { role: input.role ?? null }),
        ...(input.company !== undefined && { company: input.company ?? null }),
        ...(input.content !== undefined && { content: input.content }),
        ...(input.rating !== undefined && { rating: input.rating ?? null }),
        ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl ?? null }),
        ...(input.approved !== undefined && { approved: input.approved }),
        ...(input.featured !== undefined && { featured: input.featured }),
        ...(input.hidden !== undefined && { hidden: input.hidden }),
        ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
      },
    );

    return mapTestimonial(updated)!;
  },

  async deleteTestimonial(
    userId: string,
    testimonialId: string,
  ): Promise<void> {
    const profile = await requireProfileByUserId(userId);
    const existing =
      await profileRepository.findTestimonialById(testimonialId);

    if (!existing || existing.professionalId !== profile.id) {
      throw new Error("Testimonial not found.");
    }

    await profileRepository.deleteTestimonialById(testimonialId);
  },
};
