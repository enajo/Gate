import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { auth } from "@/lib/auth";
import { qualificationService } from "@/server/services/qualification.service";
import {
  createQualificationRuleSchema,
  qualificationServiceQuerySchema,
} from "@/server/validators/qualification.validator";

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
    message === "Service not found."
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
    const query = qualificationServiceQuerySchema.parse({
      serviceId: searchParams.get("serviceId") ?? undefined,
    });

    const rules = await qualificationService.listRules(
      userId,
      query.serviceId ?? null,
    );

    return NextResponse.json(
      {
        rules,
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
    const input = createQualificationRuleSchema.parse(json);

    const rule = await qualificationService.createRule(userId, input);

    return NextResponse.json(
      {
        rule,
        message: "Qualification rule created successfully.",
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}