import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { DEFAULT_TIMEZONE } from "@/lib/constants";
import { bookingService } from "@/server/services/booking.service";
import { bookingSlotSelectionSchema } from "@/server/validators/booking.validator";

const publicCreateHoldSchema = bookingSlotSelectionSchema.extend({
  professionalId: z.string().trim().min(1),
  leadId: z.string().trim().min(1),
});

function validationErrorResponse(error: ZodError) {
  return NextResponse.json(
    {
      error: "Invalid booking hold request",
      details: error.flatten(),
    },
    { status: 422 },
  );
}

function errorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return validationErrorResponse(error);
  }

  const message =
    error instanceof Error ? error.message : "An unexpected error occurred.";

  if (
    message === "Professional profile not found." ||
    message === "Service not found." ||
    message === "Lead not found."
  ) {
    return NextResponse.json({ error: message }, { status: 404 });
  }

  if (
    message === "Lead is not qualified for booking." ||
    message === "Service is not active." ||
    message === "Selected slot is no longer available."
  ) {
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (message === "This slot is temporarily reserved.") {
    return NextResponse.json({ error: message }, { status: 409 });
  }

  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: Request) {
  try {
    const json = await request.json();

    const input = publicCreateHoldSchema.parse({
      professionalId: json.professionalId,
      serviceId: json.serviceId,
      leadId: json.leadId,
      slotStart: json.slotStart,
      slotEnd: json.slotEnd,
      timezone: json.timezone ?? DEFAULT_TIMEZONE,
    });

    const hold = await bookingService.createHold({
      professionalId: input.professionalId,
      serviceId: input.serviceId,
      leadId: input.leadId,
      slotStart: input.slotStart,
      slotEnd: input.slotEnd,
      timezone: input.timezone,
    });

    return NextResponse.json(
      {
        hold,
        holdId: hold.id,
        expiresAt: hold.expiresAt,
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}