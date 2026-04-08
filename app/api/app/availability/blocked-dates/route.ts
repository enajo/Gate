import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { auth } from "@/lib/auth";
import { availabilityService } from "@/server/services/availability.service";
import {
  availabilityRangeQuerySchema,
  createBlockedDateSchema,
} from "@/server/validators/availability.validator";

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function validationErrorResponse(error: ZodError) {
  return NextResponse.json(
    {
      error: "Invalid blocked date request",
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

  if (
    message === "Professional profile not found." ||
    message === "Blocked date not found."
  ) {
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

    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const timezone = searchParams.get("timezone");

    const blockedDates =
      startDate && endDate
        ? await availabilityService.listBlockedDates(
            userId,
            (() => {
              const query = availabilityRangeQuerySchema.parse({
                startDate,
                endDate,
                timezone: timezone ?? undefined,
              });

              return {
                start: query.startDate,
                end: query.endDate,
              };
            })(),
          )
        : await availabilityService.listBlockedDates(userId);

    return NextResponse.json(
      {
        blockedDates,
      },
      { status: 200 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const json = await request.json();
    const input = createBlockedDateSchema.parse(json);

    const blockedDate = await availabilityService.createBlockedDate(
      userId,
      input,
    );

    return NextResponse.json(
      {
        blockedDate,
        message: "Blocked date created successfully.",
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}