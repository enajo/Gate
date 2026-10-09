import "server-only";

import { BOOKING_REMINDER_HOURS_BEFORE } from "@/lib/constants";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { bookingRepository } from "@/server/repositories/booking.repository";
import { emailService } from "@/server/services/email.service";

export type SendBookingRemindersJobResult = {
  startedAt: string;
  finishedAt: string;
  totals: {
    scanned: number;
    sent: number;
    failed: number;
  };
};

const HOUR_MS = 60 * 60 * 1000;
// A one-hour-wide window, run on an hourly cadence, catches every booking
// exactly once as it crosses the reminder threshold without needing to
// track a precise per-booking send time.
const WINDOW_WIDTH_HOURS = 1;

/**
 * Finds confirmed bookings starting within the reminder window who haven't
 * had a reminder sent yet, and sends one. Gate had no pre-appointment
 * reminder at all before this job — reminders are the single
 * best-evidenced, lowest-effort lever for reducing no-shows.
 */
export async function sendBookingRemindersJob(): Promise<SendBookingRemindersJobResult> {
  const startedAt = new Date();
  logger.info("Starting booking reminder job.");

  const windowStart = new Date(
    Date.now() + (BOOKING_REMINDER_HOURS_BEFORE - WINDOW_WIDTH_HOURS) * HOUR_MS,
  );
  const windowEnd = new Date(
    Date.now() + BOOKING_REMINDER_HOURS_BEFORE * HOUR_MS,
  );

  const bookings = await bookingRepository.findBookingsNeedingReminder(
    windowStart,
    windowEnd,
  );
  const appUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");

  let sent = 0;
  let failed = 0;

  for (const booking of bookings) {
    try {
      // Mark as sent before emailing — a duplicate send is far less bad
      // than a delivery failure leaving this booking permanently unmarked
      // and re-queued forever.
      await bookingRepository.updateBookingById(booking.id, {
        reminderSentAt: new Date(),
      });

      await emailService.sendBookingReminderVisitor({
        to: booking.lead.email,
        visitorName: booking.lead.name,
        professionalName: booking.professional.fullName,
        serviceTitle: booking.service.title,
        slotStart: booking.slotStart,
        slotEnd: booking.slotEnd,
        timezone: booking.timezone,
        holdId: booking.holdId,
        appUrl,
      });

      sent += 1;
    } catch (error) {
      failed += 1;
      logger.error("Booking reminder send failed.", {
        bookingId: booking.id,
        leadId: booking.leadId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const finishedAt = new Date();

  const summary: SendBookingRemindersJobResult = {
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    totals: {
      scanned: bookings.length,
      sent,
      failed,
    },
  };

  logger.info("Finished booking reminder job.", summary.totals);

  return summary;
}
