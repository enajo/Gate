import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { auth } from "@/lib/auth";
import { bookingService } from "@/server/services/booking.service";
import { leadCorrectionSchema } from "@/server/validators/booking.validator";

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function errorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Invalid input", details: error.flatten() },
      { status: 422 },
    );
  }

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorizedResponse();

    const { id } = await params;
    const json = await request.json();
    const input = leadCorrectionSchema.parse(json);

    const lead = await bookingService.submitLeadCorrection(
      session.user.id,
      id,
      input,
    );

    return NextResponse.json({ lead }, { status: 200 });
  } catch (error) {
    return errorResponse(error);
  }
}
