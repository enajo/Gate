import type { Service as PrismaService } from "@prisma/client";
import type { AvailabilityExposure } from "@/types/service";
import type {
  PublicService,
  Service,
  ServiceListItem,
  ServiceSummary,
  ServiceWithMeta,
} from "@/types/service";

type ServiceWithCountMeta = PrismaService & {
  _count?: {
    bookings?: number;
  };
};

export function mapService(service: PrismaService): Service {
  return {
    id: service.id,
    professionalId: service.professionalId,
    title: service.title,
    slug: service.slug,
    headline: service.headline,
    description: service.description,
    meetingFormat: service.meetingFormat,
    displayPrice: service.displayPrice,
    currency: service.currency,
    durationMinutes: service.durationMinutes,
    preparationInstructions: service.preparationInstructions,
    idealPersonaDescription: service.idealPersonaDescription,
    gateSetupAnswers: service.gateSetupAnswers as Record<string, string> | null,
    paymentRequired: service.paymentRequired,
    qualificationRequired: service.qualificationRequired,
    accessCodeRequired: service.accessCodeRequired,
    manualApprovalRequired: service.manualApprovalRequired,
    availabilityExposure: service.availabilityExposure as AvailabilityExposure,
    sortOrder: service.sortOrder,
    active: service.active,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
  };
}

export function mapServices(services: PrismaService[]): Service[] {
  return services.map(mapService);
}

export function mapPublicService(service: PrismaService): PublicService {
  return {
    id: service.id,
    professionalId: service.professionalId,
    title: service.title,
    slug: service.slug,
    headline: service.headline,
    description: service.description,
    meetingFormat: service.meetingFormat,
    displayPrice: service.displayPrice,
    currency: service.currency,
    durationMinutes: service.durationMinutes,
    preparationInstructions: service.preparationInstructions,
    paymentRequired: service.paymentRequired,
    qualificationRequired: service.qualificationRequired,
    accessCodeRequired: service.accessCodeRequired,
    manualApprovalRequired: service.manualApprovalRequired,
    availabilityExposure: service.availabilityExposure as AvailabilityExposure,
    active: service.active,
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
    headline: service.headline,
    displayPrice: service.displayPrice,
    currency: service.currency,
    durationMinutes: service.durationMinutes,
    meetingFormat: service.meetingFormat,
    paymentRequired: service.paymentRequired,
    qualificationRequired: service.qualificationRequired,
    accessCodeRequired: service.accessCodeRequired,
    manualApprovalRequired: service.manualApprovalRequired,
    availabilityExposure: service.availabilityExposure as AvailabilityExposure,
    sortOrder: service.sortOrder,
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
    ...mapService(service),
    bookingCount: service._count?.bookings ?? 0,
  };
}

export function mapServicesWithMeta(
  services: ServiceWithCountMeta[],
): ServiceWithMeta[] {
  return services.map(mapServiceWithMeta);
}
