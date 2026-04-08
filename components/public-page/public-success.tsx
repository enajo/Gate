import { CalendarDays, CheckCircle2, Clock3, ExternalLink, Video } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type PublicBookingSuccessPayload = {
  bookingId: string;
  professionalName: string;
  serviceTitle: string;
  slotStart: string;
  slotEnd: string;
  timezone: string;
  meetingUrl?: string | null;
  eventUrl?: string | null;
};

export interface PublicSuccessProps
  extends React.HTMLAttributes<HTMLElement> {
  success: PublicBookingSuccessPayload | null;
  eventCreationPending?: boolean;
  title?: string;
  description?: string;
}

function formatBookingDateTime(
  startIso: string,
  endIso: string,
  timezone: string,
) {
  const start = new Date(startIso);
  const end = new Date(endIso);

  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(start);

  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
  });

  return {
    day,
    range: `${time.format(start)} – ${time.format(end)}`,
  };
}

export function PublicSuccess({
  className,
  success,
  eventCreationPending = false,
  title,
  description,
  ...props
}: PublicSuccessProps) {
  if (!success) {
    return null;
  }

  const formatted = formatBookingDateTime(
    success.slotStart,
    success.slotEnd,
    success.timezone,
  );

  const resolvedTitle = title
    ? title
    : eventCreationPending
      ? "Your booking is secured"
      : "You’re booked";

  const resolvedDescription = description
    ? description
    : eventCreationPending
      ? "Your booking was created successfully. Calendar event creation is still pending, so meeting details may appear shortly."
      : `Your session with ${success.professionalName} is confirmed.`;

  return (
    <section
      className={cn("border-b border-slate-200 bg-white", className)}
      {...props}
    >
      <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="items-center text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="size-7" />
            </div>

            <Badge variant="secondary" className="mt-4 w-fit">
              Booking confirmed
            </Badge>

            <CardTitle className="mt-2 text-3xl tracking-tight">
              {resolvedTitle}
            </CardTitle>

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
                  {success.serviceTitle}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  With {success.professionalName}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Booking ID
                </p>
                <p className="mt-2 break-all text-sm font-medium text-slate-900">
                  {success.bookingId}
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
                  {formatted.day}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  <Clock3 className="size-4" />
                  Time
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-900">
                  {formatted.range}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Time zone: {success.timezone}
                </p>
              </div>
            </div>

            {(success.meetingUrl || success.eventUrl) ? (
              <div className="flex flex-col gap-3 sm:flex-row">
                {success.meetingUrl ? (
                  <Button asChild>
                    <a
                      href={success.meetingUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Video className="size-4" />
                      Open meeting link
                    </a>
                  </Button>
                ) : null}

                {success.eventUrl ? (
                  <Button asChild variant="outline">
                    <a
                      href={success.eventUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink className="size-4" />
                      Open calendar event
                    </a>
                  </Button>
                ) : null}
              </div>
            ) : null}

            {eventCreationPending ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
                Your booking is confirmed, but the calendar event is still being
                created. Refresh later or check your email for updated meeting details.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}