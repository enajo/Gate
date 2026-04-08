import "server-only";

import { addMinutes, endOfDay, startOfDay } from "date-fns";
import type {
  Booking as PrismaBooking,
  BookingHold as PrismaBookingHold,
} from "@prisma/client";
import type {
  Booking,
  BookingConfirmationResult,
  BookingHold,
  BookingListItem,
  BookingWithRelations,
  ConfirmBookingInput,
  CreateBookingHoldInput,
  PublicBookingSuccessPayload,
} from "@/types/booking";
import { DEFAULT_TIMEZONE } from "@/lib/constants";
import { assertValidDate } from "@/lib/dates";
import { accessCodeService } from "@/server/services/access-code.service";
import { availabilityService } from "@/server/services/availability.service";
import { bookingRepository } from "@/server/repositories/booking.repository";
import { profileRepository } from "@/server/repositories/profile.repository";
import { serviceRepository } from "@/server/repositories/service.repository";
import {
  bookingSlotSelectionSchema,
  confirmBookingSchema,
} from "@/server/validators/booking.validator";

const DEFAULT_HOLD_MINUTES = 10;

function mapBooking(
  booking: PrismaBooking | null,
): Booking | null {
  if (!booking) {
    return null;
  }

  return {
    id: booking.id,
    professionalId: booking.professionalId,
    serviceId: booking.serviceId,
    leadId: booking.leadId,
    holdId: booking.holdId,
    slotStart: booking.slotStart,
    slotEnd: booking.slotEnd,
    timezone: booking.timezone,
    status: booking.status,
    codeValidationStatus: booking.codeValidationStatus,
    calendarStatus: booking.calendarStatus,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  };
}

function mapBookingHold(
  hold: PrismaBookingHold | null,
): BookingHold | null {
  if (!hold) {
    return null;
  }

  return {
    id: hold.id,
    professionalId: hold.professionalId,
    serviceId: hold.serviceId,
    leadId: hold.leadId,
    slotStart: hold.slotStart,
    slotEnd: hold.slotEnd,
    expiresAt: hold.expiresAt,
    status: hold.status,
    createdAt: hold.createdAt,
    updatedAt: hold.updatedAt,
  };
}

function mapBookingListItem(
  booking: Awaited<ReturnType<typeof bookingRepository.findBookingsByProfessionalId>>[number],
): BookingListItem {
  return {
    id: booking.id,
    professionalId: booking.professionalId,
    serviceId: booking.serviceId,
    leadId: booking.leadId,
    holdId: booking.holdId,
    slotStart: booking.slotStart,
    slotEnd: booking.slotEnd,
    timezone: booking.timezone,
    status: booking.status,
    codeValidationStatus: booking.codeValidationStatus,
    calendarStatus: booking.calendarStatus,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
    lead: {
      id: booking.lead.id,
      name: booking.lead.name,
      email: booking.lead.email,
      qualificationResult: booking.lead.qualificationResult,
    },
    service: {
      id: booking.service.id,
      title: booking.service.title,
      slug: booking.service.slug,
      durationMinutes: booking.service.durationMinutes,
      displayPrice: booking.service.displayPrice,
    },
  };
}

function mapBookingWithRelations(
  booking: Awaited<ReturnType<typeof bookingRepository.findBookingByIdWithRelations>>,
): BookingWithRelations | null {
  if (!booking) {
    return null;
  }

  return {
    id: booking.id,
    professionalId: booking.professionalId,
    serviceId: booking.serviceId,
    leadId: booking.leadId,
    holdId: booking.holdId,
    slotStart: booking.slotStart,
    slotEnd: booking.slotEnd,
    timezone: booking.timezone,
    status: booking.status,
    codeValidationStatus: booking.codeValidationStatus,
    calendarStatus: booking.calendarStatus,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
    hold: {
      id: booking.hold.id,
      professionalId: booking.hold.professionalId,
      serviceId: booking.hold.serviceId,
      leadId: booking.hold.leadId,
      slotStart: booking.hold.slotStart,
      slotEnd: booking.hold.slotEnd,
      expiresAt: booking.hold.expiresAt,
      status: booking.hold.status,
      createdAt: booking.hold.createdAt,
      updatedAt: booking.hold.updatedAt,
    },
    lead: {
      id: booking.lead.id,
      professionalId: booking.lead.professionalId,
      serviceId: booking.lead.serviceId,
      name: booking.lead.name,
      email: booking.lead.email,
      answersJson: booking.lead.answersJson as Record<string, unknown>,
      qualificationResult: booking.lead.qualificationResult,
      createdAt: booking.lead.createdAt,
      updatedAt: booking.lead.updatedAt,
    },
    service: {
      id: booking.service.id,
      title: booking.service.title,
      slug: booking.service.slug,
      durationMinutes: booking.service.durationMinutes,
      displayPrice: booking.service.displayPrice,
      preparationInstructions: booking.service.preparationInstructions,
    },
  };
}

async function requireProfessionalByUserId(userId: string) {
  const professional = await profileRepository.findByUserId(userId);

  if (!professional) {
    throw new Error("Professional profile not found.");
  }

  return professional;
}

async function requireProfessionalById(professionalId: string) {
  const professional = await profileRepository.findById(professionalId);

  if (!professional) {
    throw new Error("Professional profile not found.");
  }

  return professional;
}

async function requireLead(params: {
  leadId: string;
  professionalId: string;
  serviceId: string;
}) {
  const lead = await bookingRepository.findLeadByIdForProfessional(
    params.leadId,
    params.professionalId,
  );

  if (!lead || lead.serviceId !== params.serviceId) {
    throw new Error("Lead not found.");
  }

  if (lead.qualificationResult !== "QUALIFIED") {
    throw new Error("Lead is not qualified for booking.");
  }

  return lead;
}

async function requireService(params: {
  serviceId: string;
  professionalId: string;
}) {
  const service = await serviceRepository.findByIdForProfessional(
    params.serviceId,
    params.professionalId,
  );

  if (!service) {
    throw new Error("Service not found.");
  }

  if (!service.active) {
    throw new Error("Service is not active.");
  }

  return service;
}

async function requireValidActiveHold(params: {
  holdId: string;
  professionalId: string;
  serviceId: string;
  leadId: string;
}) {
  const hold = await bookingRepository.findBookingHoldByIdForProfessional(
    params.holdId,
    params.professionalId,
  );

  if (!hold) {
    throw new Error("Booking hold not found.");
  }

  if (hold.serviceId !== params.serviceId) {
    throw new Error("Booking hold does not match the selected service.");
  }

  if (hold.leadId !== params.leadId) {
    throw new Error("Booking hold does not belong to this lead.");
  }

  if (hold.status !== "ACTIVE") {
    throw new Error("Booking hold is no longer active.");
  }

  if (hold.expiresAt.getTime() <= Date.now()) {
    await bookingRepository.updateBookingHoldById(hold.id, {
      status: "EXPIRED",
    });

    throw new Error("Booking hold has expired.");
  }

  return hold;
}

async function assertRequestedSlotIsStillBookable(params: {
  professionalId: string;
  serviceId: string;
  slotStart: Date;
  slotEnd: Date;
  timezone: string;
}) {
  const rangeStart = startOfDay(params.slotStart);
  const rangeEnd = endOfDay(params.slotEnd);

  const availability = await availabilityService.getBookableSlotsForService({
    professionalId: params.professionalId,
    serviceId: params.serviceId,
    startDate: rangeStart,
    endDate: rangeEnd,
    timezone: params.timezone,
  });

  const matchingSlot = availability.slots.find(
    (slot) =>
      slot.start.getTime() === params.slotStart.getTime() &&
      slot.end.getTime() === params.slotEnd.getTime(),
  );

  if (!matchingSlot) {
    throw new Error("Selected slot is no longer available.");
  }
}

export const bookingService = {
  async getBookingById(
    userId: string,
    bookingId: string,
  ): Promise<BookingWithRelations | null> {
    const professional = await requireProfessionalByUserId(userId);
    const booking = await bookingRepository.findBookingByIdWithRelations(
      bookingId,
    );

    if (!booking || booking.professionalId !== professional.id) {
      return null;
    }

    return mapBookingWithRelations(booking);
  },

  async listBookings(userId: string): Promise<BookingListItem[]> {
    const professional = await requireProfessionalByUserId(userId);
    const bookings = await bookingRepository.findBookingsByProfessionalId(
      professional.id,
    );

    return bookings.map(mapBookingListItem);
  },

  async listUpcomingBookings(userId: string): Promise<BookingListItem[]> {
    const professional = await requireProfessionalByUserId(userId);
    const bookings = await bookingRepository.findUpcomingBookingsByProfessionalId(
      professional.id,
    );

    return bookings.map(mapBookingListItem);
  },

  async createHold(params: {
    professionalId: string;
    serviceId: string;
    leadId: string;
    slotStart: Date | string;
    slotEnd: Date | string;
    timezone?: string;
    holdMinutes?: number;
  }): Promise<BookingHold> {
    const parsed = bookingSlotSelectionSchema.parse({
      serviceId: params.serviceId,
      slotStart:
        typeof params.slotStart === "string"
          ? params.slotStart
          : params.slotStart.toISOString(),
      slotEnd:
        typeof params.slotEnd === "string"
          ? params.slotEnd
          : params.slotEnd.toISOString(),
      timezone: params.timezone ?? DEFAULT_TIMEZONE,
    });

    await requireProfessionalById(params.professionalId);
    await requireService({
      professionalId: params.professionalId,
      serviceId: parsed.serviceId,
    });
    await requireLead({
      professionalId: params.professionalId,
      serviceId: parsed.serviceId,
      leadId: params.leadId,
    });

    const slotStart = assertValidDate(parsed.slotStart);
    const slotEnd = assertValidDate(parsed.slotEnd);

    await assertRequestedSlotIsStillBookable({
      professionalId: params.professionalId,
      serviceId: parsed.serviceId,
      slotStart,
      slotEnd,
      timezone: parsed.timezone,
    });

    const existingActiveHold = await bookingRepository.findActiveBookingHold({
      professionalId: params.professionalId,
      serviceId: parsed.serviceId,
      slotStart,
      slotEnd,
    });

    if (existingActiveHold) {
      if (existingActiveHold.leadId === params.leadId) {
        return mapBookingHold(existingActiveHold)!;
      }

      throw new Error("This slot is temporarily reserved.");
    }

    const holdMinutes = params.holdMinutes ?? DEFAULT_HOLD_MINUTES;
    const calculatedExpiry = addMinutes(new Date(), holdMinutes);
    const expiresAt =
      calculatedExpiry.getTime() > slotStart.getTime()
        ? slotStart
        : calculatedExpiry;

    const holdInput: CreateBookingHoldInput = {
      professionalId: params.professionalId,
      serviceId: parsed.serviceId,
      leadId: params.leadId,
      slotStart,
      slotEnd,
      expiresAt,
    };

    const hold = await bookingRepository.createBookingHoldForProfessional(
      holdInput.professionalId,
      {
        serviceId: holdInput.serviceId,
        leadId: holdInput.leadId ?? null,
        slotStart: assertValidDate(holdInput.slotStart),
        slotEnd: assertValidDate(holdInput.slotEnd),
        expiresAt: assertValidDate(holdInput.expiresAt),
        status: "ACTIVE",
      },
    );

    return mapBookingHold(hold)!;
  },

  async validateHold(params: {
    professionalId: string;
    serviceId: string;
    leadId: string;
    holdId: string;
  }): Promise<BookingHold> {
    const hold = await requireValidActiveHold(params);
    return mapBookingHold(hold)!;
  },

  async releaseHold(
    holdId: string,
    status: "EXPIRED" | "RELEASED" = "RELEASED",
  ): Promise<BookingHold> {
    const existing = await bookingRepository.findBookingHoldById(holdId);

    if (!existing) {
      throw new Error("Booking hold not found.");
    }

    const updated = await bookingRepository.updateBookingHoldById(holdId, {
      status,
    });

    return mapBookingHold(updated)!;
  },

  async expireHolds(): Promise<number> {
    const result = await bookingRepository.releaseExpiredBookingHolds();
    return result.count;
  },

  async confirmBooking(
    input: ConfirmBookingInput,
  ): Promise<BookingConfirmationResult> {
    const parsed = confirmBookingSchema.parse(input);

    await requireProfessionalById(parsed.professionalId);
    await requireService({
      professionalId: parsed.professionalId,
      serviceId: parsed.serviceId,
    });
    await requireLead({
      professionalId: parsed.professionalId,
      serviceId: parsed.serviceId,
      leadId: parsed.leadId,
    });

    const hold = await requireValidActiveHold({
      professionalId: parsed.professionalId,
      serviceId: parsed.serviceId,
      leadId: parsed.leadId,
      holdId: parsed.holdId,
    });

    const existingBooking = await bookingRepository.findBookingByHoldId(
      parsed.holdId,
    );

    if (existingBooking?.codeValidationStatus === "VALID") {
      return {
        booking: mapBooking(existingBooking)!,
        isCodeValid: true,
        eventCreationRequired: existingBooking.calendarStatus !== "CREATED",
      };
    }

    const codeCheck = await accessCodeService.validate({
      professionalId: parsed.professionalId,
      code: parsed.accessCode,
    });

    if (!codeCheck.isValid) {
      if (existingBooking) {
        const invalidUpdated = await bookingRepository.updateBookingById(
          existingBooking.id,
          {
            status: "CODE_INVALID",
            codeValidationStatus: "INVALID",
          },
        );

        return {
          booking: mapBooking(invalidUpdated)!,
          isCodeValid: false,
          eventCreationRequired: false,
        };
      }

      const invalidBooking = await bookingRepository.createBooking({
        data: {
          professional: {
            connect: { id: parsed.professionalId },
          },
          service: {
            connect: { id: parsed.serviceId },
          },
          lead: {
            connect: { id: parsed.leadId },
          },
          hold: {
            connect: { id: parsed.holdId },
          },
          slotStart: hold.slotStart,
          slotEnd: hold.slotEnd,
          timezone: parsed.timezone,
          status: "CODE_INVALID",
          codeValidationStatus: "INVALID",
          calendarStatus: "PENDING",
        },
      });

      return {
        booking: mapBooking(invalidBooking)!,
        isCodeValid: false,
        eventCreationRequired: false,
      };
    }

    await assertRequestedSlotIsStillBookable({
      professionalId: parsed.professionalId,
      serviceId: parsed.serviceId,
      slotStart: hold.slotStart,
      slotEnd: hold.slotEnd,
      timezone: parsed.timezone,
    });

    if (existingBooking) {
      const updated = await bookingRepository.updateBookingById(
        existingBooking.id,
        {
          status: "CONFIRMED",
          codeValidationStatus: "VALID",
          calendarStatus: "PENDING",
        },
      );

      if (hold.status !== "CONVERTED") {
        await bookingRepository.updateBookingHoldById(hold.id, {
          status: "CONVERTED",
        });
      }

      return {
        booking: mapBooking(updated)!,
        isCodeValid: true,
        eventCreationRequired: true,
      };
    }

    const booking = await bookingRepository.createBookingFromHold({
      professionalId: parsed.professionalId,
      serviceId: parsed.serviceId,
      leadId: parsed.leadId,
      holdId: parsed.holdId,
      slotStart: hold.slotStart,
      slotEnd: hold.slotEnd,
      timezone: parsed.timezone,
      status: "CONFIRMED",
      codeValidationStatus: "VALID",
      calendarStatus: "PENDING",
    });

    return {
      booking: mapBooking(booking)!,
      isCodeValid: true,
      eventCreationRequired: true,
    };
  },

  async markEventCreationPending(bookingId: string): Promise<Booking> {
    const existing = await bookingRepository.findBookingById(bookingId);

    if (!existing) {
      throw new Error("Booking not found.");
    }

    const updated = await bookingRepository.markEventCreationPending(bookingId);
    return mapBooking(updated)!;
  },

  async markEventCreated(bookingId: string): Promise<Booking> {
    const existing = await bookingRepository.findBookingById(bookingId);

    if (!existing) {
      throw new Error("Booking not found.");
    }

    const updated = await bookingRepository.markEventCreated(bookingId);
    return mapBooking(updated)!;
  },

  async markEventFailed(bookingId: string): Promise<Booking> {
    const existing = await bookingRepository.findBookingById(bookingId);

    if (!existing) {
      throw new Error("Booking not found.");
    }

    const updated = await bookingRepository.markEventFailed(bookingId);
    return mapBooking(updated)!;
  },

  async cancelBooking(
    userId: string,
    bookingId: string,
  ): Promise<Booking> {
    const professional = await requireProfessionalByUserId(userId);
    const existing = await bookingRepository.findBookingByIdForProfessional(
      bookingId,
      professional.id,
    );

    if (!existing) {
      throw new Error("Booking not found.");
    }

    const updated = await bookingRepository.cancelBooking(existing.id);
    return mapBooking(updated)!;
  },

  async getBookingSuccessPayload(
    bookingId: string,
  ): Promise<PublicBookingSuccessPayload | null> {
    const booking = await bookingRepository.findBookingByIdWithRelations(
      bookingId,
    );

    if (!booking) {
      return null;
    }

    const professional = await profileRepository.findById(
      booking.professionalId,
    );

    if (!professional) {
      return null;
    }

    const primaryEvent = booking.calendarEvents[0] ?? null;

    return {
      bookingId: booking.id,
      professionalName: professional.fullName,
      serviceTitle: booking.service.title,
      slotStart: booking.slotStart.toISOString(),
      slotEnd: booking.slotEnd.toISOString(),
      timezone: booking.timezone,
      meetingUrl: primaryEvent?.meetingUrl ?? null,
      eventUrl: primaryEvent?.eventUrl ?? null,
    };
  },
};