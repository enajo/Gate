"use client";

import * as React from "react";
import { CalendarDays } from "lucide-react";

import { BookingStatusBadge } from "@/components/bookings/booking-status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type BookingsTableValue = {
  id: string;
  leadId?: string | null;
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

export interface BookingsTableProps
  extends React.HTMLAttributes<HTMLDivElement> {
  bookings: BookingsTableValue[];
  emptyTitle?: string;
  emptyDescription?: string;
  onView?: (booking: BookingsTableValue) => void;
}

function formatDateTimeRange(
  startIso: string,
  endIso: string,
  timezone?: string | null,
) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const resolvedTimezone = timezone || "UTC";

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return {
      date: "Invalid date",
      time: "Invalid time",
    };
  }

  const date = new Intl.DateTimeFormat("en-US", {
    timeZone: resolvedTimezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(start);

  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: resolvedTimezone,
    hour: "numeric",
    minute: "2-digit",
  });

  return {
    date,
    time: `${timeFormatter.format(start)} – ${timeFormatter.format(end)}`,
  };
}

export function BookingsTable({
  bookings,
  emptyTitle = "No bookings yet",
  emptyDescription = "Confirmed bookings and pending booking attempts will appear here once clients go through your Gatekeeper flow.",
  onView,
  ...props
}: BookingsTableProps) {
  if (!bookings.length) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        icon={<CalendarDays className="size-5 text-slate-500" />}
        inset
        {...props}
      />
    );
  }

  const sortedBookings = bookings
    .slice()
    .sort(
      (a, b) =>
        new Date(b.slotStart).getTime() - new Date(a.slotStart).getTime(),
    );

  return (
    <div {...props}>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Timezone</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {sortedBookings.map((booking) => {
              const formatted = formatDateTimeRange(
                booking.slotStart,
                booking.slotEnd,
                booking.timezone,
              );

              return (
                <TableRow key={booking.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium text-slate-900">
                        {booking.clientName || "Unknown client"}
                      </p>
                      <p className="text-sm text-slate-500">
                        {booking.clientEmail || "No email"}
                      </p>
                    </div>
                  </TableCell>

                  <TableCell>
                    <span className="text-sm text-slate-900">
                      {booking.serviceTitle || "Untitled service"}
                    </span>
                  </TableCell>

                  <TableCell>
                    <span className="text-sm text-slate-900">
                      {formatted.date}
                    </span>
                  </TableCell>

                  <TableCell>
                    <span className="text-sm text-slate-900">
                      {formatted.time}
                    </span>
                  </TableCell>

                  <TableCell>
                    <BookingStatusBadge
                      status={booking.status}
                      calendarStatus={booking.calendarStatus ?? null}
                    />
                  </TableCell>

                  <TableCell>
                    <span className="text-sm text-slate-500">
                      {booking.timezone || "UTC"}
                    </span>
                  </TableCell>

                  <TableCell className="text-right">
                    {onView ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onView(booking)}
                      >
                        View
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}