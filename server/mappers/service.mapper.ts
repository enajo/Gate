import type { Service as PrismaService } from "@prisma/client";
import type {
  PublicService,
  Service,
  ServiceListItem,
  ServiceSummary,
  ServiceWithMeta,
} from "@/types/service";

type ServiceWithCountMeta = PrismaService & {
  _count?: {
    qualificationQuestions?: number;
    qualificationRules?: number;
    bookings?: number;
  };
};

export function mapService(service: PrismaService): Service {
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

export function mapServices(services: PrismaService[]): Service[] {
  return services.map(mapService);
}

export function mapPublicService(service: PrismaService): PublicService {
  const mapped = mapService(service);

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

export function mapPublicServices(services: PrismaService[]): PublicService[] {
  return services.map(mapPublicService);
}

export function mapServiceSummary(service: PrismaService): ServiceSummary {
  return {
    id: service.id,
    title: service.title,
    slug: service.slug,
    displayPrice: service.displayPrice,
    durationMinutes: service.durationMinutes,
    active: service.active,
  };
}

export function mapServiceSummaries(
  services: PrismaService[],
): ServiceSummary[] {
  return services.map(mapServiceSummary);
}

export function mapServiceListItem(service: PrismaService): ServiceListItem {
  return {
    ...mapServiceSummary(service),
    description: service.description,
  };
}

export function mapServiceListItems(
  services: PrismaService[],
): ServiceListItem[] {
  return services.map(mapServiceListItem);
}

export function mapServiceWithMeta(service: ServiceWithCountMeta): ServiceWithMeta {
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
    questionCount: service._count?.qualificationQuestions ?? 0,
    ruleCount: service._count?.qualificationRules ?? 0,
  };
}

export function mapServicesWithMeta(
  services: ServiceWithCountMeta[],
): ServiceWithMeta[] {
  return services.map(mapServiceWithMeta);
}