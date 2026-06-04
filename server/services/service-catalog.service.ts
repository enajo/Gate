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
  mapPublicService as sharedMapPublicService,
  mapService as sharedMapService,
  mapServiceWithMeta as sharedMapServiceWithMeta,
} from "@/server/mappers/service.mapper";
import {
  createServiceSchema,
  updateServiceSchema,
} from "@/server/validators/service.validator";

function mapService(service: Awaited<ReturnType<typeof serviceRepository.findById>>): Service | null {
  if (!service) return null;
  return sharedMapService(service);
}

function mapPublicService(
  service: Awaited<ReturnType<typeof serviceRepository.findById>>,
): PublicService | null {
  if (!service) return null;
  return sharedMapPublicService(service);
}

function mapServiceSummary(service: Service): ServiceSummary {
  return {
    id: service.id,
    title: service.title,
    slug: service.slug,
    headline: service.headline,
    displayPrice: service.displayPrice,
    currency: service.currency,
    durationMinutes: service.durationMinutes,
    meetingFormat: service.meetingFormat,
    paymentRequired: service.paymentRequired,
    qualificationRequired: service.qualificationRequired,
    accessCodeRequired: service.accessCodeRequired,
    manualApprovalRequired: service.manualApprovalRequired,
    availabilityExposure: service.availabilityExposure,
    sortOrder: service.sortOrder,
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
  return sharedMapServiceWithMeta(service);
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
        headline: parsed.headline ?? null,
        description: parsed.description ?? null,
        meetingFormat: parsed.meetingFormat ?? null,
        displayPrice: parsed.displayPrice ?? null,
        currency: parsed.currency ?? null,
        durationMinutes: parsed.durationMinutes,
        preparationInstructions: parsed.preparationInstructions ?? null,
        paymentRequired: parsed.paymentRequired ?? false,
        qualificationRequired: parsed.qualificationRequired ?? false,
        accessCodeRequired: parsed.accessCodeRequired ?? false,
        manualApprovalRequired: parsed.manualApprovalRequired ?? false,
        availabilityExposure: parsed.availabilityExposure ?? "TWO_WEEKS",
        sortOrder: parsed.sortOrder ?? 0,
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
      ...(parsed.headline !== undefined ? { headline: parsed.headline ?? null } : {}),
      ...(parsed.description !== undefined ? { description: parsed.description ?? null } : {}),
      ...(parsed.meetingFormat !== undefined ? { meetingFormat: parsed.meetingFormat ?? null } : {}),
      ...(parsed.displayPrice !== undefined ? { displayPrice: parsed.displayPrice ?? null } : {}),
      ...(parsed.currency !== undefined ? { currency: parsed.currency ?? null } : {}),
      ...(parsed.durationMinutes !== undefined ? { durationMinutes: parsed.durationMinutes } : {}),
      ...(parsed.preparationInstructions !== undefined ? { preparationInstructions: parsed.preparationInstructions ?? null } : {}),
      ...(parsed.paymentRequired !== undefined ? { paymentRequired: parsed.paymentRequired } : {}),
      ...(parsed.qualificationRequired !== undefined ? { qualificationRequired: parsed.qualificationRequired } : {}),
      ...(parsed.accessCodeRequired !== undefined ? { accessCodeRequired: parsed.accessCodeRequired } : {}),
      ...(parsed.manualApprovalRequired !== undefined ? { manualApprovalRequired: parsed.manualApprovalRequired } : {}),
      ...(parsed.availabilityExposure !== undefined ? { availabilityExposure: parsed.availabilityExposure } : {}),
      ...(parsed.sortOrder !== undefined ? { sortOrder: parsed.sortOrder } : {}),
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