import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { qualificationService } from "@/server/services/qualification.service";
import { qualificationSubmissionSchema } from "@/server/validators/qualification.validator";

function validationErrorResponse(error: ZodError) {
  return NextResponse.json(
    {
      error: "Invalid qualification submission",
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
    message === "Service not found."
  ) {
    return NextResponse.json({ error: message }, { status: 404 });
  }

  if (message.startsWith("Missing answer for required question:")) {
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const input = qualificationSubmissionSchema.parse(json);

    const result = await qualificationService.submitQualification(input);

    return NextResponse.json(
      {
        lead: result.lead,
        evaluation: result.evaluation,
      },
      { status: 200 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}