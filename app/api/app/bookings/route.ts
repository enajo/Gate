import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { auth } from "@/lib/auth";
import { bookingService } from "@/server/services/booking.service";

const bookingsQuerySchema = z.object({
  upcoming: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
});

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function validationErrorResponse(error: ZodError) {
  return NextResponse.json(
    {
      error: "Invalid bookings request",
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

  if (message === "Unauthorized") {
    return NextResponse.json({ error: message }, { status: 401 });
  }

  if (message === "Professional profile not found.") {
    return NextResponse.json({ error: message }, { status: 404 });
  }

  return NextResponse.json({ error: message }, { status: 400 });
}

async function getAuthenticatedUserId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function GET(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const query = bookingsQuerySchema.parse({
      upcoming: searchParams.get("upcoming") ?? undefined,
    });

    const bookings = query.upcoming
      ? await bookingService.listUpcomingBookings(userId)
      : await bookingService.listBookings(userId);

    return NextResponse.json(
      {
        bookings,
      },
      { status: 200 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}