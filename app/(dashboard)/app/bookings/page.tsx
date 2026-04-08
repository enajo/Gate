"use client";

import * as React from "react";

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

export default function BookingsPage() {
  const [bookings, setBookings] = React.useState<BookingsTableValue[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [selectedBooking, setSelectedBooking] =
    React.useState<BookingsTableValue | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const loadBookings = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/app/bookings", {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json()) as BookingsResponse;

      if (!response.ok) {
        throw new Error(data?.error || "Failed to load bookings.");
      }

      setBookings(data.bookings ?? []);
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
    void loadBookings();
  }, [loadBookings]);

  function handleView(booking: BookingsTableValue) {
    setSelectedBooking(booking);
    setDialogOpen(true);
  }

  function mapBookingToSummary(
    booking: BookingsTableValue | null,
  ): BookingSummaryValue | null {
    if (!booking) {
      return null;
    }

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
          description="Review confirmed sessions, pending booking states, and the overall output of your Gatekeeper flow."
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
      ) : error && bookings.length === 0 ? (
        <ErrorState
          inset
          title="Could not load bookings"
          description={error}
        />
      ) : (
        <div className="space-y-4">
          {error ? (
            <ErrorState
              inset
              title="Something went wrong"
              description={error}
            />
          ) : null}

          <BookingsTable bookings={bookings} onView={handleView} />
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