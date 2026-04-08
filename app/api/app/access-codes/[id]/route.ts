import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { auth } from "@/lib/auth";
import { accessCodeService } from "@/server/services/access-code.service";
import {
  accessCodeIdParamSchema,
  updateAccessCodeSchema,
} from "@/server/validators/access-code.validator";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function validationErrorResponse(error: ZodError) {
  return NextResponse.json(
    {
      error: "Invalid access code request",
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
    message === "Access code not found."
  ) {
    return NextResponse.json({ error: message }, { status: 404 });
  }

  return NextResponse.json({ error: message }, { status: 400 });
}

async function getAuthenticatedUserId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

async function getAccessCodeIdFromContext(context: RouteContext) {
  const rawParams = await context.params;
  const params = accessCodeIdParamSchema.parse(rawParams);
  return params.id;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const accessCodeId = await getAccessCodeIdFromContext(context);
    const json = await request.json();
    const input = updateAccessCodeSchema.parse(json);

    const accessCode = await accessCodeService.update(
      userId,
      accessCodeId,
      input,
    );

    return NextResponse.json(
      {
        accessCode,
        message: "Access code updated successfully.",
      },
      { status: 200 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}