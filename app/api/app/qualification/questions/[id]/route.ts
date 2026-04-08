import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { auth } from "@/lib/auth";
import { qualificationService } from "@/server/services/qualification.service";
import {
  questionIdParamSchema,
  updateQualificationQuestionSchema,
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
      error: "Invalid qualification question request",
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
    message === "Qualification question not found."
  ) {
    return NextResponse.json({ error: message }, { status: 404 });
  }

  return NextResponse.json({ error: message }, { status: 400 });
}

async function getAuthenticatedUserId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

async function getQuestionIdFromContext(context: RouteContext) {
  const rawParams = await context.params;
  const params = questionIdParamSchema.parse(rawParams);
  return params.id;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const questionId = await getQuestionIdFromContext(context);
    const json = await request.json();
    const input = updateQualificationQuestionSchema.parse(json);

    const question = await qualificationService.updateQuestion(
      userId,
      questionId,
      input,
    );

    return NextResponse.json(
      {
        question,
        message: "Qualification question updated successfully.",
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

    const questionId = await getQuestionIdFromContext(context);

    await qualificationService.deleteQuestion(userId, questionId);

    return NextResponse.json(
      {
        message: "Qualification question deleted successfully.",
      },
      { status: 200 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}