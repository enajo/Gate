"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";

import { CalendarsTable } from "@/components/calendars/calendars-table";
import { GoogleConnectButton } from "@/components/calendars/google-connect-button";
import { PageShell } from "@/components/layout/page-shell";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button } from "@/components/ui/button";
import type { CalendarRowValue } from "@/components/calendars/calendar-row";

type CalendarsResponse = {
  calendars?: CalendarRowValue[];
  calendar?: CalendarRowValue;
  error?: string;
};

export default function CalendarsPage() {
  const [calendars, setCalendars] = React.useState<CalendarRowValue[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadCalendars = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/app/google/calendars", {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json()) as CalendarsResponse;

      if (!response.ok) {
        throw new Error(data?.error || "Failed to load calendars.");
      }

      setCalendars(data.calendars ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load calendars.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadCalendars();
  }, [loadCalendars]);

  async function refreshCalendars() {
    setIsRefreshing(true);
    try {
      await loadCalendars();
    } finally {
      setIsRefreshing(false);
    }
  }

  async function patchCalendar(
    calendar: CalendarRowValue,
    payload: Record<string, unknown>,
  ) {
    setError(null);

    try {
      const response = await fetch(`/api/app/google/calendars/${calendar.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as CalendarsResponse;

      if (!response.ok) {
        throw new Error(data?.error || "Failed to update calendar.");
      }

      if (data.calendar) {
        setCalendars((current) =>
          current.map((item) =>
            item.id === data.calendar!.id ? data.calendar! : item,
          ),
        );
      } else {
        await loadCalendars();
      }
    } catch (patchError) {
      setError(
        patchError instanceof Error
          ? patchError.message
          : "Failed to update calendar.",
      );
    }
  }

  async function handleToggleActive(calendar: CalendarRowValue) {
    await patchCalendar(calendar, {
      isActive: !calendar.isActive,
    });
  }

  async function handleToggleConflictCheck(calendar: CalendarRowValue) {
    await patchCalendar(calendar, {
      useForConflictCheck: !calendar.useForConflictCheck,
    });
  }

  async function handleSetDefault(calendar: CalendarRowValue) {
    await patchCalendar(calendar, {
      isDefaultEventCalendar: true,
    });
  }

  return (
    <PageShell
      header={
        <SectionHeading
          title="Calendars"
          description="Connect Google Calendar, choose which calendars block availability, and define the default calendar where booking events are created."
          maxWidth="full"
        />
      }
      actions={
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void refreshCalendars()}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`size-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>

          <GoogleConnectButton returnTo="/app/calendars" />
        </div>
      }
    >
      {isLoading ? (
        <LoadingState
          inset
          title="Loading calendars"
          description="Please wait while we fetch your connected calendars."
        />
      ) : error && calendars.length === 0 ? (
        <ErrorState
          inset
          title="Could not load calendars"
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

          <CalendarsTable
            calendars={calendars}
            onConnect={() => {
              window.location.href = "/app/calendars";
            }}
            onToggleActive={(calendar) => void handleToggleActive(calendar)}
            onToggleConflictCheck={(calendar) =>
              void handleToggleConflictCheck(calendar)
            }
            onSetDefault={(calendar) => void handleSetDefault(calendar)}
          />
        </div>
      )}
    </PageShell>
  );
}