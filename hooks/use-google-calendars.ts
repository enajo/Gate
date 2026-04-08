"use client";

import * as React from "react";

export type GoogleCalendarItem = {
  id: string;
  provider: "GOOGLE" | "OUTLOOK";
  calendarName?: string | null;
  providerEmail?: string | null;
  calendarTimeZone?: string | null;
  syncStatus:
    | "PENDING"
    | "CONNECTED"
    | "SYNCING"
    | "ERROR"
    | "EXPIRED"
    | "DISCONNECTED";
  isActive: boolean;
  useForConflictCheck: boolean;
  isDefaultEventCalendar: boolean;
  lastSyncedAt?: string | null;
};

type GoogleCalendarsResponse = {
  calendars?: GoogleCalendarItem[];
  calendar?: GoogleCalendarItem;
  error?: string;
};

export function useGoogleCalendars() {
  const [calendars, setCalendars] = React.useState<GoogleCalendarItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadCalendars = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/app/google/calendars", {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json()) as GoogleCalendarsResponse;

      if (!response.ok) {
        throw new Error(data?.error || "Failed to load Google calendars.");
      }

      setCalendars(data.calendars ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load Google calendars.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadCalendars();
  }, [loadCalendars]);

  async function patchCalendar(
    id: string,
    input: {
      isActive?: boolean;
      useForConflictCheck?: boolean;
      isDefaultEventCalendar?: boolean;
    },
  ) {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/app/google/calendars/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      const data = (await response.json()) as GoogleCalendarsResponse;

      if (!response.ok) {
        throw new Error(data?.error || "Failed to update Google calendar.");
      }

      if (data.calendar) {
        setCalendars((current) =>
          current.map((item) => (item.id === id ? data.calendar! : item)),
        );
      } else {
        await loadCalendars();
      }

      return data.calendar ?? null;
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to update Google calendar.",
      );
      throw saveError;
    } finally {
      setIsSaving(false);
    }
  }

  async function setCalendarActiveState(id: string, isActive: boolean) {
    return patchCalendar(id, { isActive });
  }

  async function setConflictCheckState(
    id: string,
    useForConflictCheck: boolean,
  ) {
    return patchCalendar(id, { useForConflictCheck });
  }

  async function setDefaultEventCalendar(id: string) {
    return patchCalendar(id, { isDefaultEventCalendar: true });
  }

  return {
    calendars,
    isLoading,
    isSaving,
    error,
    refetch: loadCalendars,
    setCalendarActiveState,
    setConflictCheckState,
    setDefaultEventCalendar,
  };
}