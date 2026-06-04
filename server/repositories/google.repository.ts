import "server-only";

import type { CalendarAccount, CalendarEvent, Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const googleRepository = {
  async findCalendarAccountById(id: string): Promise<CalendarAccount | null> {
    return db.calendarAccount.findUnique({
      where: { id },
    });
  },

  async findCalendarAccountByIdForProfessional(
    id: string,
    professionalId: string,
  ): Promise<CalendarAccount | null> {
    return db.calendarAccount.findFirst({
      where: {
        id,
        professionalId,
      },
    });
  },

  async findCalendarAccountsByProfessionalId(
    professionalId: string,
  ): Promise<CalendarAccount[]> {
    return db.calendarAccount.findMany({
      where: { professionalId },
      orderBy: [{ createdAt: "asc" }],
    });
  },

  async findActiveCalendarAccountsByProfessionalId(
    professionalId: string,
  ): Promise<CalendarAccount[]> {
    return db.calendarAccount.findMany({
      where: {
        professionalId,
        isActive: true,
      },
      orderBy: [{ createdAt: "asc" }],
    });
  },

  async findConflictCheckCalendarsByProfessionalId(
    professionalId: string,
  ): Promise<CalendarAccount[]> {
    return db.calendarAccount.findMany({
      where: {
        professionalId,
        isActive: true,
        useForConflictCheck: true,
      },
      orderBy: [{ createdAt: "asc" }],
    });
  },

  async findDefaultEventCalendarByProfessionalId(
    professionalId: string,
  ): Promise<CalendarAccount | null> {
    return db.calendarAccount.findFirst({
      where: {
        professionalId,
        isActive: true,
        isDefaultEventCalendar: true,
      },
      orderBy: [{ createdAt: "asc" }],
    });
  },

  async findByExternalCalendar(params: {
    provider: "GOOGLE" | "OUTLOOK";
    externalAccountId: string;
    externalCalendarId?: string | null;
  }): Promise<CalendarAccount | null> {
    return db.calendarAccount.findFirst({
      where: {
        provider: params.provider,
        externalAccountId: params.externalAccountId,
        externalCalendarId: params.externalCalendarId ?? null,
      },
    });
  },

  async createCalendarAccount(
    data: Prisma.CalendarAccountCreateInput,
  ): Promise<CalendarAccount> {
    return db.calendarAccount.create({
      data,
    });
  },

  async createCalendarAccountForProfessional(
    professionalId: string,
    data: Omit<Prisma.CalendarAccountUncheckedCreateInput, "professionalId">,
  ): Promise<CalendarAccount> {
    return db.calendarAccount.create({
      data: {
        professionalId,
        ...data,
      },
    });
  },

  async updateCalendarAccountById(
    id: string,
    data: Prisma.CalendarAccountUpdateInput,
  ): Promise<CalendarAccount> {
    return db.calendarAccount.update({
      where: { id },
      data,
    });
  },

  async updateCalendarAccountByIdForProfessional(
    id: string,
    professionalId: string,
    data: Prisma.CalendarAccountUpdateInput,
  ): Promise<CalendarAccount> {
    return db.$transaction(async (tx) => {
      const existing = await tx.calendarAccount.findFirst({
        where: {
          id,
          professionalId,
        },
      });

      if (!existing) {
        throw new Error("Calendar account not found.");
      }

      return tx.calendarAccount.update({
        where: { id: existing.id },
        data,
      });
    });
  },

  async setCalendarActiveState(
    id: string,
    professionalId: string,
    isActive: boolean,
  ): Promise<CalendarAccount> {
    return db.$transaction(async (tx) => {
      const existing = await tx.calendarAccount.findFirst({
        where: {
          id,
          professionalId,
        },
      });

      if (!existing) {
        throw new Error("Calendar account not found.");
      }

      return tx.calendarAccount.update({
        where: { id: existing.id },
        data: { isActive },
      });
    });
  },

  async setConflictCheckState(
    id: string,
    professionalId: string,
    useForConflictCheck: boolean,
  ): Promise<CalendarAccount> {
    return db.$transaction(async (tx) => {
      const existing = await tx.calendarAccount.findFirst({
        where: {
          id,
          professionalId,
        },
      });

      if (!existing) {
        throw new Error("Calendar account not found.");
      }

      return tx.calendarAccount.update({
        where: { id: existing.id },
        data: { useForConflictCheck },
      });
    });
  },

  async setDefaultEventCalendar(
    professionalId: string,
    calendarAccountId: string,
  ): Promise<CalendarAccount> {
    return db.$transaction(async (tx) => {
      const target = await tx.calendarAccount.findFirst({
        where: {
          id: calendarAccountId,
          professionalId,
        },
      });

      if (!target) {
        throw new Error("Calendar account not found.");
      }

      await tx.calendarAccount.updateMany({
        where: {
          professionalId,
          isDefaultEventCalendar: true,
        },
        data: {
          isDefaultEventCalendar: false,
        },
      });

      return tx.calendarAccount.update({
        where: { id: target.id },
        data: {
          isDefaultEventCalendar: true,
        },
      });
    });
  },

  async touchLastSyncedAt(
    id: string,
    professionalId: string,
    date = new Date(),
  ): Promise<CalendarAccount> {
    return db.$transaction(async (tx) => {
      const existing = await tx.calendarAccount.findFirst({
        where: {
          id,
          professionalId,
        },
      });

      if (!existing) {
        throw new Error("Calendar account not found.");
      }

      return tx.calendarAccount.update({
        where: { id: existing.id },
        data: {
          lastSyncedAt: date,
        },
      });
    });
  },

  async deleteCalendarAccountById(id: string): Promise<CalendarAccount> {
    return db.calendarAccount.delete({
      where: { id },
    });
  },

  async deleteCalendarAccountByIdForProfessional(
    id: string,
    professionalId: string,
  ): Promise<CalendarAccount> {
    return db.$transaction(async (tx) => {
      const existing = await tx.calendarAccount.findFirst({
        where: {
          id,
          professionalId,
        },
      });

      if (!existing) {
        throw new Error("Calendar account not found.");
      }

      return tx.calendarAccount.delete({
        where: { id: existing.id },
      });
    });
  },

  async findCalendarEventById(id: string): Promise<CalendarEvent | null> {
    return db.calendarEvent.findUnique({
      where: { id },
    });
  },

  async findCalendarEventsByBookingId(
    bookingId: string,
  ): Promise<CalendarEvent[]> {
    return db.calendarEvent.findMany({
      where: { bookingId },
      orderBy: [{ createdAt: "asc" }],
    });
  },

  async findCalendarEventByExternalEvent(params: {
    calendarAccountId: string;
    externalEventId: string;
  }): Promise<CalendarEvent | null> {
    return db.calendarEvent.findFirst({
      where: {
        calendarAccountId: params.calendarAccountId,
        externalEventId: params.externalEventId,
      },
    });
  },

  async createCalendarEvent(
    data: Prisma.CalendarEventCreateInput,
  ): Promise<CalendarEvent> {
    return db.calendarEvent.create({
      data,
    });
  },

  async createCalendarEventForBooking(
    bookingId: string,
    calendarAccountId: string,
    data: Omit<
      Prisma.CalendarEventUncheckedCreateInput,
      "bookingId" | "calendarAccountId"
    >,
  ): Promise<CalendarEvent> {
    return db.calendarEvent.create({
      data: {
        bookingId,
        calendarAccountId,
        ...data,
      },
    });
  },

  async updateCalendarEventById(
    id: string,
    data: Prisma.CalendarEventUpdateInput,
  ): Promise<CalendarEvent> {
    return db.calendarEvent.update({
      where: { id },
      data,
    });
  },

  async updateCalendarEventByExternalEvent(params: {
    calendarAccountId: string;
    externalEventId: string;
    data: Prisma.CalendarEventUpdateInput;
  }): Promise<CalendarEvent> {
    return db.$transaction(async (tx) => {
      const existing = await tx.calendarEvent.findFirst({
        where: {
          calendarAccountId: params.calendarAccountId,
          externalEventId: params.externalEventId,
        },
      });

      if (!existing) {
        throw new Error("Calendar event not found.");
      }

      return tx.calendarEvent.update({
        where: { id: existing.id },
        data: params.data,
      });
    });
  },

  async deleteCalendarEventById(id: string): Promise<CalendarEvent> {
    return db.calendarEvent.delete({
      where: { id },
    });
  },

  async countCalendarAccountsByProfessionalId(
    professionalId: string,
  ): Promise<number> {
    return db.calendarAccount.count({
      where: { professionalId },
    });
  },

  async countActiveConflictCalendarsByProfessionalId(
    professionalId: string,
  ): Promise<number> {
    return db.calendarAccount.count({
      where: {
        professionalId,
        isActive: true,
        useForConflictCheck: true,
      },
    });
  },
};