import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { auth } from "@/lib/auth";
import { availabilityService } from "@/server/services/availability.service";
import { updateAvailabilityRuleSchema } from "@/server/validators/availability.validator";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function validationErrorResponse(error: ZodError) {
  return NextResponse.json(
    { error: "Invalid availability rule", details: error.flatten() },
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
    message === "Availability rule not found."
  ) {
    return NextResponse.json({ error: message }, { status: 404 });
  }
  return NextResponse.json({ error: message }, { status: 400 });
}

async function getAuthenticatedUserId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

async function getRuleId(context: RouteContext): Promise<string> {
  const rawParams = await context.params;
  return rawParams.id;
}

// PATCH /api/app/availability/rules/[id]
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorizedResponse();

    const ruleId = await getRuleId(context);
    const json = await request.json();
    const input = updateAvailabilityRuleSchema.parse(json);

    const rule = await availabilityService.updateAvailabilityRule(
      userId,
      ruleId,
      input,
    );

    return NextResponse.json({ rule }, { status: 200 });
  } catch (error) {
    return errorResponse(error);
  }
}

// DELETE /api/app/availability/rules/[id]
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorizedResponse();

    const ruleId = await getRuleId(context);
    await availabilityService.deleteAvailabilityRule(userId, ruleId);

    return NextResponse.json(
      { message: "Availability rule deleted." },
      { status: 200 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
