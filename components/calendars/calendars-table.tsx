"use client";

import * as React from "react";

import { CalendarRow, type CalendarRowValue } from "@/components/calendars/calendar-row";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow as UITableRow,
} from "@/components/ui/table";

export interface CalendarsTableProps
  extends React.HTMLAttributes<HTMLDivElement> {
  calendars: CalendarRowValue[];
  emptyTitle?: string;
  emptyDescription?: string;
  onConnect?: () => void;
  onToggleActive?: (calendar: CalendarRowValue) => void;
  onToggleConflictCheck?: (calendar: CalendarRowValue) => void;
  onSetDefault?: (calendar: CalendarRowValue) => void;
}

export function CalendarsTable({
  calendars,
  emptyTitle = "No connected calendars",
  emptyDescription = "Connect your Google Calendar to sync availability, avoid conflicts, and choose where booking events should be created.",
  onConnect,
  onToggleActive,
  onToggleConflictCheck,
  onSetDefault,
  ...props
}: CalendarsTableProps) {
  if (!calendars.length) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={
          onConnect ? (
            <Button type="button" onClick={onConnect}>
              Connect calendar
            </Button>
          ) : null
        }
        inset
        {...props}
      />
    );
  }

  return (
    <div {...props}>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <UITableRow>
              <TableHead>Calendar</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Conflict checks</TableHead>
              <TableHead>Default event calendar</TableHead>
              <TableHead>Last synced</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </UITableRow>
          </TableHeader>

          <TableBody>
            {calendars.map((calendar) => (
              <CalendarRow
                key={calendar.id}
                calendar={calendar}
                onToggleActive={onToggleActive}
                onToggleConflictCheck={onToggleConflictCheck}
                onSetDefault={onSetDefault}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}