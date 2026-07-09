import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { logger } from "@/lib/logger";
import { getClientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { bookingService } from "@/server/services/booking.service";
import { confirmBookingSchema } from "@/server/validators/booking.validator";

// ── Error helpers ─────────────────────────────────────────────────────────────

function errorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Invalid request", details: error.flatten() },
      { status: 422 },
    );
  }

  const message =
    error instanceof Error ? error.message : "An unexpected error occurred.";

  if (
    message === "Professional profile not found." ||
    message === "Service not found." ||
    message === "Lead not found." ||
    message === "Booking hold not found."
  ) {
    return NextResponse.json({ error: message }, { status: 404 });
  }

  if (
    message === "Booking hold is no longer active." ||
    message === "Booking hold has expired." ||
    message === "Booking hold does not match the selected service." ||
    message === "Booking hold does not belong to this lead."
  ) {
    return NextResponse.json({ error: message }, { status: 409 });
  }

  if (
    message === "Lead is not qualified for booking." ||
    message === "Service is not active." ||
    message === "Selected slot is no longer available."
  ) {
    return NextResponse.json({ error: message }, { status: 400 });
  }

  logger.error("Unexpected error in POST /api/public/bookings/confirm", {
    error: message,
  });

  return NextResponse.json({ error: message }, { status: 400 });
}

// ── Route ─────────────────────────────────────────────────────────────────────

// 5 confirmations per 10 minutes per IP
const CONFIRM_LIMIT  = 5;
const CONFIRM_WINDOW = 10 * 60 * 1000;

export async function POST(request: Request) {
  const ip     = getClientIp(request);
  const result = rateLimit(`bookings:confirm:${ip}`, CONFIRM_LIMIT, CONFIRM_WINDOW);
  if (!result.allowed) return tooManyRequests(result.resetAt);

  try {
    const json = (await request.json()) as Record<string, unknown>;

    const input = confirmBookingSchema.parse({
      professionalId: json.professionalId,
      serviceId: json.serviceId,
      leadId: json.leadId,
      holdId: json.holdId,
      timezone: json.timezone,
      accessCode: json.accessCode,
    });

    const result = await bookingService.confirmBooking(input);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return errorResponse(error);
  }
}
