"use client";

import * as React from "react";
import { CheckCircle2, RefreshCw } from "lucide-react";

import { SyncStatusBadge } from "@/components/calendars/sync-status-badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";

export type CalendarRowValue = {
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

export interface CalendarRowProps {
  calendar: CalendarRowValue;
  onToggleActive?: (calendar: CalendarRowValue) => void;
  onToggleConflictCheck?: (calendar: CalendarRowValue) => void;
  onSetDefault?: (calendar: CalendarRowValue) => void;
}

function formatLastSynced(lastSyncedAt?: string | null) {
  if (!lastSyncedAt) {
    return "Never";
  }

  const date = new Date(lastSyncedAt);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function CalendarRow({
  calendar,
  onToggleActive,
  onToggleConflictCheck,
  onSetDefault,
}: CalendarRowProps) {
  return (
    <TableRow>
      <TableCell>
        <div className="space-y-1">
          <p className="font-medium text-slate-900">
            {calendar.calendarName || "Unnamed calendar"}
          </p>
          <p className="text-sm text-slate-500">
            {calendar.providerEmail || calendar.provider}
          </p>
          {calendar.calendarTimeZone ? (
            <p className="text-xs text-slate-400">{calendar.calendarTimeZone}</p>
          ) : null}
        </div>
      </TableCell>

      <TableCell>
        <SyncStatusBadge status={calendar.syncStatus} />
      </TableCell>

      <TableCell>
        <Button
          type="button"
          variant={calendar.useForConflictCheck ? "default" : "outline"}
          size="sm"
          onClick={() => onToggleConflictCheck?.(calendar)}
        >
          {calendar.useForConflictCheck ? "Enabled" : "Disabled"}
        </Button>
      </TableCell>

      <TableCell>
        {calendar.isDefaultEventCalendar ? (
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="size-3.5" />
            Default
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onSetDefault?.(calendar)}
          >
            Set default
          </Button>
        )}
      </TableCell>

      <TableCell>
        <span className="text-sm text-slate-600">
          {formatLastSynced(calendar.lastSyncedAt)}
        </span>
      </TableCell>

      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant={calendar.isActive ? "outline" : "secondary"}
            size="sm"
            onClick={() => onToggleActive?.(calendar)}
          >
            {calendar.isActive ? "Disable" : "Enable"}
          </Button>

          <Button type="button" variant="ghost" size="sm" disabled>
            <RefreshCw className="size-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}