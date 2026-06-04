import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

import { auth } from "@/lib/auth";
import { accessCodeService } from "@/server/services/access-code.service";
import { bulkGenerateAccessCodesSchema } from "@/server/validators/access-code.validator";

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function errorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Invalid request", details: error.flatten() },
      { status: 422 },
    );
  }

  // FK constraint — service hasn't been published to DB yet
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2003"
  ) {
    return NextResponse.json(
      {
        error:
          "Service not saved yet. Publish your profile first, then generate codes.",
      },
      { status: 422 },
    );
  }

  const message =
    error instanceof Error ? error.message : "An unexpected error occurred.";

  if (message === "Professional profile not found.") {
    return NextResponse.json({ error: message }, { status: 404 });
  }

  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauthorizedResponse();

    const json = await request.json();
    const input = bulkGenerateAccessCodesSchema.parse(json);

    const result = await accessCodeService.bulkGenerate(session.user.id, input);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
