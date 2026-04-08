import * as React from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Video,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type BookingSuccessCardValue = {
  bookingId: string;
  professionalName?: string | null;
  serviceTitle?: string | null;
  slotStart: string;
  slotEnd: string;
  timezone?: string | null;
  meetingUrl?: string | null;
  eventUrl?: string | null;
};

export interface BookingSuccessCardProps
  extends React.HTMLAttributes<HTMLDivElement> {
  booking: BookingSuccessCardValue;
  eventCreationPending?: boolean;
  title?: string;
  description?: string;
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
    weekday: "long",
    month: "long",
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

export function BookingSuccessCard({
  booking,
  eventCreationPending = false,
  title,
  description,
  ...props
}: BookingSuccessCardProps) {
  const formatted = formatDateTimeRange(
    booking.slotStart,
    booking.slotEnd,
    booking.timezone,
  );

  const resolvedTitle = title
    ? title
    : eventCreationPending
      ? "Booking secured"
      : "Booking confirmed";

  const resolvedDescription = description
    ? description
    : eventCreationPending
      ? "The booking was created successfully, but calendar event creation is still pending."
      : "The booking was created successfully and the client has completed the flow.";

  return (
    <Card className="rounded-2xl" {...props}>
      <CardHeader className="items-center text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="size-7" />
        </div>

        <Badge variant="success" className="mt-4">
          Success
        </Badge>

        <CardTitle className="mt-2 text-2xl">{resolvedTitle}</CardTitle>

        <p className="max-w-2xl text-sm leading-7 text-slate-600">
          {resolvedDescription}
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Service
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {booking.serviceTitle || "Untitled service"}
            </p>
            {booking.professionalName ? (
              <p className="mt-1 text-sm text-slate-500">
                With {booking.professionalName}
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Booking ID
            </p>
            <p className="mt-2 break-all text-sm font-medium text-slate-900">
              {booking.bookingId}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              <CalendarDays className="size-4" />
              Date
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-900">
              {formatted.date}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              <Clock3 className="size-4" />
              Time
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-900">
              {formatted.time}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Time zone: {booking.timezone || "UTC"}
            </p>
          </div>
        </div>

        {(booking.meetingUrl || booking.eventUrl) && (
          <div className="flex flex-col gap-3 sm:flex-row">
            {booking.meetingUrl ? (
              <Button asChild>
                <a
                  href={booking.meetingUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Video className="size-4" />
                  Open meeting link
                </a>
              </Button>
            ) : null}

            {booking.eventUrl ? (
              <Button asChild variant="outline">
                <a
                  href={booking.eventUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="size-4" />
                  Open calendar event
                </a>
              </Button>
            ) : null}
          </div>
        )}

        {eventCreationPending ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
            The booking is confirmed, but the calendar event is still being
            created.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}