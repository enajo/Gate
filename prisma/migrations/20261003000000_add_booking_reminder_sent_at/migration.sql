-- Migration: add_booking_reminder_sent_at
-- Pre-appointment reminder emails: Gate sends none today. Tracks whether a
-- booking has already had its reminder sent, so the reminder job never
-- double-sends on a re-run.
--
--   bookings.reminder_sent_at   NULL = reminder not sent yet.

ALTER TABLE "bookings"
  ADD COLUMN "reminder_sent_at" TIMESTAMP(3);
