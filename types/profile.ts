export type BrandTheme = "light" | "dark" | "minimal";

export type FontPair =
  | "inter-manrope"
  | "inter-space-grotesk"
  | "inter-plus-jakarta"
  | "system";

export type BrandSettings = {
  theme: BrandTheme;
  primaryColor: string;
  accentColor: string;
  fontPair: FontPair;
};

export type SocialLinks = {
  website?: string | null;
  linkedin?: string | null;
  x?: string | null;
  instagram?: string | null;
  youtube?: string | null;
  github?: string | null;
};

export type ProfessionalProfile = {
  id: string;
  userId: string;
  fullName: string;
  slug: string;
  title?: string | null;
  headline?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  brandSettings?: BrandSettings | null;
  socialLinks?: SocialLinks | null;
  timezone: string;
  onboardingCompleted: boolean;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  minimumNoticeMinutes: number;
  maxBookingsPerDay?: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PublicProfessionalProfile = {
  fullName: string;
  slug: string;
  title?: string | null;
  headline?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  brandSettings?: BrandSettings | null;
  socialLinks?: SocialLinks | null;
  timezone: string;
};

export type Testimonial = {
  id: string;
  professionalId: string;
  name: string;
  role?: string | null;
  company?: string | null;
  content: string;
  avatarUrl?: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type UpsertProfessionalProfileInput = {
  fullName: string;
  slug: string;
  title?: string | null;
  headline?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  brandSettings?: BrandSettings | null;
  socialLinks?: SocialLinks | null;
  timezone: string;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  minimumNoticeMinutes?: number;
  maxBookingsPerDay?: number | null;
  onboardingCompleted?: boolean;
};

export type UpdateBrandSettingsInput = BrandSettings;

export type UpdateSocialLinksInput = SocialLinks;

export type CreateTestimonialInput = {
  name: string;
  role?: string | null;
  company?: string | null;
  content: string;
  avatarUrl?: string | null;
  sortOrder?: number;
};

export type UpdateTestimonialInput = Partial<CreateTestimonialInput>;

export type ProfileCompletionState = {
  hasIdentity: boolean;
  hasHeadline: boolean;
  hasBio: boolean;
  hasAvatar: boolean;
  hasBranding: boolean;
  hasSocialLinks: boolean;
};

export type ProfileWithTestimonials = ProfessionalProfile & {
  testimonials: Testimonial[];
};