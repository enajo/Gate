import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { auth } from "@/lib/auth";
import { profileService } from "@/server/services/profile.service";
import { outlookSyncService } from "@/server/services/outlook-sync.service";

const outlookConnectRequestSchema = z
  .object({
    returnTo: z.string().trim().min(1).max(500).optional(),
    nonce: z.string().trim().min(1).max(255).optional(),
  })
  .strict();

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function validationErrorResponse(error: ZodError) {
  return NextResponse.json(
    {
      error: "Invalid Outlook connect request",
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

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const json = await request.json().catch(() => ({}));
    const input = outlookConnectRequestSchema.parse(json);

    const profile = await profileService.getProfileByUserId(userId);

    if (!profile) {
      return NextResponse.json(
        { error: "Professional profile not found." },
        { status: 404 },
      );
    }

    const authorizationUrl = await outlookSyncService.getAuthorizationUrl({
      professionalId: profile.id,
      returnTo: input.returnTo,
      nonce: input.nonce,
    });

    return NextResponse.json(
      {
        authorizationUrl,
      },
      { status: 200 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
