import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { auth } from "@/lib/auth";
import { availabilityService } from "@/server/services/availability.service";
import {
  blockedDateIdParamSchema,
  updateBlockedDateSchema,
} from "@/server/validators/availability.validator";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function validationErrorResponse(error: ZodError) {
  return NextResponse.json(
    { error: "Invalid blocked date request", details: error.flatten() },
    { status: 422 },
  );
}

function errorResponse(error: unknown) {
  if (error instanceof ZodError) return validationErrorResponse(error);

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

async function getBlockedDateId(context: RouteContext): Promise<string> {
  return blockedDateIdParamSchema.parse(await context.params).id;
}

// PATCH /api/app/availability/blocked-dates/[id]
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorizedResponse();

    const blockedDateId = await getBlockedDateId(context);
    const json = await request.json();
    const input = updateBlockedDateSchema.parse(json);

    const blockedDate = await availabilityService.updateBlockedDate(
      userId,
      blockedDateId,
      input,
    );

    return NextResponse.json({ blockedDate }, { status: 200 });
  } catch (error) {
    return errorResponse(error);
  }
}

// DELETE /api/app/availability/blocked-dates/[id]
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorizedResponse();

    const blockedDateId = await getBlockedDateId(context);
    await availabilityService.deleteBlockedDate(userId, blockedDateId);

    return NextResponse.json({ message: "Blocked date deleted." }, { status: 200 });
  } catch (error) {
    return errorResponse(error);
  }
}
