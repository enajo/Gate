import { formatInTimeZone } from "date-fns-tz";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

import { bookingRepository } from "@/server/repositories/booking.repository";

type PageProps = {
  params: Promise<{ holdId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { holdId } = await params;
  const hold = await bookingRepository.findHoldWithRelationsById(holdId);
  if (!hold) return { title: "Booking Not Found" };

  return {
    title: `Booking — ${hold.service.title}`,
  };
}

export default async function BookingStatusPage({ params }: PageProps) {
  const { holdId } = await params;
  const hold = await bookingRepository.findHoldWithRelationsById(holdId);

  if (!hold || !hold.lead) notFound();

  const booking = hold.booking ?? null;
  const timezone = "UTC"; // No professional join here — keep it simple
  const service = hold.service;
  const lead = hold.lead;

  // Determine human-readable status
  const holdExpired = hold.status === "EXPIRED" || hold.expiresAt <= new Date();
  const holdReleased = hold.status === "RELEASED";
  const holdConverted = hold.status === "CONVERTED" || Boolean(booking);
  const bookingConfirmed = booking?.status === "CONFIRMED"
    || booking?.status === "EVENT_CREATION_PENDING"
    || booking?.status === "EVENT_CREATED";
  const bookingCancelled = booking?.status === "CANCELLED";

  // Calendar event (if any)
  const primaryEvent =
    (booking as (typeof booking) & { calendarEvents?: Array<{ meetingUrl?: string | null; eventUrl?: string | null }> })
      ?.calendarEvents?.[0] ?? null;
  const meetingUrl = primaryEvent?.meetingUrl ?? null;

  const slotLabel = formatInTimeZone(hold.slotStart, timezone, "EEEE, MMMM d, yyyy")
    + " · "
    + formatInTimeZone(hold.slotStart, timezone, "h:mm a")
    + "–"
    + formatInTimeZone(hold.slotEnd, timezone, "h:mm a");

  // Derive status badge
  let statusLabel = "Pending Review";
  let statusColor = "bg-amber-100 text-amber-700";
  let headline = "Your request is under review.";
  let detail = `${lead.name ? `Hi ${lead.name.split(" ")[0]}, your` : "Your"} booking request for ${service.title} is being reviewed. You'll receive an email once confirmed.`;

  if (bookingCancelled) {
    statusLabel = "Cancelled";
    statusColor = "bg-red-100 text-red-700";
    headline = "This booking has been cancelled.";
    detail = "If you have questions, please reach out directly.";
  } else if (holdReleased && !booking) {
    statusLabel = "Declined";
    statusColor = "bg-red-100 text-red-700";
    headline = "Your request was not accepted.";
    detail = "This slot has been released. You're welcome to submit a new request.";
  } else if (holdExpired && !booking) {
    statusLabel = "Expired";
    statusColor = "bg-slate-100 text-slate-600";
    headline = "Your slot hold has expired.";
    detail = "The temporary hold on this slot has expired. Please go back and select a new time.";
  } else if (holdConverted && bookingConfirmed) {
    statusLabel = "Confirmed ✓";
    statusColor = "bg-emerald-100 text-emerald-700";
    headline = "Your booking is confirmed!";
    detail = `${lead.name ? `Hi ${lead.name.split(" ")[0]}, your` : "Your"} session for ${service.title} is confirmed. A calendar invite has been sent to ${lead.email}.`;
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#F9FAFB_0%,#F3EDE2_100%)] px-4 py-16">
      <div className="mx-auto max-w-md">
        {/* Logo */}
        <p className="mb-10 text-center text-xs font-bold uppercase tracking-[0.22em] text-ink">
          GATE
        </p>

        <div className="rounded-card border border-warm-border bg-white/80 p-8 shadow-warm-xl backdrop-blur-xl">
          {/* Status badge */}
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusColor}`}
          >
            {statusLabel}
          </span>

          <h1 className="mt-5 text-[26px] font-semibold leading-tight tracking-[-0.04em] text-ink">
            {headline}
          </h1>

          <p className="mt-3 text-[14px] leading-7 text-gray-500">{detail}</p>

          {/* Slot summary */}
          <div className="mt-6 rounded-inner border border-warm-border bg-gray-50 px-4 py-3">
            <p className="text-[13px] font-semibold text-ink">
              {service.title}
            </p>
            <p className="mt-1 text-[13px] text-gray-500">{slotLabel}</p>
          </div>

          {/* Meeting link for confirmed bookings */}
          {bookingConfirmed && meetingUrl ? (
            <a
              href={meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-ink py-3 text-[14px] font-semibold text-white transition hover:bg-ink-dark"
            >
              Join Meeting →
            </a>
          ) : null}
        </div>

        <p className="mt-6 text-center text-[12px] text-gray-400">
          Powered by <span className="font-semibold">GATE</span>
        </p>
      </div>
    </main>
  );
}
