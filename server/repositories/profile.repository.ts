import "server-only";

import type { Prisma, Professional, Testimonial } from "@prisma/client";
import { db } from "@/lib/db";

const professionalWithTestimonialsInclude =
  Prisma.validator<Prisma.ProfessionalInclude>()({
    testimonials: {
      orderBy: {
        sortOrder: "asc",
      },
    },
  });

const publicProfessionalInclude =
  Prisma.validator<Prisma.ProfessionalInclude>()({
    testimonials: {
      orderBy: {
        sortOrder: "asc",
      },
    },
    services: {
      where: {
        active: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    },
  });

export type ProfessionalWithTestimonials = Prisma.ProfessionalGetPayload<{
  include: typeof professionalWithTestimonialsInclude;
}>;

export type PublicProfessionalProfile = Prisma.ProfessionalGetPayload<{
  include: typeof publicProfessionalInclude;
}>;

export const profileRepository = {
  async findById(id: string): Promise<Professional | null> {
    return db.professional.findUnique({
      where: { id },
    });
  },

  async findByUserId(userId: string): Promise<Professional | null> {
    return db.professional.findUnique({
      where: { userId },
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
    return db.professional.findUnique({
      where: { slug },
    });
  },

  async findPublicBySlug(slug: string): Promise<PublicProfessionalProfile | null> {
    return db.professional.findUnique({
      where: { slug },
      include: publicProfessionalInclude,
    });
  },

  async create(data: Prisma.ProfessionalCreateInput): Promise<Professional> {
    return db.professional.create({
      data,
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
    return db.professional.update({
      where: { id },
      data,
    });
  },

  async updateByUserId(
    userId: string,
    data: Prisma.ProfessionalUpdateInput,
  ): Promise<Professional> {
    return db.professional.update({
      where: { userId },
      data,
    });
  },

  async updateBrandSettings(
    professionalId: string,
    brandSettings: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput,
  ): Promise<Professional> {
    return db.professional.update({
      where: { id: professionalId },
      data: {
        brandSettings,
      },
    });
  },

  async updateSocialLinks(
    professionalId: string,
    socialLinks: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput,
  ): Promise<Professional> {
    return db.professional.update({
      where: { id: professionalId },
      data: {
        socialLinks,
      },
    });
  },

  async setOnboardingCompleted(
    professionalId: string,
    onboardingCompleted = true,
  ): Promise<Professional> {
    return db.professional.update({
      where: { id: professionalId },
      data: {
        onboardingCompleted,
      },
    });
  },

  async deleteById(id: string): Promise<Professional> {
    return db.professional.delete({
      where: { id },
    });
  },

  async listTestimonials(professionalId: string): Promise<Testimonial[]> {
    return db.testimonial.findMany({
      where: { professionalId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  },

  async findTestimonialById(id: string): Promise<Testimonial | null> {
    return db.testimonial.findUnique({
      where: { id },
    });
  },

  async createTestimonial(
    professionalId: string,
    data: Omit<Prisma.TestimonialUncheckedCreateInput, "professionalId">,
  ): Promise<Testimonial> {
    return db.testimonial.create({
      data: {
        professionalId,
        ...data,
      },
    });
  },

  async updateTestimonialById(
    id: string,
    data: Prisma.TestimonialUpdateInput,
  ): Promise<Testimonial> {
    return db.testimonial.update({
      where: { id },
      data,
    });
  },

  async deleteTestimonialById(id: string): Promise<Testimonial> {
    return db.testimonial.delete({
      where: { id },
    });
  },
};