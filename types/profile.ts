// ── Brand / Appearance ────────────────────────────────────────────────────────

export type BrandSettings = {
  accentColor: string;
  backgroundColor: string;
};

export type SocialLinks = {
  website?: string | null;
  linkedin?: string | null;
  x?: string | null;
  instagram?: string | null;
  youtube?: string | null;
  github?: string | null;
};

// ── Public page display settings (metrics, featured review) ──────────────────

export type PublicMetric = {
  id: string;
  label: string;
  value?: string | number | null;
  sortOrder?: number;
};

export type PublicReview = {
  id: string;
  quote: string;
  author: string;
  role?: string;
  rating?: number;
};

export type PublicPageSettings = {
  metrics?: PublicMetric[];
  featuredReview?: PublicReview | null;
};

// ── Core professional profile ─────────────────────────────────────────────────

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
  publishedAt?: Date | null;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  minimumNoticeMinutes: number;
  maxBookingsPerDay?: number | null;
  createdAt: Date;
  updatedAt: Date;
};

// ── Public-facing profile (returned to public page) ───────────────────────────

export type PublicProfessionalProfile = {
  id: string;
  fullName: string;
  slug: string;
  title?: string | null;
  headline?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  brandSettings?: BrandSettings | null;
  socialLinks?: SocialLinks | null;
  timezone: string;
  publishedAt: Date | null;
  testimonials?: PublicTestimonial[];
  metrics?: PublicMetric[];
  featuredReview?: PublicReview | null;
};

// ── Testimonials ──────────────────────────────────────────────────────────────

export type Testimonial = {
  id: string;
  professionalId: string;
  name: string;
  role?: string | null;
  company?: string | null;
  content: string;
  rating?: number | null;
  avatarUrl?: string | null;
  approved: boolean;
  featured: boolean;
  hidden: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type PublicTestimonial = Pick<
  Testimonial,
  "id" | "name" | "role" | "company" | "content" | "rating" | "avatarUrl" | "featured"
>;

// ── Composed types ────────────────────────────────────────────────────────────

export type ProfileWithTestimonials = ProfessionalProfile & {
  testimonials: Testimonial[];
};

// ── Input types ───────────────────────────────────────────────────────────────

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
  industry?: string | null;
  onboardingSurvey?: { usageMode: "SOLO" | "TEAM"; goals: string[] } | null;
};

export type UpdateBrandSettingsInput = BrandSettings;
export type UpdateSocialLinksInput = SocialLinks;

export type CreateTestimonialInput = {
  name: string;
  role?: string | null;
  company?: string | null;
  content: string;
  rating?: number | null;
  avatarUrl?: string | null;
  approved?: boolean;
  featured?: boolean;
  hidden?: boolean;
  sortOrder?: number;
};

export type UpdateTestimonialInput = Partial<CreateTestimonialInput>;

export type ProfileCompletionState = {
  hasIdentity: boolean;
  hasHeadline: boolean;
  hasBio: boolean;
  hasAvatar: boolean;
  hasBranding: boolean;
  hasGateSettings: boolean;
  hasSocialLinks: boolean;
};
