import type { Professional, Testimonial as PrismaTestimonial } from "@prisma/client";
import type {
  BrandSettings,
  ProfessionalProfile,
  ProfileCompletionState,
  ProfileWithTestimonials,
  PublicProfessionalProfile,
  SocialLinks,
  Testimonial,
} from "@/types/profile";

export function mapProfessionalToProfile(
  professional: Professional,
): ProfessionalProfile {
  return {
    id: professional.id,
    userId: professional.userId,
    fullName: professional.fullName,
    slug: professional.slug,
    title: professional.title,
    headline: professional.headline,
    bio: professional.bio,
    avatarUrl: professional.avatarUrl,
    brandSettings: (professional.brandSettings as BrandSettings | null) ?? null,
    socialLinks: (professional.socialLinks as SocialLinks | null) ?? null,
    timezone: professional.timezone,
    onboardingCompleted: professional.onboardingCompleted,
    publishedAt: professional.publishedAt,
    bufferBeforeMinutes: professional.bufferBeforeMinutes,
    bufferAfterMinutes: professional.bufferAfterMinutes,
    minimumNoticeMinutes: professional.minimumNoticeMinutes,
    maxBookingsPerDay: professional.maxBookingsPerDay,
    createdAt: professional.createdAt,
    updatedAt: professional.updatedAt,
  };
}

export function mapProfessionalToPublicProfile(
  professional: Professional,
): PublicProfessionalProfile {
  return {
    id: professional.id,
    fullName: professional.fullName,
    slug: professional.slug,
    title: professional.title,
    headline: professional.headline,
    bio: professional.bio,
    avatarUrl: professional.avatarUrl,
    brandSettings: (professional.brandSettings as BrandSettings | null) ?? null,
    socialLinks: (professional.socialLinks as SocialLinks | null) ?? null,
    timezone: professional.timezone,
    publishedAt: professional.publishedAt,
  };
}

export function mapTestimonial(testimonial: PrismaTestimonial): Testimonial {
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

export function mapTestimonials(testimonials: PrismaTestimonial[]): Testimonial[] {
  return testimonials.map(mapTestimonial);
}

export function mapProfileWithTestimonials(params: {
  professional: Professional;
  testimonials: PrismaTestimonial[];
}): ProfileWithTestimonials {
  return {
    ...mapProfessionalToProfile(params.professional),
    testimonials: mapTestimonials(params.testimonials),
  };
}

export function buildProfileCompletionState(
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
    hasGateSettings: false, // Phase 4: set to true once gate settings are configured
    hasSocialLinks: hasAnySocialLink,
  };
}
