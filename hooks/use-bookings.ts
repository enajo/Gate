"use client";

import * as React from "react";

export type BookingItem = {
  id: string;
  serviceTitle?: string | null;
  clientName?: string | null;
  clientEmail?: string | null;
  slotStart: string;
  slotEnd: string;
  timezone?: string | null;
  status:
    | "PENDING_CODE"
    | "CODE_INVALID"
    | "CONFIRMED"
    | "EVENT_CREATION_PENDING"
    | "EVENT_CREATED"
    | "CANCELLED";
  calendarStatus?: "PENDING" | "CREATED" | "FAILED" | null;
};

type BookingsResponse = {
  bookings?: BookingItem[];
  error?: string;
};

export function useBookings(options?: { upcoming?: boolean }) {
  const [bookings, setBookings] = React.useState<BookingItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadBookings = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      if (options?.upcoming) {
        params.set("upcoming", "true");
      }

      const query = params.toString();
      const response = await fetch(
        `/api/app/bookings${query ? `?${query}` : ""}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

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
  }, [options?.upcoming]);

  React.useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  return {
    bookings,
    isLoading,
    error,
    refetch: loadBookings,
  };
}