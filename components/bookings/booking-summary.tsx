import * as React from "react";
import { CalendarDays, Clock3, User2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type BookingSummaryValue = {
  id: string;
  serviceTitle?: string | null;
  clientName?: string | null;
  clientEmail?: string | null;
  professionalName?: string | null;
  slotStart: string;
  slotEnd: string;
  timezone?: string | null;
  status?:
    | "PENDING_CODE"
    | "CODE_INVALID"
    | "CONFIRMED"
    | "EVENT_CREATION_PENDING"
    | "EVENT_CREATED"
    | "CANCELLED";
};

export interface BookingSummaryProps
  extends React.HTMLAttributes<HTMLDivElement> {
  booking: BookingSummaryValue;
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

export function BookingSummary({
  booking,
  title = "Booking summary",
  description = "Review the key details for this booking.",
  ...props
}: BookingSummaryProps) {
  const formatted = formatDateTimeRange(
    booking.slotStart,
    booking.slotEnd,
    booking.timezone,
  );

  return (
    <Card className="rounded-2xl" {...props}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-slate-500">{description}</p>
      </CardHeader>

      <CardContent className="grid gap-4 sm:grid-cols-2">
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
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            <User2 className="size-4" />
            Client
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {booking.clientName || "Unknown client"}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {booking.clientEmail || "No email"}
          </p>
        </div>

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
      </CardContent>
    </Card>
  );
}