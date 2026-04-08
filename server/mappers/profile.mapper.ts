import type { Professional, Testimonial } from "@prisma/client";
import type {
  BrandSettings,
  ProfessionalProfile,
  ProfileCompletionState,
  ProfileWithTestimonials,
  PublicProfessionalProfile,
  SocialLinks,
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
    fullName: professional.fullName,
    slug: professional.slug,
    title: professional.title,
    headline: professional.headline,
    bio: professional.bio,
    avatarUrl: professional.avatarUrl,
    brandSettings: (professional.brandSettings as BrandSettings | null) ?? null,
    socialLinks: (professional.socialLinks as SocialLinks | null) ?? null,
    timezone: professional.timezone,
  };
}

export function mapTestimonial(testimonial: Testimonial) {
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

export function mapTestimonials(testimonials: Testimonial[]) {
  return testimonials.map(mapTestimonial);
}

export function mapProfileWithTestimonials(params: {
  professional: Professional;
  testimonials: Testimonial[];
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