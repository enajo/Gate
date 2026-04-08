import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { auth } from "@/lib/auth";
import { googleSyncService } from "@/server/services/google-sync.service";
import {
  calendarAccountIdParamSchema,
  defaultEventCalendarSelectionSchema,
  toggleCalendarConflictCheckSchema,
} from "@/server/validators/google.validator";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

const updateGoogleCalendarRouteSchema = z
  .object({
    isActive: z.boolean().optional(),
    useForConflictCheck: z.boolean().optional(),
    isDefaultEventCalendar: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one calendar field must be provided.",
  });

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function validationErrorResponse(error: ZodError) {
  return NextResponse.json(
    {
      error: "Invalid Google calendar request",
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
    message === "Calendar account not found."
  ) {
    return NextResponse.json({ error: message }, { status: 404 });
  }

  return NextResponse.json({ error: message }, { status: 400 });
}

async function getAuthenticatedUserId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

async function getCalendarAccountIdFromContext(context: RouteContext) {
  const rawParams = await context.params;
  const params = calendarAccountIdParamSchema.parse(rawParams);
  return params.id;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const calendarAccountId = await getCalendarAccountIdFromContext(context);
    const json = await request.json();
    const input = updateGoogleCalendarRouteSchema.parse(json);

    let calendar = null;

    if (typeof input.isActive === "boolean") {
      calendar = await googleSyncService.setCalendarActiveState(
        userId,
        calendarAccountId,
        input.isActive,
      );
    }

    if (typeof input.useForConflictCheck === "boolean") {
      const parsed = toggleCalendarConflictCheckSchema.parse({
        professionalId: userId,
        calendarAccountId,
        useForConflictCheck: input.useForConflictCheck,
      });

      calendar = await googleSyncService.setCalendarConflictCheckState(
        userId,
        parsed.calendarAccountId,
        parsed.useForConflictCheck,
      );
    }

    if (input.isDefaultEventCalendar === true) {
      const parsed = defaultEventCalendarSelectionSchema.parse({
        professionalId: userId,
        calendarAccountId,
      });

      calendar = await googleSyncService.setDefaultEventCalendar(
        userId,
        parsed.calendarAccountId,
      );
    }

    if (!calendar) {
      return NextResponse.json(
        { error: "No supported calendar update was provided." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        calendar,
        message: "Calendar updated successfully.",
      },
      { status: 200 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}