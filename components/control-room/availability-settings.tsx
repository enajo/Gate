"use client";

import { useCallback, useEffect, useState } from "react";
import { Calendar, Clock, Loader2, Plus, Trash2 } from "lucide-react";

type Weekday =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

const WEEKDAYS: { value: Weekday; label: string; short: string }[] = [
  { value: "MONDAY", label: "Monday", short: "Mon" },
  { value: "TUESDAY", label: "Tuesday", short: "Tue" },
  { value: "WEDNESDAY", label: "Wednesday", short: "Wed" },
  { value: "THURSDAY", label: "Thursday", short: "Thu" },
  { value: "FRIDAY", label: "Friday", short: "Fri" },
  { value: "SATURDAY", label: "Saturday", short: "Sat" },
  { value: "SUNDAY", label: "Sunday", short: "Sun" },
];

type AvailabilityRule = {
  id: string;
  weekday: Weekday;
  startTime: string;
  endTime: string;
  active: boolean;
};

// Per-weekday UI state
type DayState = {
  enabled: boolean;
  startTime: string;
  endTime: string;
  ruleId: string | null;  // null = not yet saved
  saving: boolean;
};

const DEFAULT_START = "09:00";
const DEFAULT_END = "17:00";

function buildDayStates(rules: AvailabilityRule[]): Record<Weekday, DayState> {
  const map = {} as Record<Weekday, DayState>;

  for (const day of WEEKDAYS) {
    const rule = rules.find((r) => r.weekday === day.value && r.active);
    map[day.value] = {
      enabled: Boolean(rule),
      startTime: rule?.startTime ?? DEFAULT_START,
      endTime: rule?.endTime ?? DEFAULT_END,
      ruleId: rule?.id ?? null,
      saving: false,
    };
  }

  return map;
}

export function AvailabilitySettings() {
  const [days, setDays] = useState<Record<Weekday, DayState> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Load rules on mount ────────────────────────────────────────────────────

  const loadRules = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/api/app/availability/rules");
      if (!res.ok) throw new Error("Failed to load availability.");
      const data = (await res.json()) as { rules: AvailabilityRule[] };
      setDays(buildDayStates(data.rules));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRules();
  }, [loadRules]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  function setDaySaving(weekday: Weekday, saving: boolean) {
    setDays((current) => {
      if (!current) return current;
      return { ...current, [weekday]: { ...current[weekday], saving } };
    });
  }

  // ── Toggle a day on/off ────────────────────────────────────────────────────

  async function toggleDay(weekday: Weekday) {
    if (!days) return;
    const day = days[weekday];
    if (day.saving) return;

    setDaySaving(weekday, true);
    setError(null);

    try {
      if (day.enabled) {
        // Turning off — delete the rule
        if (day.ruleId) {
          const res = await fetch(
            `/api/app/availability/rules/${day.ruleId}`,
            { method: "DELETE" },
          );
          if (!res.ok) throw new Error("Failed to remove day.");
        }
        setDays((current) => {
          if (!current) return current;
          return {
            ...current,
            [weekday]: {
              ...current[weekday],
              enabled: false,
              ruleId: null,
              saving: false,
            },
          };
        });
      } else {
        // Turning on — create a rule with current times
        const res = await fetch("/api/app/availability/rules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            weekday,
            startTime: day.startTime,
            endTime: day.endTime,
          }),
        });
        if (!res.ok) {
          const payload = (await res.json()) as { error?: string };
          throw new Error(payload.error ?? "Failed to enable day.");
        }
        const data = (await res.json()) as { rule: AvailabilityRule };
        setDays((current) => {
          if (!current) return current;
          return {
            ...current,
            [weekday]: {
              ...current[weekday],
              enabled: true,
              ruleId: data.rule.id,
              saving: false,
            },
          };
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update schedule.");
      setDaySaving(weekday, false);
    }
  }

  // ── Update time window ─────────────────────────────────────────────────────

  async function saveTimeWindow(
    weekday: Weekday,
    startTime: string,
    endTime: string,
  ) {
    if (!days) return;
    const day = days[weekday];
    if (day.saving || !day.enabled) return;

    // Optimistic local update
    setDays((current) => {
      if (!current) return current;
      return {
        ...current,
        [weekday]: { ...current[weekday], startTime, endTime, saving: true },
      };
    });
    setError(null);

    try {
      if (day.ruleId) {
        // Update existing
        const res = await fetch(
          `/api/app/availability/rules/${day.ruleId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ startTime, endTime }),
          },
        );
        if (!res.ok) {
          const payload = (await res.json()) as { error?: string };
          throw new Error(payload.error ?? "Failed to update time.");
        }
      } else {
        // No rule yet — create one
        const res = await fetch("/api/app/availability/rules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ weekday, startTime, endTime }),
        });
        if (!res.ok) {
          const payload = (await res.json()) as { error?: string };
          throw new Error(payload.error ?? "Failed to save time.");
        }
        const data = (await res.json()) as { rule: AvailabilityRule };
        setDays((current) => {
          if (!current) return current;
          return {
            ...current,
            [weekday]: { ...current[weekday], ruleId: data.rule.id },
          };
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save time.");
    } finally {
      setDaySaving(weekday, false);
    }
  }

  // ── Local time change (not yet saved) ─────────────────────────────────────

  function handleTimeChange(
    weekday: Weekday,
    field: "startTime" | "endTime",
    value: string,
  ) {
    setDays((current) => {
      if (!current) return current;
      return {
        ...current,
        [weekday]: { ...current[weekday], [field]: value },
      };
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <section id="availability" className="scroll-mt-20 space-y-6">
      <div className="card-section">
        <div className="flex items-center gap-3">
          <Calendar className="size-5 text-brand-amber" />
          <div>
            <p className="text-[15px] font-medium text-ink">
              Weekly Schedule
            </p>
            <p className="mt-1 text-[12px] text-gray-500">
              Set which days and hours you accept bookings. Changes take effect
              immediately on your public page.
            </p>
          </div>
        </div>

        <div className="mt-5">
        {error ? (
          <p className="mb-4 text-[13px] text-red-500">{error}</p>
        ) : null}

        {isLoading || !days ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin text-brand-amber" />
          </div>
        ) : (
          <div className="max-w-md space-y-2">
            {WEEKDAYS.map((weekday) => {
              const day = days[weekday.value];
              const isEnabled = day.enabled;

              return (
                <div
                  key={weekday.value}
                  className={
                    isEnabled
                      ? "flex flex-wrap items-center gap-3 rounded-lg border border-brand-amber bg-brand-amber-faint px-4 py-2.5"
                      : "flex flex-wrap items-center gap-3 rounded-lg border border-warm-border-mid bg-white/70 px-4 py-2.5"
                  }
                >
                  {/* Day toggle */}
                  <button
                    type="button"
                    onClick={() => void toggleDay(weekday.value)}
                    disabled={day.saving}
                    className="flex items-center gap-3 disabled:opacity-60"
                  >
                    <span
                      className={
                        isEnabled
                          ? "relative h-6 w-11 rounded-full bg-brand-amber"
                          : "relative h-6 w-11 rounded-full bg-warm-border-lighter"
                      }
                    >
                      <span
                        className={
                          isEnabled
                            ? "absolute right-1 top-1 size-4 rounded-full bg-white"
                            : "absolute left-1 top-1 size-4 rounded-full bg-white"
                        }
                      />
                    </span>

                    <span className="w-[3.5rem] text-left text-[13px] font-medium text-ink">
                      {weekday.label}
                    </span>
                  </button>

                  {/* Time range — only when enabled */}
                  {isEnabled ? (
                    <div className="flex flex-1 items-center gap-2">
                      <Clock className="size-3.5 text-gray-400" />

                      <input
                        type="time"
                        value={day.startTime}
                        onChange={(e) =>
                          handleTimeChange(weekday.value, "startTime", e.target.value)
                        }
                        onBlur={() =>
                          void saveTimeWindow(weekday.value, day.startTime, day.endTime)
                        }
                        disabled={day.saving}
                        className="h-8 rounded-lg border border-warm-border-soft bg-white px-2 text-[12px] text-ink disabled:opacity-60"
                      />

                      <span className="text-[12px] text-gray-400">–</span>

                      <input
                        type="time"
                        value={day.endTime}
                        onChange={(e) =>
                          handleTimeChange(weekday.value, "endTime", e.target.value)
                        }
                        onBlur={() =>
                          void saveTimeWindow(weekday.value, day.startTime, day.endTime)
                        }
                        disabled={day.saving}
                        className="h-8 rounded-lg border border-warm-border-soft bg-white px-2 text-[12px] text-ink disabled:opacity-60"
                      />

                      {day.saving ? (
                        <Loader2 className="size-3.5 animate-spin text-brand-amber" />
                      ) : null}
                    </div>
                  ) : (
                    <span className="ml-1 text-[12px] text-gray-400">
                      Unavailable
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-5 text-[12px] text-gray-500">
          Times are in the timezone set in your profile. Visitors see slots
          converted to their local time.
        </p>
        </div>
      </div>
    </section>
  );
}
