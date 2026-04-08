import "server-only";

import { BookingStatus, CalendarProvider, CalendarSyncStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { bookingService } from "@/server/services/booking.service";
import { googleCalendarService } from "@/server/services/google-calendar.service";

export type RetryEventCreationJobResult = {
  startedAt: string;
  finishedAt: string;
  totals: {
    scanned: number;
    retried: number;
    created: number;
    skipped: number;
    failed: number;
  };
  results: Array<{
    bookingId: string;
    professionalId: string;
    leadId: string;
    success: boolean;
    skipped?: boolean;
    reason?: string;
    provider?: CalendarProvider;
    calendarAccountId?: string;
    eventId?: string;
  }>;
};

type RetryableBookingCandidate = {
  id: string;
  professionalId: string;
  leadId: string;
  slotStart: Date;
  slotEnd: Date;
  timezone: string | null;
  status: BookingStatus;
  service: {
    title: string;
  } | null;
  lead: {
    name: string | null;
    email: string | null;
  } | null;
};

function getRetryableStatuses(): BookingStatus[] {
  return [
    BookingStatus.CONFIRMED,
    BookingStatus.EVENT_CREATION_PENDING,
  ];
}

function buildEventTitle(booking: RetryableBookingCandidate) {
  return booking.service?.title || "Booked session";
}

async function findDefaultGoogleCalendarAccount(professionalId: string) {
  return db.calendarAccount.findFirst({
    where: {
      professionalId,
      provider: CalendarProvider.GOOGLE,
      isActive: true,
      isDefaultEventCalendar: true,
      syncStatus: {
        in: [CalendarSyncStatus.CONNECTED, CalendarSyncStatus.SYNCING],
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
}

export async function retryEventCreationJob(): Promise<RetryEventCreationJobResult> {
  const startedAt = new Date();

  logger.info("Starting retry event creation job.");

  const bookings = await db.booking.findMany({
    where: {
      status: {
        in: getRetryableStatuses(),
      },
      codeValidationStatus: "VALID",
      OR: [
        { calendarStatus: "PENDING" },
        { calendarStatus: "FAILED" },
      ],
    },
    orderBy: {
      updatedAt: "asc",
    },
    select: {
      id: true,
      professionalId: true,
      leadId: true,
      slotStart: true,
      slotEnd: true,
      timezone: true,
      status: true,
      service: {
        select: {
          title: true,
        },
      },
      lead: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  const results: RetryEventCreationJobResult["results"] = [];

  for (const booking of bookings) {
    try {
      const defaultCalendar = await findDefaultGoogleCalendarAccount(
        booking.professionalId,
      );

      if (!defaultCalendar) {
        results.push({
          bookingId: booking.id,
          professionalId: booking.professionalId,
          leadId: booking.leadId,
          success: false,
          skipped: true,
          reason: "No active default Google event calendar found.",
        });
        continue;
      }

      if (!booking.lead?.email) {
        results.push({
          bookingId: booking.id,
          professionalId: booking.professionalId,
          leadId: booking.leadId,
          success: false,
          skipped: true,
          reason: "Lead email is missing.",
          provider: defaultCalendar.provider,
          calendarAccountId: defaultCalendar.id,
        });
        continue;
      }

      await bookingService.markEventCreationPending(booking.id);

      const createdEvent =
        await googleCalendarService.createBookingEventForCalendarAccount({
          calendarAccountId: defaultCalendar.id,
          title: buildEventTitle(booking),
          start: booking.slotStart,
          end: booking.slotEnd,
          timezone: booking.timezone ?? defaultCalendar.calendarTimeZone ?? "UTC",
          attendeeEmail: booking.lead.email,
          attendeeName: booking.lead.name ?? undefined,
          bookingId: booking.id,
          description: [
            `Booking ID: ${booking.id}`,
            booking.lead.name ? `Client: ${booking.lead.name}` : null,
            booking.lead.email ? `Email: ${booking.lead.email}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
        });

      await db.booking.update({
        where: { id: booking.id },
        data: {
          externalEventId: createdEvent.externalEventId,
          eventUrl: createdEvent.eventUrl ?? null,
          calendarStatus: "CREATED",
        },
      });

      await bookingService.markEventCreated(booking.id);

      results.push({
        bookingId: booking.id,
        professionalId: booking.professionalId,
        leadId: booking.leadId,
        success: true,
        provider: defaultCalendar.provider,
        calendarAccountId: defaultCalendar.id,
        eventId: createdEvent.externalEventId,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown event retry error.";

      await bookingService.markEventFailed(booking.id);

      logger.error("Retry event creation failed.", {
        bookingId: booking.id,
        professionalId: booking.professionalId,
        error: message,
      });

      results.push({
        bookingId: booking.id,
        professionalId: booking.professionalId,
        leadId: booking.leadId,
        success: false,
        reason: message,
      });
    }
  }

  const finishedAt = new Date();

  const summary: RetryEventCreationJobResult = {
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    totals: {
      scanned: results.length,
      retried: results.filter((item) => !item.skipped).length,
      created: results.filter((item) => item.success).length,
      skipped: results.filter((item) => item.skipped).length,
      failed: results.filter((item) => !item.success && !item.skipped).length,
    },
    results,
  };

  logger.info("Finished retry event creation job.", summary.totals);

  return summary;
}