import "server-only";

import type {
  CreateServiceInput,
  PublicService,
  Service,
  ServiceListItem,
  ServiceSummary,
  ServiceWithMeta,
  UpdateServiceInput,
} from "@/types/service";
import { profileRepository } from "@/server/repositories/profile.repository";
import {
  type ServiceWithMeta as RepositoryServiceWithMeta,
  serviceRepository,
} from "@/server/repositories/service.repository";
import {
  createServiceSchema,
  updateServiceSchema,
} from "@/server/validators/service.validator";

function mapService(service: Awaited<ReturnType<typeof serviceRepository.findById>>): Service | null {
  if (!service) {
    return null;
  }

  return {
    id: service.id,
    professionalId: service.professionalId,
    title: service.title,
    slug: service.slug,
    description: service.description,
    displayPrice: service.displayPrice,
    durationMinutes: service.durationMinutes,
    preparationInstructions: service.preparationInstructions,
    active: service.active,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
  };
}

function mapPublicService(
  service: Awaited<ReturnType<typeof serviceRepository.findById>>,
): PublicService | null {
  const mapped = mapService(service);

  if (!mapped) {
    return null;
  }

  return {
    id: mapped.id,
    professionalId: mapped.professionalId,
    title: mapped.title,
    slug: mapped.slug,
    description: mapped.description,
    displayPrice: mapped.displayPrice,
    durationMinutes: mapped.durationMinutes,
    preparationInstructions: mapped.preparationInstructions,
    active: mapped.active,
  };
}

function mapServiceSummary(service: Service): ServiceSummary {
  return {
    id: service.id,
    title: service.title,
    slug: service.slug,
    displayPrice: service.displayPrice,
    durationMinutes: service.durationMinutes,
    active: service.active,
  };
}

function mapServiceListItem(service: Service): ServiceListItem {
  return {
    ...mapServiceSummary(service),
    description: service.description,
  };
}

function mapServiceWithMeta(service: RepositoryServiceWithMeta): ServiceWithMeta {
  return {
    id: service.id,
    professionalId: service.professionalId,
    title: service.title,
    slug: service.slug,
    description: service.description,
    displayPrice: service.displayPrice,
    durationMinutes: service.durationMinutes,
    preparationInstructions: service.preparationInstructions,
    active: service.active,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
    questionCount: service._count.qualificationQuestions,
    ruleCount: service._count.qualificationRules,
  };
}

async function requireProfessional(userId: string) {
  const professional = await profileRepository.findByUserId(userId);

  if (!professional) {
    throw new Error("Professional profile not found.");
  }

  return professional;
}

async function assertSlugAvailable(params: {
  professionalId: string;
  slug?: string | null;
  excludeServiceId?: string;
}) {
  if (!params.slug) {
    return;
  }

  const existing = await serviceRepository.findBySlugForProfessional(
    params.slug,
    params.professionalId,
  );

  if (existing && existing.id !== params.excludeServiceId) {
    throw new Error("This service slug is already in use.");
  }
}

export const serviceCatalogService = {
  async getServiceById(userId: string, serviceId: string): Promise<Service | null> {
    const professional = await requireProfessional(userId);
    const service = await serviceRepository.findByIdForProfessional(
      serviceId,
      professional.id,
    );

    return mapService(service);
  },

  async getPublicServiceBySlug(params: {
    professionalSlug: string;
    serviceSlug: string;
  }): Promise<PublicService | null> {
    const professional = await profileRepository.findBySlug(params.professionalSlug);

    if (!professional) {
      return null;
    }

    const service = await serviceRepository.findBySlugForProfessional(
      params.serviceSlug,
      professional.id,
    );

    if (!service || !service.active) {
      return null;
    }

    return mapPublicService(service);
  },

  async listServices(userId: string): Promise<ServiceListItem[]> {
    const professional = await requireProfessional(userId);
    const services = await serviceRepository.findManyByProfessionalId(
      professional.id,
    );

    return services.map((service) => mapServiceListItem(mapService(service)!));
  },

  async listServiceSummaries(userId: string): Promise<ServiceSummary[]> {
    const professional = await requireProfessional(userId);
    const services = await serviceRepository.findManyByProfessionalId(
      professional.id,
    );

    return services.map((service) => mapServiceSummary(mapService(service)!));
  },

  async listServicesWithMeta(userId: string): Promise<ServiceWithMeta[]> {
    const professional = await requireProfessional(userId);
    const services = await serviceRepository.findManyByProfessionalIdWithMeta(
      professional.id,
    );

    return services.map(mapServiceWithMeta);
  },

  async listActivePublicServices(
    professionalSlug: string,
  ): Promise<PublicService[]> {
    const professional = await profileRepository.findBySlug(professionalSlug);

    if (!professional) {
      return [];
    }

    const services = await serviceRepository.findActiveByProfessionalId(
      professional.id,
    );

    return services.map((service) => mapPublicService(service)!);
  },

  async createService(
    userId: string,
    input: CreateServiceInput,
  ): Promise<Service> {
    const professional = await requireProfessional(userId);
    const parsed = createServiceSchema.parse(input);

    await assertSlugAvailable({
      professionalId: professional.id,
      slug: parsed.slug ?? null,
    });

    const service = await serviceRepository.createForProfessional(
      professional.id,
      {
        title: parsed.title,
        slug: parsed.slug ?? null,
        description: parsed.description ?? null,
        displayPrice: parsed.displayPrice ?? null,
        durationMinutes: parsed.durationMinutes,
        preparationInstructions: parsed.preparationInstructions ?? null,
        active: parsed.active ?? true,
      },
    );

    return mapService(service)!;
  },

  async updateService(
    userId: string,
    serviceId: string,
    input: UpdateServiceInput,
  ): Promise<Service> {
    const professional = await requireProfessional(userId);
    const existing = await serviceRepository.findByIdForProfessional(
      serviceId,
      professional.id,
    );

    if (!existing) {
      throw new Error("Service not found.");
    }

    const parsed = updateServiceSchema.parse(input);

    if (parsed.slug !== undefined) {
      await assertSlugAvailable({
        professionalId: professional.id,
        slug: parsed.slug ?? null,
        excludeServiceId: existing.id,
      });
    }

    const updated = await serviceRepository.updateById(existing.id, {
      ...(parsed.title !== undefined ? { title: parsed.title } : {}),
      ...(parsed.slug !== undefined ? { slug: parsed.slug ?? null } : {}),
      ...(parsed.description !== undefined
        ? { description: parsed.description ?? null }
        : {}),
      ...(parsed.displayPrice !== undefined
        ? { displayPrice: parsed.displayPrice ?? null }
        : {}),
      ...(parsed.durationMinutes !== undefined
        ? { durationMinutes: parsed.durationMinutes }
        : {}),
      ...(parsed.preparationInstructions !== undefined
        ? {
            preparationInstructions:
              parsed.preparationInstructions ?? null,
          }
        : {}),
      ...(parsed.active !== undefined ? { active: parsed.active } : {}),
    });

    return mapService(updated)!;
  },

  async toggleServiceActive(
    userId: string,
    serviceId: string,
    active: boolean,
  ): Promise<Service> {
    const professional = await requireProfessional(userId);
    const existing = await serviceRepository.findByIdForProfessional(
      serviceId,
      professional.id,
    );

    if (!existing) {
      throw new Error("Service not found.");
    }

    const updated = await serviceRepository.setActiveState(
      existing.id,
      professional.id,
      active,
    );

    return mapService(updated)!;
  },

  async deleteService(userId: string, serviceId: string): Promise<void> {
    const professional = await requireProfessional(userId);
    const existing = await serviceRepository.findByIdForProfessional(
      serviceId,
      professional.id,
    );

    if (!existing) {
      throw new Error("Service not found.");
    }

    await serviceRepository.deleteById(existing.id);
  },

  async countServices(userId: string): Promise<number> {
    const professional = await requireProfessional(userId);
    return serviceRepository.countByProfessionalId(professional.id);
  },
};