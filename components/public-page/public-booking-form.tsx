"use client";

import * as React from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  KeyRound,
  Loader2,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PublicSelectedSlot = {
  start: string;
  end: string;
};

type BookingHoldResponse = {
  hold: {
    id: string;
    expiresAt: string;
    slotStart: string;
    slotEnd: string;
  };
  holdId: string;
  expiresAt: string;
};

type BookingConfirmResponse = {
  booking: {
    id: string;
    status: string;
    slotStart: string;
    slotEnd: string;
    timezone: string;
  };
  isCodeValid: boolean;
  eventCreationRequired: boolean;
  success?: {
    bookingId?: string;
    professionalName?: string;
    serviceTitle?: string;
    slotStart?: string;
    slotEnd?: string;
    timezone?: string;
    meetingUrl?: string | null;
  } | null;
  message?: string;
};

export interface PublicBookingFormProps
  extends React.HTMLAttributes<HTMLElement> {
  professionalId: string;
  serviceId: string | null;
  leadId: string | null;
  selectedSlot: PublicSelectedSlot | null;
  isUnlocked?: boolean;
  timezone?: string;
  serviceTitle?: string;
  accessCodeLabel?: string;
  submitLabel?: string;
  helpText?: string;
  onSuccess?: (result: BookingConfirmResponse) => void;
}

function formatDateTimeRange(
  startIso: string,
  endIso: string,
  timezone: string,
) {
  const start = new Date(startIso);
  const end = new Date(endIso);

  const dayFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
  });

  return {
    day: dayFormatter.format(start),
    range: `${timeFormatter.format(start)} – ${timeFormatter.format(end)}`,
  };
}

export function PublicBookingForm({
  className,
  professionalId,
  serviceId,
  leadId,
  selectedSlot,
  isUnlocked = false,
  timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  serviceTitle,
  accessCodeLabel = "Access code",
  submitLabel = "Confirm booking",
  helpText = "Enter your access code to secure this slot.",
  onSuccess,
  ...props
}: PublicBookingFormProps) {
  const [accessCode, setAccessCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState<BookingConfirmResponse | null>(
    null,
  );

  React.useEffect(() => {
    setError(null);
    setSuccess(null);
  }, [selectedSlot?.start, selectedSlot?.end, leadId, serviceId]);

  const slotSummary = React.useMemo(() => {
    if (!selectedSlot) {
      return null;
    }

    return formatDateTimeRange(
      selectedSlot.start,
      selectedSlot.end,
      timezone,
    );
  }, [selectedSlot, timezone]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!isUnlocked) {
      setError("Complete qualification before confirming your booking.");
      return;
    }

    if (!professionalId || !serviceId || !leadId) {
      setError("Missing booking details. Please complete the qualification step again.");
      return;
    }

    if (!selectedSlot) {
      setError("Select a time slot before confirming your booking.");
      return;
    }

    if (!accessCode.trim()) {
      setError("Enter your access code to continue.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const holdResponse = await fetch("/api/public/holds", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          professionalId,
          serviceId,
          leadId,
          slotStart: selectedSlot.start,
          slotEnd: selectedSlot.end,
          timezone,
        }),
      });

      const holdData = (await holdResponse.json()) as
        | BookingHoldResponse
        | { error?: string };

      if (!holdResponse.ok) {
        throw new Error(holdData?.error || "Failed to reserve the selected slot.");
      }

      const holdId =
        (holdData as BookingHoldResponse).holdId ||
        (holdData as BookingHoldResponse).hold?.id;

      if (!holdId) {
        throw new Error("Failed to create a booking hold.");
      }

      const confirmResponse = await fetch("/api/public/bookings/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          professionalId,
          serviceId,
          leadId,
          holdId,
          timezone,
          accessCode: accessCode.trim(),
        }),
      });

      const confirmData = (await confirmResponse.json()) as
        | BookingConfirmResponse
        | { error?: string };

      if (!confirmResponse.ok) {
        throw new Error(confirmData?.error || "Failed to confirm booking.");
      }

      const result = confirmData as BookingConfirmResponse;
      setSuccess(result);
      onSuccess?.(result);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to confirm booking.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isUnlocked) {
    return null;
  }

  return (
    <section
      className={cn("border-b border-slate-200 bg-slate-50/50", className)}
      {...props}
    >
      <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="secondary" className="gap-1">
            <KeyRound className="size-3.5" />
            Booking form
          </Badge>

          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Confirm your booking
          </h2>

          <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            You’re qualified. Secure your selected slot by entering your access
            code below.
          </p>
        </div>

        <div className="mt-12">
          {!success ? (
            <Card className="mx-auto rounded-2xl border-slate-200 shadow-sm">
              <CardHeader className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>Booking details</CardTitle>
                    <CardDescription>
                      Review your slot and confirm access.
                    </CardDescription>
                  </div>

                  <div className="flex size-11 items-center justify-center rounded-xl bg-slate-900 text-white">
                    <ShieldCheck className="size-5" />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Selected service
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {serviceTitle || "Selected service"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      <CalendarDays className="size-4" />
                      Selected slot
                    </div>

                    {slotSummary ? (
                      <>
                        <p className="mt-3 text-base font-semibold text-slate-900">
                          {slotSummary.day}
                        </p>
                        <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                          <Clock3 className="size-4" />
                          {slotSummary.range}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          Time zone: {timezone}
                        </p>
                      </>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500">
                        Select a slot to continue.
                      </p>
                    )}
                  </div>
                </div>

                <form className="space-y-5" onSubmit={handleSubmit}>
                  <div className="space-y-2">
                    <Label error={!!error}>{accessCodeLabel}</Label>
                    <Input
                      value={accessCode}
                      error={!!error}
                      onChange={(event) => setAccessCode(event.target.value)}
                      placeholder="Enter your access code"
                      autoComplete="off"
                    />
                    <p className="text-sm text-slate-500">{helpText}</p>
                  </div>

                  {error ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                  ) : null}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={
                      isSubmitting ||
                      !selectedSlot ||
                      !serviceId ||
                      !leadId ||
                      !professionalId
                    }
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Confirming...
                      </>
                    ) : (
                      submitLabel
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="mx-auto rounded-2xl border-slate-200 shadow-sm">
              <CardContent className="p-8">
                <div className="flex flex-col items-center text-center">
                  <div className="flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="size-7" />
                  </div>

                  <h3 className="mt-5 text-2xl font-semibold text-slate-900">
                    {success.eventCreationRequired
                      ? "Booking secured"
                      : "Booking confirmed"}
                  </h3>

                  <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                    {success.message ||
                      "Your booking has been created successfully."}
                  </p>

                  <div className="mt-8 grid w-full gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 text-left">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Booking ID
                      </p>
                      <p className="mt-2 text-sm font-medium text-slate-900">
                        {success.success?.bookingId || success.booking.id}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 text-left">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Status
                      </p>
                      <p className="mt-2 text-sm font-medium text-slate-900">
                        {success.eventCreationRequired
                          ? "Event creation pending"
                          : success.booking.status}
                      </p>
                    </div>
                  </div>

                  {success.success?.meetingUrl ? (
                    <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-700">
                      Meeting link available:{" "}
                      <a
                        href={success.success.meetingUrl}
                        className="font-medium text-slate-900 underline underline-offset-4"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open meeting link
                      </a>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}