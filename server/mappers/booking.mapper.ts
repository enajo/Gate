import type {
  Booking as PrismaBooking,
  BookingHold as PrismaBookingHold,
  Lead as PrismaLead,
  Service as PrismaService,
} from "@prisma/client";
import type {
  Booking,
  BookingHold,
  BookingListItem,
  BookingWithRelations,
  CalendarStatus,
  CodeValidationStatus,
  Lead,
} from "@/types/booking";

type BookingListItemSource = PrismaBooking & {
  lead: PrismaLead;
  service: PrismaService;
};

type BookingWithRelationsSource = PrismaBooking & {
  hold: PrismaBookingHold;
  lead: PrismaLead;
  service: PrismaService;
};

export function mapLead(lead: PrismaLead): Lead {
  return {
    id: lead.id,
    professionalId: lead.professionalId,
    serviceId: lead.serviceId,
    name: lead.name,
    email: lead.email,
    answersJson: lead.answersJson as Record<string, unknown>,
    qualificationResult: lead.qualificationResult,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  };
}

export function mapLeads(leads: PrismaLead[]): Lead[] {
  return leads.map(mapLead);
}

export function mapBookingHold(hold: PrismaBookingHold): BookingHold {
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

export function mapBookingHolds(holds: PrismaBookingHold[]): BookingHold[] {
  return holds.map(mapBookingHold);
}

export function mapBooking(booking: PrismaBooking): Booking {
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
    codeValidationStatus: booking.codeValidationStatus as CodeValidationStatus,
    calendarStatus: booking.calendarStatus as CalendarStatus,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  };
}

export function mapBookings(bookings: PrismaBooking[]): Booking[] {
  return bookings.map(mapBooking);
}

export function mapBookingListItem(
  booking: BookingListItemSource,
): BookingListItem {
  return {
    ...mapBooking(booking),
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
      paymentRequired: booking.service.paymentRequired,
    },
  };
}

export function mapBookingListItems(
  bookings: BookingListItemSource[],
): BookingListItem[] {
  return bookings.map(mapBookingListItem);
}

export function mapBookingWithRelations(
  booking: BookingWithRelationsSource,
): BookingWithRelations {
  return {
    ...mapBooking(booking),
    hold: mapBookingHold(booking.hold),
    lead: mapLead(booking.lead),
    service: {
      id: booking.service.id,
      title: booking.service.title,
      slug: booking.service.slug,
      durationMinutes: booking.service.durationMinutes,
      displayPrice: booking.service.displayPrice,
      paymentRequired: booking.service.paymentRequired,
      preparationInstructions: booking.service.preparationInstructions,
    },
  };
}

// Not used in service mapper but re-exported here for convenience
