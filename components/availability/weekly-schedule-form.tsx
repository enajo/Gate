"use client";

import * as React from "react";
import { Clock3, Copy, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type WeeklyScheduleWeekday =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export type WeeklyScheduleRule = {
  id?: string;
  weekday: WeeklyScheduleWeekday;
  startTime: string;
  endTime: string;
  active: boolean;
};

export interface WeeklyScheduleFormProps
  extends React.HTMLAttributes<HTMLDivElement> {
  value: WeeklyScheduleRule[];
  onChange?: (value: WeeklyScheduleRule[]) => void;
  disabled?: boolean;
}

const weekdays: Array<{
  value: WeeklyScheduleWeekday;
  label: string;
}> = [
  { value: "MONDAY", label: "Monday" },
  { value: "TUESDAY", label: "Tuesday" },
  { value: "WEDNESDAY", label: "Wednesday" },
  { value: "THURSDAY", label: "Thursday" },
  { value: "FRIDAY", label: "Friday" },
  { value: "SATURDAY", label: "Saturday" },
  { value: "SUNDAY", label: "Sunday" },
];

function createEmptyRule(weekday: WeeklyScheduleWeekday): WeeklyScheduleRule {
  return {
    weekday,
    startTime: "09:00",
    endTime: "17:00",
    active: true,
  };
}

function createRuleId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2);
}

function normalizeRules(value: WeeklyScheduleRule[]) {
  return weekdays.map((day) => {
    const matches = value
      .filter((rule) => rule.weekday === day.value)
      .map((rule) => ({
        ...rule,
        id: rule.id || createRuleId(),
      }));

    return {
      weekday: day.value,
      label: day.label,
      rules: matches,
    };
  });
}

function formatTimeRange(startTime: string, endTime: string) {
  return `${startTime} – ${endTime}`;
}

export function WeeklyScheduleForm({
  className,
  value,
  onChange,
  disabled = false,
  ...props
}: WeeklyScheduleFormProps) {
  const days = React.useMemo(() => normalizeRules(value), [value]);

  function updateRules(nextRules: WeeklyScheduleRule[]) {
    onChange?.(nextRules);
  }

  function updateDayRules(
    weekday: WeeklyScheduleWeekday,
    nextDayRules: WeeklyScheduleRule[],
  ) {
    const otherRules = value.filter((rule) => rule.weekday !== weekday);
    updateRules([...otherRules, ...nextDayRules]);
  }

  function addRule(weekday: WeeklyScheduleWeekday) {
    const dayRules = value
      .filter((rule) => rule.weekday === weekday)
      .map((rule) => ({ ...rule, id: rule.id || createRuleId() }));

    updateDayRules(weekday, [
      ...dayRules,
      {
        ...createEmptyRule(weekday),
        id: createRuleId(),
      },
    ]);
  }

  function updateRule(
    weekday: WeeklyScheduleWeekday,
    ruleId: string,
    patch: Partial<WeeklyScheduleRule>,
  ) {
    const dayRules = value
      .filter((rule) => rule.weekday === weekday)
      .map((rule) => ({
        ...rule,
        id: rule.id || createRuleId(),
      }))
      .map((rule) => (rule.id === ruleId ? { ...rule, ...patch } : rule));

    updateDayRules(weekday, dayRules);
  }

  function removeRule(weekday: WeeklyScheduleWeekday, ruleId: string) {
    const dayRules = value
      .filter((rule) => rule.weekday === weekday)
      .map((rule) => ({ ...rule, id: rule.id || createRuleId() }))
      .filter((rule) => rule.id !== ruleId);

    updateDayRules(weekday, dayRules);
  }

  function copyDaySchedule(
    fromWeekday: WeeklyScheduleWeekday,
    toWeekday: WeeklyScheduleWeekday,
  ) {
    const sourceRules = value
      .filter((rule) => rule.weekday === fromWeekday)
      .map((rule) => ({
        ...rule,
        weekday: toWeekday,
        id: createRuleId(),
      }));

    updateDayRules(toWeekday, sourceRules);
  }

  const hasAnyRules = value.length > 0;

  return (
    <div className={cn("space-y-6", className)} {...props}>
      <div>
        <h3 className="text-sm font-semibold text-slate-900">
          Weekly availability
        </h3>
        <p className="text-sm text-slate-500">
          Define the times you are generally available for bookings each week.
        </p>
      </div>

      {!hasAnyRules ? (
        <EmptyState
          inset
          title="No weekly availability yet"
          description="Add your first working day and time range to start generating slots."
          action={
            <Button
              type="button"
              onClick={() => addRule("MONDAY")}
              disabled={disabled}
            >
              <Plus className="size-4" />
              Add Monday hours
            </Button>
          }
        />
      ) : null}

      <div className="space-y-4">
        {days.map((day) => {
          const hasRules = day.rules.length > 0;

          return (
            <Card key={day.weekday} className="rounded-2xl">
              <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
                <div>
                  <CardTitle className="text-base">{day.label}</CardTitle>
                  <p className="mt-1 text-sm text-slate-500">
                    {hasRules
                      ? `${day.rules.length} time range${
                          day.rules.length === 1 ? "" : "s"
                        } configured`
                      : "No hours set"}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addRule(day.weekday)}
                  disabled={disabled}
                >
                  <Plus className="size-4" />
                  Add hours
                </Button>
              </CardHeader>

              <CardContent className="space-y-4">
                {!hasRules ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    No availability set for {day.label.toLowerCase()}.
                  </div>
                ) : null}

                {day.rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[1fr_1fr_auto]"
                  >
                    <div className="space-y-2">
                      <Label>Start time</Label>
                      <Input
                        type="time"
                        value={rule.startTime}
                        disabled={disabled || !rule.active}
                        onChange={(event) =>
                          updateRule(day.weekday, rule.id!, {
                            startTime: event.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>End time</Label>
                      <Input
                        type="time"
                        value={rule.endTime}
                        disabled={disabled || !rule.active}
                        onChange={(event) =>
                          updateRule(day.weekday, rule.id!, {
                            endTime: event.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="flex items-end gap-2">
                      <Button
                        type="button"
                        variant={rule.active ? "outline" : "secondary"}
                        onClick={() =>
                          updateRule(day.weekday, rule.id!, {
                            active: !rule.active,
                          })
                        }
                        disabled={disabled}
                      >
                        {rule.active ? "Active" : "Inactive"}
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => removeRule(day.weekday, rule.id!)}
                        disabled={disabled}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>

                    <div className="lg:col-span-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Clock3 className="size-4" />
                        <span className="font-medium text-slate-900">
                          {formatTimeRange(rule.startTime, rule.endTime)}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {weekdays
                          .filter((targetDay) => targetDay.value !== day.weekday)
                          .slice(0, 3)
                          .map((targetDay) => (
                            <Button
                              key={`${day.weekday}-${targetDay.value}`}
                              type="button"
                              variant="ghost"
                              className="h-8 px-2 text-xs"
                              onClick={() =>
                                copyDaySchedule(day.weekday, targetDay.value)
                              }
                              disabled={disabled || !rule.active}
                            >
                              <Copy className="size-3.5" />
                              Copy to {targetDay.label}
                            </Button>
                          ))}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}