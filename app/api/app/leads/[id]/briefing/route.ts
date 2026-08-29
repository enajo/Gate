import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { bookingService } from "@/server/services/booking.service";

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function errorResponse(error: unknown) {
  const message =
    error instanceof Error ? error.message : "An unexpected error occurred.";

  if (message === "Unauthorized" || message === "Professional profile not found.") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (message === "Lead not found.") {
    return NextResponse.json({ error: message }, { status: 404 });
  }

  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorizedResponse();

    const { id } = await params;
    const briefing = await bookingService.getPreCallBriefing(session.user.id, id);

    return NextResponse.json({ briefing }, { status: 200 });
  } catch (error) {
    return errorResponse(error);
  }
}
