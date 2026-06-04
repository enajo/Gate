import { type NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { auth } from "@/lib/auth";
import { accessCodeService } from "@/server/services/access-code.service";
import { createAccessCodeSchema } from "@/server/validators/access-code.validator";

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

  if (message === "Professional profile not found.") {
    return NextResponse.json({ error: message }, { status: 404 });
  }

  return NextResponse.json({ error: message }, { status: 400 });
}

async function getAuthenticatedUserId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const serviceId = request.nextUrl.searchParams.get("serviceId");

    const accessCodes = serviceId
      ? await accessCodeService.listByService(userId, serviceId)
      : await accessCodeService.list(userId);

    return NextResponse.json({ accessCodes }, { status: 200 });
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
    const input = createAccessCodeSchema.parse(json);

    const accessCode = await accessCodeService.create(userId, input);

    return NextResponse.json(
      {
        accessCode,
        message: "Access code created successfully.",
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}