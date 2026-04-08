import "server-only";

import type {
  Booking,
  BookingHold,
  Lead,
  Prisma,
} from "@prisma/client";
import { db } from "@/lib/db";

const bookingListInclude = Prisma.validator<Prisma.BookingInclude>()({
  lead: true,
  service: true,
});

const bookingWithRelationsInclude = Prisma.validator<Prisma.BookingInclude>()({
  hold: true,
  lead: true,
  service: true,
  calendarEvents: true,
  notifications: true,
});

export type BookingListItem = Prisma.BookingGetPayload<{
  include: typeof bookingListInclude;
}>;

export type BookingWithRelations = Prisma.BookingGetPayload<{
  include: typeof bookingWithRelationsInclude;
}>;

export const bookingRepository = {
  async findLeadById(id: string): Promise<Lead | null> {
    return db.lead.findUnique({
      where: { id },
    });
  },

  async findLeadByIdForProfessional(
    id: string,
    professionalId: string,
  ): Promise<Lead | null> {
    return db.lead.findFirst({
      where: {
        id,
        professionalId,
      },
    });
  },

  async findLeadsByProfessionalId(professionalId: string): Promise<Lead[]> {
    return db.lead.findMany({
      where: { professionalId },
      orderBy: [{ createdAt: "desc" }],
    });
  },

  async findLeadsByServiceId(
    serviceId: string,
    professionalId?: string,
  ): Promise<Lead[]> {
    return db.lead.findMany({
      where: {
        serviceId,
        ...(professionalId ? { professionalId } : {}),
      },
      orderBy: [{ createdAt: "desc" }],
    });
  },

  async createLead(data: Prisma.LeadCreateInput): Promise<Lead> {
    return db.lead.create({
      data,
    });
  },

  async createLeadForProfessional(
    professionalId: string,
    data: Omit<Prisma.LeadUncheckedCreateInput, "professionalId">,
  ): Promise<Lead> {
    return db.lead.create({
      data: {
        professionalId,
        ...data,
      },
    });
  },

  async updateLeadById(id: string, data: Prisma.LeadUpdateInput): Promise<Lead> {
    return db.lead.update({
      where: { id },
      data,
    });
  },

  async deleteLeadById(id: string): Promise<Lead> {
    return db.lead.delete({
      where: { id },
    });
  },

  async findBookingHoldById(id: string): Promise<BookingHold | null> {
    return db.bookingHold.findUnique({
      where: { id },
    });
  },

  async findBookingHoldByIdForProfessional(
    id: string,
    professionalId: string,
  ): Promise<BookingHold | null> {
    return db.bookingHold.findFirst({
      where: {
        id,
        professionalId,
      },
    });
  },

  async findActiveBookingHold(params: {
    professionalId: string;
    serviceId: string;
    slotStart: Date;
    slotEnd: Date;
  }): Promise<BookingHold | null> {
    return db.bookingHold.findFirst({
      where: {
        professionalId: params.professionalId,
        serviceId: params.serviceId,
        status: "ACTIVE",
        slotStart: params.slotStart,
        slotEnd: params.slotEnd,
        expiresAt: {
          gt: new Date(),
        },
      },
    });
  },

  async findBookingHoldsByProfessionalId(
    professionalId: string,
  ): Promise<BookingHold[]> {
    return db.bookingHold.findMany({
      where: { professionalId },
      orderBy: [{ createdAt: "desc" }],
    });
  },

  async findExpiredActiveBookingHolds(date = new Date()): Promise<BookingHold[]> {
    return db.bookingHold.findMany({
      where: {
        status: "ACTIVE",
        expiresAt: {
          lte: date,
        },
      },
      orderBy: [{ expiresAt: "asc" }],
    });
  },

  async createBookingHold(
    data: Prisma.BookingHoldCreateInput,
  ): Promise<BookingHold> {
    return db.bookingHold.create({
      data,
    });
  },

  async createBookingHoldForProfessional(
    professionalId: string,
    data: Omit<Prisma.BookingHoldUncheckedCreateInput, "professionalId">,
  ): Promise<BookingHold> {
    return db.bookingHold.create({
      data: {
        professionalId,
        ...data,
      },
    });
  },

  async updateBookingHoldById(
    id: string,
    data: Prisma.BookingHoldUpdateInput,
  ): Promise<BookingHold> {
    return db.bookingHold.update({
      where: { id },
      data,
    });
  },

  async updateBookingHoldByIdForProfessional(
    id: string,
    professionalId: string,
    data: Prisma.BookingHoldUpdateInput,
  ): Promise<BookingHold> {
    return db.$transaction(async (tx) => {
      const existing = await tx.bookingHold.findFirst({
        where: {
          id,
          professionalId,
        },
      });

      if (!existing) {
        throw new Error("Booking hold not found.");
      }

      return tx.bookingHold.update({
        where: { id: existing.id },
        data,
      });
    });
  },

  async releaseExpiredBookingHolds(date = new Date()): Promise<Prisma.BatchPayload> {
    return db.bookingHold.updateMany({
      where: {
        status: "ACTIVE",
        expiresAt: {
          lte: date,
        },
      },
      data: {
        status: "EXPIRED",
      },
    });
  },

  async deleteBookingHoldById(id: string): Promise<BookingHold> {
    return db.bookingHold.delete({
      where: { id },
    });
  },

  async findBookingById(id: string): Promise<Booking | null> {
    return db.booking.findUnique({
      where: { id },
    });
  },

  async findBookingByIdWithRelations(
    id: string,
  ): Promise<BookingWithRelations | null> {
    return db.booking.findUnique({
      where: { id },
      include: bookingWithRelationsInclude,
    });
  },

  async findBookingByIdForProfessional(
    id: string,
    professionalId: string,
  ): Promise<Booking | null> {
    return db.booking.findFirst({
      where: {
        id,
        professionalId,
      },
    });
  },

  async findBookingByHoldId(holdId: string): Promise<Booking | null> {
    return db.booking.findUnique({
      where: { holdId },
    });
  },

  async findBookingsByProfessionalId(
    professionalId: string,
  ): Promise<BookingListItem[]> {
    return db.booking.findMany({
      where: { professionalId },
      include: bookingListInclude,
      orderBy: [{ slotStart: "asc" }, { createdAt: "desc" }],
    });
  },

  async findUpcomingBookingsByProfessionalId(
    professionalId: string,
    now = new Date(),
  ): Promise<BookingListItem[]> {
    return db.booking.findMany({
      where: {
        professionalId,
        slotStart: {
          gte: now,
        },
      },
      include: bookingListInclude,
      orderBy: [{ slotStart: "asc" }],
    });
  },

  async findBookingsByLeadId(leadId: string): Promise<Booking[]> {
    return db.booking.findMany({
      where: { leadId },
      orderBy: [{ createdAt: "desc" }],
    });
  },

  async findBookingsInRange(params: {
    professionalId: string;
    start: Date;
    end: Date;
  }): Promise<Booking[]> {
    return db.booking.findMany({
      where: {
        professionalId: params.professionalId,
        slotStart: {
          lt: params.end,
        },
        slotEnd: {
          gt: params.start,
        },
        status: {
          not: "CANCELLED",
        },
      },
      orderBy: [{ slotStart: "asc" }],
    });
  },

  async findPendingEventCreationBookings(): Promise<BookingWithRelations[]> {
    return db.booking.findMany({
      where: {
        OR: [
          { status: "EVENT_CREATION_PENDING" },
          { calendarStatus: "FAILED" },
        ],
      },
      include: bookingWithRelationsInclude,
      orderBy: [{ createdAt: "asc" }],
    });
  },

  async createBooking(data: Prisma.BookingCreateInput): Promise<Booking> {
    return db.booking.create({
      data,
    });
  },

  async createBookingFromHold(params: {
    professionalId: string;
    serviceId: string;
    leadId: string;
    holdId: string;
    slotStart: Date;
    slotEnd: Date;
    timezone: string;
    status?: Prisma.BookingCreateInput["status"];
    codeValidationStatus?: Prisma.BookingCreateInput["codeValidationStatus"];
    calendarStatus?: Prisma.BookingCreateInput["calendarStatus"];
  }): Promise<Booking> {
    return db.$transaction(async (tx) => {
      const hold = await tx.bookingHold.findFirst({
        where: {
          id: params.holdId,
          professionalId: params.professionalId,
        },
      });

      if (!hold) {
        throw new Error("Booking hold not found.");
      }

      const existingBooking = await tx.booking.findUnique({
        where: {
          holdId: params.holdId,
        },
      });

      if (existingBooking) {
        return existingBooking;
      }

      const booking = await tx.booking.create({
        data: {
          professionalId: params.professionalId,
          serviceId: params.serviceId,
          leadId: params.leadId,
          holdId: params.holdId,
          slotStart: params.slotStart,
          slotEnd: params.slotEnd,
          timezone: params.timezone,
          status: params.status ?? "PENDING_CODE",
          codeValidationStatus: params.codeValidationStatus ?? "PENDING",
          calendarStatus: params.calendarStatus ?? "PENDING",
        },
      });

      await tx.bookingHold.update({
        where: { id: params.holdId },
        data: {
          status: "CONVERTED",
        },
      });

      return booking;
    });
  },

  async updateBookingById(
    id: string,
    data: Prisma.BookingUpdateInput,
  ): Promise<Booking> {
    return db.booking.update({
      where: { id },
      data,
    });
  },

  async updateBookingByIdForProfessional(
    id: string,
    professionalId: string,
    data: Prisma.BookingUpdateInput,
  ): Promise<Booking> {
    return db.$transaction(async (tx) => {
      const existing = await tx.booking.findFirst({
        where: {
          id,
          professionalId,
        },
      });

      if (!existing) {
        throw new Error("Booking not found.");
      }

      return tx.booking.update({
        where: { id: existing.id },
        data,
      });
    });
  },

  async markCodeInvalid(id: string): Promise<Booking> {
    return db.booking.update({
      where: { id },
      data: {
        status: "CODE_INVALID",
        codeValidationStatus: "INVALID",
      },
    });
  },

  async markConfirmed(id: string): Promise<Booking> {
    return db.booking.update({
      where: { id },
      data: {
        status: "CONFIRMED",
        codeValidationStatus: "VALID",
      },
    });
  },

  async markEventCreationPending(id: string): Promise<Booking> {
    return db.booking.update({
      where: { id },
      data: {
        status: "EVENT_CREATION_PENDING",
        calendarStatus: "PENDING",
      },
    });
  },

  async markEventCreated(id: string): Promise<Booking> {
    return db.booking.update({
      where: { id },
      data: {
        status: "EVENT_CREATED",
        calendarStatus: "CREATED",
      },
    });
  },

  async markEventFailed(id: string): Promise<Booking> {
    return db.booking.update({
      where: { id },
      data: {
        status: "EVENT_CREATION_PENDING",
        calendarStatus: "FAILED",
      },
    });
  },

  async cancelBooking(id: string): Promise<Booking> {
    return db.booking.update({
      where: { id },
      data: {
        status: "CANCELLED",
      },
    });
  },

  async deleteBookingById(id: string): Promise<Booking> {
    return db.booking.delete({
      where: { id },
    });
  },

  async countBookingsByProfessionalId(professionalId: string): Promise<number> {
    return db.booking.count({
      where: { professionalId },
    });
  },

  async countUpcomingBookingsByProfessionalId(
    professionalId: string,
    now = new Date(),
  ): Promise<number> {
    return db.booking.count({
      where: {
        professionalId,
        slotStart: {
          gte: now,
        },
        status: {
          not: "CANCELLED",
        },
      },
    });
  },
};