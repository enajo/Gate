import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { auth } from "@/lib/auth";
import { onboardingService } from "@/server/services/onboarding.service";
import { profileService } from "@/server/services/profile.service";
import { upsertProfessionalProfileSchema } from "@/server/validators/profile.validator";

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function validationErrorResponse(error: ZodError) {
  return NextResponse.json(
    {
      error: "Invalid profile payload",
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

  if (message === "This slug is already in use.") {
    return NextResponse.json({ error: message }, { status: 409 });
  }

  return NextResponse.json({ error: message }, { status: 400 });
}

async function getAuthenticatedUserId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const [profile, onboarding] = await Promise.all([
      profileService.getProfileWithTestimonials(userId),
      onboardingService.getState(userId),
    ]);

    return NextResponse.json(
      {
        profile,
        onboarding,
      },
      { status: 200 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const json = await request.json();
    const input = upsertProfessionalProfileSchema.parse(json);

    const profile = await profileService.upsertProfile(userId, input);
    const onboarding = await onboardingService.markCompletedIfReady(userId);

    return NextResponse.json(
      {
        profile,
        onboarding,
        message: "Profile updated successfully.",
      },
      { status: 200 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}