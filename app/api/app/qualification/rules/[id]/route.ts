import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { auth } from "@/lib/auth";
import { qualificationService } from "@/server/services/qualification.service";
import {
  ruleIdParamSchema,
  updateQualificationRuleSchema,
} from "@/server/validators/qualification.validator";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function validationErrorResponse(error: ZodError) {
  return NextResponse.json(
    {
      error: "Invalid qualification rule request",
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
    message === "Service not found." ||
    message === "Qualification rule not found."
  ) {
    return NextResponse.json({ error: message }, { status: 404 });
  }

  return NextResponse.json({ error: message }, { status: 400 });
}

async function getAuthenticatedUserId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

async function getRuleIdFromContext(context: RouteContext) {
  const rawParams = await context.params;
  const params = ruleIdParamSchema.parse(rawParams);
  return params.id;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const ruleId = await getRuleIdFromContext(context);
    const rule = await qualificationService.getRuleById(userId, ruleId);

    if (!rule) {
      return NextResponse.json(
        { error: "Qualification rule not found." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        rule,
      },
      { status: 200 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const ruleId = await getRuleIdFromContext(context);
    const json = await request.json();
    const input = updateQualificationRuleSchema.parse(json);

    const rule = await qualificationService.updateRule(userId, ruleId, input);

    return NextResponse.json(
      {
        rule,
        message: "Qualification rule updated successfully.",
      },
      { status: 200 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const ruleId = await getRuleIdFromContext(context);

    await qualificationService.deleteRule(userId, ruleId);

    return NextResponse.json(
      {
        message: "Qualification rule deleted successfully.",
      },
      { status: 200 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}