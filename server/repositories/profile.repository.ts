import "server-only";

import { Prisma } from "@prisma/client";
import type { Professional, Testimonial } from "@prisma/client";
import { db } from "@/lib/db";

// ── Include shapes ────────────────────────────────────────────────────────────

const professionalWithTestimonialsInclude =
  Prisma.validator<Prisma.ProfessionalInclude>()({
    testimonials: {
      where: { hidden: false },
      orderBy: { sortOrder: "asc" },
    },
  });

// Used by the Control Room GET — loads everything the editor needs.
const controlRoomInclude = Prisma.validator<Prisma.ProfessionalInclude>()({
  services: {
    orderBy: { sortOrder: "asc" },
    include: {
      qualificationQuestions: {
        orderBy: { sortOrder: "asc" },
      },
      accessCodes: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  },
});

// Used by the public page — only published profiles, only active services.
const publicPageInclude = Prisma.validator<Prisma.ProfessionalInclude>()({
  services: {
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    include: {
      qualificationQuestions: {
        orderBy: { sortOrder: "asc" },
      },
      accessCodes: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  },
  testimonials: {
    where: { approved: true, hidden: false },
    orderBy: { sortOrder: "asc" },
  },
});

// ── Exported payload types ────────────────────────────────────────────────────

export type ProfessionalWithTestimonials = Prisma.ProfessionalGetPayload<{
  include: typeof professionalWithTestimonialsInclude;
}>;

export type ProfessionalForControlRoom = Prisma.ProfessionalGetPayload<{
  include: typeof controlRoomInclude;
}>;

export type ProfessionalForPublicPage = Prisma.ProfessionalGetPayload<{
  include: typeof publicPageInclude;
}>;

// ── Repository ────────────────────────────────────────────────────────────────

const professionalWithUserInclude = Prisma.validator<Prisma.ProfessionalInclude>()({
  user: { select: { email: true, name: true } },
});

export type ProfessionalWithUser = Prisma.ProfessionalGetPayload<{
  include: typeof professionalWithUserInclude;
}>;

export const profileRepository = {
  async findById(id: string): Promise<Professional | null> {
    return db.professional.findUnique({ where: { id } });
  },

  /** Returns professional + their login email — used for notification routing. */
  async findByIdWithUser(id: string): Promise<ProfessionalWithUser | null> {
    return db.professional.findUnique({
      where: { id },
      include: professionalWithUserInclude,
    });
  },

  async findByUserId(userId: string): Promise<Professional | null> {
    return db.professional.findUnique({ where: { userId } });
  },

  async findByUserIdForControlRoom(
    userId: string,
  ): Promise<ProfessionalForControlRoom | null> {
    return db.professional.findUnique({
      where: { userId },
      include: controlRoomInclude,
    });
  },

  async findByUserIdWithTestimonials(
    userId: string,
  ): Promise<ProfessionalWithTestimonials | null> {
    return db.professional.findUnique({
      where: { userId },
      include: professionalWithTestimonialsInclude,
    });
  },

  async findBySlug(slug: string): Promise<Professional | null> {
    return db.professional.findUnique({ where: { slug } });
  },

  // Public page: only returns profiles where publishedAt is set.
  async findPublishedBySlug(
    slug: string,
  ): Promise<ProfessionalForPublicPage | null> {
    return db.professional.findFirst({
      where: { slug, publishedAt: { not: null } },
      include: publicPageInclude,
    });
  },

  async upsertByUserId(
    userId: string,
    data: Omit<Prisma.ProfessionalUncheckedCreateInput, "userId"> &
      Prisma.ProfessionalUncheckedUpdateInput,
  ): Promise<Professional> {
    const {
      fullName,
      slug,
      title,
      headline,
      bio,
      avatarUrl,
      brandSettings,
      publicPageSettings,
      draftSettings,
      socialLinks,
      timezone,
      onboardingCompleted,
      bufferBeforeMinutes,
      bufferAfterMinutes,
      minimumNoticeMinutes,
      maxBookingsPerDay,
    } = data;

    return db.professional.upsert({
      where: { userId },
      update: {
        fullName,
        slug,
        title,
        headline,
        bio,
        avatarUrl,
        brandSettings,
        publicPageSettings,
        draftSettings,
        socialLinks,
        timezone,
        onboardingCompleted,
        bufferBeforeMinutes,
        bufferAfterMinutes,
        minimumNoticeMinutes,
        maxBookingsPerDay,
      },
      create: {
        userId,
        fullName,
        slug,
        title,
        headline,
        bio,
        avatarUrl,
        brandSettings,
        publicPageSettings,
        draftSettings,
        socialLinks,
        timezone,
        onboardingCompleted,
        bufferBeforeMinutes,
        bufferAfterMinutes,
        minimumNoticeMinutes,
        maxBookingsPerDay,
      },
    });
  },

  async updateById(
    id: string,
    data: Prisma.ProfessionalUpdateInput,
  ): Promise<Professional> {
    return db.professional.update({ where: { id }, data });
  },

  async updateByUserId(
    userId: string,
    data: Prisma.ProfessionalUpdateInput,
  ): Promise<Professional> {
    return db.professional.update({ where: { userId }, data });
  },

  async setPublishedAt(
    professionalId: string,
    publishedAt: Date | null,
  ): Promise<Professional> {
    return db.professional.update({
      where: { id: professionalId },
      data: { publishedAt },
    });
  },

  async updateBrandSettings(
    professionalId: string,
    brandSettings: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput,
  ): Promise<Professional> {
    return db.professional.update({
      where: { id: professionalId },
      data: { brandSettings },
    });
  },

  async updateSocialLinks(
    professionalId: string,
    socialLinks: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput,
  ): Promise<Professional> {
    return db.professional.update({
      where: { id: professionalId },
      data: { socialLinks },
    });
  },

  async setOnboardingCompleted(
    professionalId: string,
    onboardingCompleted = true,
  ): Promise<Professional> {
    return db.professional.update({
      where: { id: professionalId },
      data: { onboardingCompleted },
    });
  },

  async deleteById(id: string): Promise<Professional> {
    return db.professional.delete({ where: { id } });
  },

  // ── Testimonials ────────────────────────────────────────────────────────────

  async listTestimonials(professionalId: string): Promise<Testimonial[]> {
    return db.testimonial.findMany({
      where: { professionalId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  },

  async findTestimonialById(id: string): Promise<Testimonial | null> {
    return db.testimonial.findUnique({ where: { id } });
  },

  async createTestimonial(
    professionalId: string,
    data: Omit<Prisma.TestimonialUncheckedCreateInput, "professionalId">,
  ): Promise<Testimonial> {
    return db.testimonial.create({ data: { professionalId, ...data } });
  },

  async updateTestimonialById(
    id: string,
    data: Prisma.TestimonialUpdateInput,
  ): Promise<Testimonial> {
    return db.testimonial.update({ where: { id }, data });
  },

  async deleteTestimonialById(id: string): Promise<Testimonial> {
    return db.testimonial.delete({ where: { id } });
  },
};
