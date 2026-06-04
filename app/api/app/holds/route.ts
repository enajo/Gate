import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { bookingService } from "@/server/services/booking.service";

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function errorResponse(error: unknown) {
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

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorizedResponse();

    const holds = await bookingService.listActiveHolds(session.user.id);

    return NextResponse.json({ holds }, { status: 200 });
  } catch (error) {
    return errorResponse(error);
  }
}
