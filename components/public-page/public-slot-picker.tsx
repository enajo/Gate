"use client";

import * as React from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PublicBookableSlot = {
  start: string;
  end: string;
};

type PublicBlockedRange = {
  start: string;
  end: string;
};

type PublicSlotsResponse = {
  slots: PublicBookableSlot[];
  blockedRanges?: PublicBlockedRange[];
};

export interface PublicSlotPickerProps {
  className?: string;
  slug: string;
  serviceId: string | null;
  isUnlocked?: boolean;
  timezone?: string;
  daysToShow?: number;
  title?: string;
  description?: string;
  selectedSlotStart?: string | null;
  onSelectSlot?: (slot: PublicBookableSlot) => void;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function getDateKey(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";

  return `${year}-${month}-${day}`;
}

function formatDayLabel(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatTimeLabel(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function buildVisibleDays(daysToShow: number) {
  const today = startOfDay(new Date());

  return Array.from({ length: daysToShow }).map((_, index) =>
    addDays(today, index),
  );
}

export function PublicSlotPicker({
  className,
  slug,
  serviceId,
  isUnlocked = false,
  timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  daysToShow = 14,
  title = "Choose a time",
  description = "Now that you’re qualified, pick an available date and time to continue.",
  selectedSlotStart,
  onSelectSlot,
  ...props
}: PublicSlotPickerProps) {
  const visibleDays = React.useMemo(
    () => buildVisibleDays(daysToShow),
    [daysToShow],
  );

  const rangeStart = React.useMemo(
    () => startOfDay(visibleDays[0] ?? new Date()).toISOString(),
    [visibleDays],
  );

  const rangeEnd = React.useMemo(
    () => endOfDay(visibleDays[visibleDays.length - 1] ?? new Date()).toISOString(),
    [visibleDays],
  );

  const [slots, setSlots] = React.useState<PublicBookableSlot[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedDateKey, setSelectedDateKey] = React.useState<string | null>(
    null,
  );
  const [internalSelectedSlotStart, setInternalSelectedSlotStart] =
    React.useState<string | null>(selectedSlotStart ?? null);

  React.useEffect(() => {
    if (selectedSlotStart !== undefined) {
      setInternalSelectedSlotStart(selectedSlotStart ?? null);
    }
  }, [selectedSlotStart]);

  React.useEffect(() => {
    if (!isUnlocked || !serviceId) {
      setSlots([]);
      setError(null);
      setSelectedDateKey(null);
      return;
    }

    let cancelled = false;

    async function loadSlots() {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          slug,
          ...(serviceId != null ? { serviceId } : {}),
          startDate: rangeStart,
          endDate: rangeEnd,
          timezone,
        });

        const response = await fetch(`/api/public/slots?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
        });

        const data = (await response.json()) as
          | PublicSlotsResponse
          | { error?: string };

        if (!response.ok) {
          throw new Error((data as { error?: string }).error || "Failed to load available slots.");
        }

        if (cancelled) {
          return;
        }

        const nextSlots = (data as PublicSlotsResponse).slots ?? [];
        setSlots(nextSlots);

        const grouped = groupSlotsByDate(nextSlots, timezone);
        const firstAvailableDate = Object.keys(grouped)[0] ?? null;

        setSelectedDateKey((current) =>
          current && grouped[current] ? current : firstAvailableDate,
        );
      } catch (fetchError) {
        if (!cancelled) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Failed to load available slots.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSlots();

    return () => {
      cancelled = true;
    };
  }, [isUnlocked, rangeEnd, rangeStart, serviceId, slug, timezone]);

  const slotsByDate = React.useMemo(
    () => groupSlotsByDate(slots, timezone),
    [slots, timezone],
  );

  const days = React.useMemo(
    () =>
      visibleDays.map((date) => {
        const key = getDateKey(date, timezone);
        return {
          key,
          date,
          count: slotsByDate[key]?.length ?? 0,
        };
      }),
    [slotsByDate, timezone, visibleDays],
  );

  const selectedDaySlots = selectedDateKey ? slotsByDate[selectedDateKey] ?? [] : [];

  const currentSelectedSlotStart =
    selectedSlotStart !== undefined
      ? selectedSlotStart
      : internalSelectedSlotStart;

  if (!isUnlocked) {
    return null;
  }

  function handleSelectSlot(slot: PublicBookableSlot) {
    if (selectedSlotStart === undefined) {
      setInternalSelectedSlotStart(slot.start);
    }

    onSelectSlot?.(slot);
  }

  return (
    <section
      id="booking"
      className={cn("border-b border-slate-200 bg-white", className)}
      {...props}
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="secondary" className="gap-1">
            <CalendarDays className="size-3.5" />
            Available slots
          </Badge>

          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            {title}
          </h2>

          <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            {description}
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Select a date</CardTitle>
              <CardDescription>
                Pick from the next {daysToShow} days of availability.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {isLoading ? (
                <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center">
                  <Loader2 className="size-6 animate-spin text-slate-500" />
                  <p className="mt-3 text-sm text-slate-500">
                    Loading available dates...
                  </p>
                </div>
              ) : error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
                  {error}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {days.map((day) => {
                    const isActive = selectedDateKey === day.key;
                    const hasSlots = day.count > 0;

                    return (
                      <button
                        key={day.key}
                        type="button"
                        className={cn(
                          "rounded-xl border px-4 py-4 text-left transition-colors",
                          isActive
                            ? "border-slate-900 bg-slate-900 text-white"
                            : hasSlots
                              ? "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                              : "border-slate-200 bg-slate-50 text-slate-400",
                        )}
                        disabled={!hasSlots}
                        onClick={() => setSelectedDateKey(day.key)}
                      >
                        <p className="text-sm font-semibold">
                          {formatDayLabel(day.date, timezone)}
                        </p>
                        <p
                          className={cn(
                            "mt-1 text-xs",
                            isActive
                              ? "text-slate-200"
                              : hasSlots
                                ? "text-slate-500"
                                : "text-slate-400",
                          )}
                        >
                          {hasSlots
                            ? `${day.count} slot${day.count === 1 ? "" : "s"} available`
                            : "No availability"}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Select a time</CardTitle>
              <CardDescription>
                Choose one of the open times for your selected date.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {isLoading ? (
                <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center">
                  <Loader2 className="size-6 animate-spin text-slate-500" />
                  <p className="mt-3 text-sm text-slate-500">
                    Loading time slots...
                  </p>
                </div>
              ) : error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
                  {error}
                </div>
              ) : selectedDaySlots.length === 0 ? (
                <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center">
                  <Clock3 className="size-6 text-slate-400" />
                  <p className="mt-3 text-sm font-medium text-slate-700">
                    No time slots available
                  </p>
                  <p className="mt-1 max-w-sm text-sm text-slate-500">
                    Choose another date to see available times.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {selectedDaySlots.map((slot) => {
                    const isSelected = currentSelectedSlotStart === slot.start;

                    return (
                      <Button
                        key={slot.start}
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        className={cn(
                          "h-auto justify-between rounded-xl px-4 py-4",
                          isSelected && "shadow-sm",
                        )}
                        onClick={() => handleSelectSlot(slot)}
                      >
                        <span className="flex items-center gap-2">
                          <Clock3 className="size-4" />
                          {formatTimeLabel(new Date(slot.start), timezone)}
                        </span>

                        {isSelected ? <CheckCircle2 className="size-4" /> : null}
                      </Button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

function groupSlotsByDate(slots: PublicBookableSlot[], timezone: string) {
  return slots.reduce<Record<string, PublicBookableSlot[]>>((acc, slot) => {
    const key = getDateKey(new Date(slot.start), timezone);

    if (!acc[key]) {
      acc[key] = [];
    }

    acc[key].push(slot);
    return acc;
  }, {});
}