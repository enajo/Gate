import "server-only";

import type { Prisma } from "@prisma/client";
import type {
  BrandSettings,
  CreateTestimonialInput,
  ProfessionalProfile,
  ProfileCompletionState,
  ProfileWithTestimonials,
  PublicProfessionalProfile,
  SocialLinks,
  Testimonial,
  UpdateBrandSettingsInput,
  UpdateSocialLinksInput,
  UpdateTestimonialInput,
  UpsertProfessionalProfileInput,
} from "@/types/profile";
import {
  createTestimonialSchema,
  updateBrandSettingsSchema,
  updateSocialLinksSchema,
  updateTestimonialSchema,
  upsertProfessionalProfileSchema,
} from "@/server/validators/profile.validator";
import { profileRepository } from "@/server/repositories/profile.repository";

function mapProfessional(
  profile: Awaited<ReturnType<typeof profileRepository.findByUserId>>,
): ProfessionalProfile | null {
  if (!profile) {
    return null;
  }

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
    bufferBeforeMinutes: profile.bufferBeforeMinutes,
    bufferAfterMinutes: profile.bufferAfterMinutes,
    minimumNoticeMinutes: profile.minimumNoticeMinutes,
    maxBookingsPerDay: profile.maxBookingsPerDay,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

function mapPublicProfessional(
  profile: Awaited<ReturnType<typeof profileRepository.findPublicBySlug>>,
): PublicProfessionalProfile | null {
  if (!profile) {
    return null;
  }

  return {
    fullName: profile.fullName,
    slug: profile.slug,
    title: profile.title,
    headline: profile.headline,
    bio: profile.bio,
    avatarUrl: profile.avatarUrl,
    brandSettings: (profile.brandSettings as BrandSettings | null) ?? null,
    socialLinks: (profile.socialLinks as SocialLinks | null) ?? null,
    timezone: profile.timezone,
  };
}

function mapTestimonial(
  testimonial: Awaited<ReturnType<typeof profileRepository.findTestimonialById>>,
): Testimonial | null {
  if (!testimonial) {
    return null;
  }

  return {
    id: testimonial.id,
    professionalId: testimonial.professionalId,
    name: testimonial.name,
    role: testimonial.role,
    company: testimonial.company,
    content: testimonial.content,
    avatarUrl: testimonial.avatarUrl,
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
      profile.brandSettings?.theme &&
        profile.brandSettings?.primaryColor &&
        profile.brandSettings?.accentColor &&
        profile.brandSettings?.fontPair,
    ),
    hasSocialLinks: hasAnySocialLink,
  };
}

async function requireProfileByUserId(userId: string) {
  const profile = await profileRepository.findByUserId(userId);

  if (!profile) {
    throw new Error("Professional profile not found.");
  }

  return profile;
}

async function assertSlugAvailable(slug: string, userId: string) {
  const existing = await profileRepository.findBySlug(slug);

  if (existing && existing.userId !== userId) {
    throw new Error("This slug is already in use.");
  }
}

export const profileService = {
  async getProfileByUserId(userId: string): Promise<ProfessionalProfile | null> {
    const profile = await profileRepository.findByUserId(userId);
    return mapProfessional(profile);
  },

  async getProfileWithTestimonials(
    userId: string,
  ): Promise<ProfileWithTestimonials | null> {
    const profile = await profileRepository.findByUserIdWithTestimonials(userId);

    if (!profile) {
      return null;
    }

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
      bufferBeforeMinutes: profile.bufferBeforeMinutes,
      bufferAfterMinutes: profile.bufferAfterMinutes,
      minimumNoticeMinutes: profile.minimumNoticeMinutes,
      maxBookingsPerDay: profile.maxBookingsPerDay,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      testimonials: profile.testimonials.map((testimonial) => ({
        id: testimonial.id,
        professionalId: testimonial.professionalId,
        name: testimonial.name,
        role: testimonial.role,
        company: testimonial.company,
        content: testimonial.content,
        avatarUrl: testimonial.avatarUrl,
        sortOrder: testimonial.sortOrder,
        createdAt: testimonial.createdAt,
        updatedAt: testimonial.updatedAt,
      })),
    };
  },

  async getPublicProfileBySlug(
    slug: string,
  ): Promise<PublicProfessionalProfile | null> {
    const profile = await profileRepository.findPublicBySlug(slug);
    return mapPublicProfessional(profile);
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
      brandSettings: (parsed.brandSettings ?? Prisma.JsonNull) as
        | Prisma.InputJsonValue
        | Prisma.NullableJsonNullValueInput,
      socialLinks: (parsed.socialLinks ?? Prisma.JsonNull) as
        | Prisma.InputJsonValue
        | Prisma.NullableJsonNullValueInput,
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
    const parsed = updateBrandSettingsSchema.parse(input);
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
    const parsed = updateSocialLinksSchema.parse(input);
    const profile = await requireProfileByUserId(userId);

    const updated = await profileRepository.updateSocialLinks(
      profile.id,
      parsed as Prisma.InputJsonValue,
    );

    return mapProfessional(updated)!;
  },

  async markOnboardingCompleted(userId: string): Promise<ProfessionalProfile> {
    const profile = await requireProfileByUserId(userId);
    const updated = await profileRepository.setOnboardingCompleted(
      profile.id,
      true,
    );

    return mapProfessional(updated)!;
  },

  async getProfileCompletionState(
    userId: string,
  ): Promise<ProfileCompletionState> {
    const profile = await this.getProfileByUserId(userId);
    return buildProfileCompletionState(profile);
  },

  async listTestimonials(userId: string): Promise<Testimonial[]> {
    const profile = await requireProfileByUserId(userId);
    const testimonials = await profileRepository.listTestimonials(profile.id);

    return testimonials.map((testimonial) => ({
      id: testimonial.id,
      professionalId: testimonial.professionalId,
      name: testimonial.name,
      role: testimonial.role,
      company: testimonial.company,
      content: testimonial.content,
      avatarUrl: testimonial.avatarUrl,
      sortOrder: testimonial.sortOrder,
      createdAt: testimonial.createdAt,
      updatedAt: testimonial.updatedAt,
    }));
  },

  async createTestimonial(
    userId: string,
    input: CreateTestimonialInput,
  ): Promise<Testimonial> {
    const parsed = createTestimonialSchema.parse(input);
    const profile = await requireProfileByUserId(userId);

    const testimonial = await profileRepository.createTestimonial(profile.id, {
      name: parsed.name,
      role: parsed.role ?? null,
      company: parsed.company ?? null,
      content: parsed.content,
      avatarUrl: parsed.avatarUrl ?? null,
      sortOrder: parsed.sortOrder ?? 0,
    });

    return mapTestimonial(testimonial)!;
  },

  async updateTestimonial(
    userId: string,
    testimonialId: string,
    input: UpdateTestimonialInput,
  ): Promise<Testimonial> {
    const parsed = updateTestimonialSchema.parse(input);
    const profile = await requireProfileByUserId(userId);
    const existing = await profileRepository.findTestimonialById(testimonialId);

    if (!existing || existing.professionalId !== profile.id) {
      throw new Error("Testimonial not found.");
    }

    const updated = await profileRepository.updateTestimonialById(testimonialId, {
      ...(parsed.name !== undefined ? { name: parsed.name } : {}),
      ...(parsed.role !== undefined ? { role: parsed.role ?? null } : {}),
      ...(parsed.company !== undefined
        ? { company: parsed.company ?? null }
        : {}),
      ...(parsed.content !== undefined ? { content: parsed.content } : {}),
      ...(parsed.avatarUrl !== undefined
        ? { avatarUrl: parsed.avatarUrl ?? null }
        : {}),
      ...(parsed.sortOrder !== undefined ? { sortOrder: parsed.sortOrder } : {}),
    });

    return mapTestimonial(updated)!;
  },

  async deleteTestimonial(userId: string, testimonialId: string): Promise<void> {
    const profile = await requireProfileByUserId(userId);
    const existing = await profileRepository.findTestimonialById(testimonialId);

    if (!existing || existing.professionalId !== profile.id) {
      throw new Error("Testimonial not found.");
    }

    await profileRepository.deleteTestimonialById(testimonialId);
  },
};