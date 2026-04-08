"use client";

import * as React from "react";
import { CalendarOff, Pencil, Trash2 } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type BlockedDateItem = {
  id: string;
  startDateTime: string;
  endDateTime: string;
  reason?: string | null;
};

export interface BlockedDatesListProps
  extends React.HTMLAttributes<HTMLDivElement> {
  blockedDates: BlockedDateItem[];
  timezone?: string;
  onEdit?: (blockedDate: BlockedDateItem) => void;
  onDelete?: (blockedDate: BlockedDateItem) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

function formatBlockedRange(
  startDateTime: string,
  endDateTime: string,
  timezone: string,
) {
  const start = new Date(startDateTime);
  const end = new Date(endDateTime);

  const dayFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
  });

  const sameDay =
    dayFormatter.format(start) === dayFormatter.format(end);

  return {
    dayLabel: sameDay
      ? dayFormatter.format(start)
      : `${dayFormatter.format(start)} → ${dayFormatter.format(end)}`,
    timeLabel: `${timeFormatter.format(start)} – ${timeFormatter.format(end)}`,
  };
}

export function BlockedDatesList({
  className,
  blockedDates,
  timezone = "Europe/Berlin",
  onEdit,
  onDelete,
  emptyTitle = "No blocked dates",
  emptyDescription = "Blocked dates let you remove one-off time ranges from your normal weekly availability.",
  ...props
}: BlockedDatesListProps) {
  const sortedBlockedDates = blockedDates
    .slice()
    .sort(
      (a, b) =>
        new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime(),
    );

  if (!sortedBlockedDates.length) {
    return (
      <EmptyState
        className={className}
        icon={<CalendarOff className="size-5 text-slate-500" />}
        title={emptyTitle}
        description={emptyDescription}
        inset
        {...props}
      />
    );
  }

  return (
    <div className={cn("space-y-3", className)} {...props}>
      {sortedBlockedDates.map((blockedDate) => {
        const formatted = formatBlockedRange(
          blockedDate.startDateTime,
          blockedDate.endDateTime,
          timezone,
        );

        return (
          <Card key={blockedDate.id} className="rounded-2xl">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">Blocked</Badge>
                  <Badge variant="outline">{formatted.dayLabel}</Badge>
                </div>

                <p className="text-sm font-semibold text-slate-900">
                  {formatted.timeLabel}
                </p>

                <p className="text-sm text-slate-500">
                  {blockedDate.reason?.trim() || "No reason provided."}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onEdit?.(blockedDate)}
                >
                  <Pencil className="size-4" />
                  Edit
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => onDelete?.(blockedDate)}
                >
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}