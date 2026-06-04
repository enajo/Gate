"use client";

import * as React from "react";

import {
  HoldsInbox,
  type HoldInboxItem,
} from "@/components/bookings/holds-inbox";
import { BookingSummary, type BookingSummaryValue } from "@/components/bookings/booking-summary";
import { BookingsTable, type BookingsTableValue } from "@/components/bookings/bookings-table";
import { PageShell } from "@/components/layout/page-shell";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { SectionHeading } from "@/components/shared/section-heading";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type BookingsResponse = {
  bookings?: BookingsTableValue[];
  error?: string;
};

type HoldsResponse = {
  holds?: RawHold[];
  error?: string;
};

type RawHold = {
  id: string;
  slotStart: string;
  slotEnd: string;
  expiresAt: string;
  timezone?: string | null;
  status: string;
  lead?: {
    name?: string | null;
    email?: string | null;
  } | null;
  service?: {
    title?: string | null;
    manualApprovalRequired?: boolean;
  } | null;
};

function rawHoldToInboxItem(h: RawHold): HoldInboxItem {
  return {
    id: h.id,
    slotStart: h.slotStart,
    slotEnd: h.slotEnd,
    expiresAt: h.expiresAt,
    timezone: h.timezone,
    clientName: h.lead?.name ?? null,
    clientEmail: h.lead?.email ?? null,
    serviceTitle: h.service?.title ?? null,
    requiresApproval: h.service?.manualApprovalRequired ?? true,
  };
}

export default function BookingsPage() {
  const [bookings, setBookings] = React.useState<BookingsTableValue[]>([]);
  const [holds, setHolds] = React.useState<HoldInboxItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [selectedBooking, setSelectedBooking] =
    React.useState<BookingsTableValue | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [bookingsRes, holdsRes] = await Promise.all([
        fetch("/api/app/bookings", { cache: "no-store" }),
        fetch("/api/app/holds", { cache: "no-store" }),
      ]);

      const [bookingsData, holdsData] = await Promise.all([
        bookingsRes.json() as Promise<BookingsResponse>,
        holdsRes.json() as Promise<HoldsResponse>,
      ]);

      if (!bookingsRes.ok) {
        throw new Error(bookingsData?.error ?? "Failed to load bookings.");
      }

      setBookings(bookingsData.bookings ?? []);

      // Holds endpoint is best-effort — don't fail the whole page
      if (holdsRes.ok) {
        setHolds((holdsData.holds ?? []).map(rawHoldToInboxItem));
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load bookings.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleApprove(holdId: string) {
    const res = await fetch(`/api/app/holds/${holdId}/approve`, {
      method: "POST",
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      throw new Error(data.error ?? "Failed to approve booking.");
    }
    // Remove from holds, reload bookings
    setHolds((prev) => prev.filter((h) => h.id !== holdId));
    const bookingsRes = await fetch("/api/app/bookings", { cache: "no-store" });
    const bookingsData = (await bookingsRes.json()) as BookingsResponse;
    if (bookingsRes.ok) setBookings(bookingsData.bookings ?? []);
  }

  async function handleDecline(holdId: string) {
    const res = await fetch(`/api/app/holds/${holdId}/decline`, {
      method: "POST",
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      throw new Error(data.error ?? "Failed to decline booking.");
    }
    setHolds((prev) => prev.filter((h) => h.id !== holdId));
  }

  function handleView(booking: BookingsTableValue) {
    setSelectedBooking(booking);
    setDialogOpen(true);
  }

  function mapBookingToSummary(
    booking: BookingsTableValue | null,
  ): BookingSummaryValue | null {
    if (!booking) return null;
    return {
      id: booking.id,
      serviceTitle: booking.serviceTitle ?? null,
      clientName: booking.clientName ?? null,
      clientEmail: booking.clientEmail ?? null,
      slotStart: booking.slotStart,
      slotEnd: booking.slotEnd,
      timezone: booking.timezone ?? null,
      status: booking.status,
    };
  }

  return (
    <PageShell
      header={
        <SectionHeading
          title="Bookings"
          description="Review confirmed sessions, pending approval requests, and the overall output of your Gatekeeper flow."
          maxWidth="full"
        />
      }
    >
      {isLoading ? (
        <LoadingState
          inset
          title="Loading bookings"
          description="Please wait while we fetch your booking activity."
        />
      ) : error && bookings.length === 0 && holds.length === 0 ? (
        <ErrorState
          inset
          title="Could not load bookings"
          description={error}
        />
      ) : (
        <div className="space-y-8">
          {error ? (
            <ErrorState
              inset
              title="Something went wrong"
              description={error}
            />
          ) : null}

          {/* ── Pending approval inbox ────────────────────────────────────── */}
          {holds.length > 0 ? (
            <section>
              <div className="mb-4 flex items-center gap-2">
                <h2 className="text-[15px] font-semibold text-slate-900">
                  Pending Requests
                </h2>
                <span className="inline-flex size-5 items-center justify-center rounded-full bg-amber-500 text-[11px] font-bold text-white">
                  {holds.length}
                </span>
              </div>
              <HoldsInbox
                holds={holds}
                onApprove={handleApprove}
                onDecline={handleDecline}
              />
            </section>
          ) : null}

          {/* ── Confirmed bookings table ──────────────────────────────────── */}
          <section>
            {holds.length > 0 ? (
              <h2 className="mb-4 text-[15px] font-semibold text-slate-900">
                Confirmed Bookings
              </h2>
            ) : null}
            <BookingsTable bookings={bookings} onView={handleView} />
          </section>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Booking details</DialogTitle>
            <DialogDescription>
              Review the key details for this booking record.
            </DialogDescription>
          </DialogHeader>

          {selectedBooking ? (
            <BookingSummary booking={mapBookingToSummary(selectedBooking)!} />
          ) : null}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
