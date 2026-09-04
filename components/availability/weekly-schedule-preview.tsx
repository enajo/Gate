"use client";

import * as React from "react";

import type {
  WeeklyScheduleRule,
  WeeklyScheduleWeekday,
} from "@/components/availability/weekly-schedule-form";

const DAYS: Array<{ value: WeeklyScheduleWeekday; label: string }> = [
  { value: "MONDAY", label: "Mon" },
  { value: "TUESDAY", label: "Tue" },
  { value: "WEDNESDAY", label: "Wed" },
  { value: "THURSDAY", label: "Thu" },
  { value: "FRIDAY", label: "Fri" },
  { value: "SATURDAY", label: "Sat" },
  { value: "SUNDAY", label: "Sun" },
];

const BAR_HEIGHT = 200;
const DEFAULT_RANGE_START = 8 * 60;
const DEFAULT_RANGE_END = 18 * 60;

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function formatHour(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const period = h >= 12 ? "PM" : "AM";
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  return `${displayHour}${period}`;
}

/**
 * Instant, client-side "what does my week look like" view — a pure
 * function of the same draft `rules` state the form below edits, so it
 * updates live as hours change without a save or a network round trip.
 * Deliberately shows raw weekly-rule coverage, not real bookable slots
 * (those depend on a specific service's duration/buffers and aren't known
 * on this professional-wide availability page).
 */
export function WeeklyAvailabilityPreview({
  rules,
}: {
  rules: WeeklyScheduleRule[];
}) {
  const activeRules = React.useMemo(
    () => rules.filter((rule) => rule.active && rule.startTime && rule.endTime),
    [rules],
  );

  if (activeRules.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
        Set your hours below and this preview fills in live.
      </div>
    );
  }

  const allMinutes = activeRules.flatMap((rule) => [
    toMinutes(rule.startTime),
    toMinutes(rule.endTime),
  ]);
  const rangeStart = Math.min(...allMinutes, DEFAULT_RANGE_START);
  const rangeEnd = Math.max(...allMinutes, DEFAULT_RANGE_END);
  const span = Math.max(rangeEnd - rangeStart, 60);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
        This week, at a glance
      </p>

      <div className="flex gap-2">
        <div
          className="flex w-10 shrink-0 flex-col justify-between pb-0.5 text-right text-[10px] text-slate-400"
          style={{ height: BAR_HEIGHT }}
        >
          <span>{formatHour(rangeStart)}</span>
          <span>{formatHour(rangeStart + span / 2)}</span>
          <span>{formatHour(rangeEnd)}</span>
        </div>

        {DAYS.map((day) => {
          const dayRules = activeRules.filter((rule) => rule.weekday === day.value);

          return (
            <div key={day.value} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-500">
                {day.label}
              </span>

              <div
                className="relative w-full rounded-md bg-slate-50"
                style={{ height: BAR_HEIGHT }}
              >
                {dayRules.map((rule) => {
                  const start = toMinutes(rule.startTime);
                  const end = toMinutes(rule.endTime);
                  const top = ((start - rangeStart) / span) * 100;
                  const height = Math.max(((end - start) / span) * 100, 2);

                  return (
                    <div
                      key={rule.id ?? `${rule.weekday}-${rule.startTime}-${rule.endTime}`}
                      className="absolute inset-x-0.5 rounded-md bg-emerald-400/80"
                      style={{ top: `${top}%`, height: `${height}%` }}
                      title={`${rule.startTime} – ${rule.endTime}`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
