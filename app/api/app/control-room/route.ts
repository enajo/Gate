import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { auth } from "@/lib/auth";
import { profileService } from "@/server/services/profile.service";

// ── Helpers ───────────────────────────────────────────────────────────────────

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function errorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Invalid payload", details: error.flatten() },
      { status: 422 },
    );
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

async function getAuthenticatedUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

// ── GET /api/app/control-room ─────────────────────────────────────────────────
// Returns the full Control Room state shaped as PublicSalesPageTemplateData,
// plus the current publishedAt timestamp.

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorized();

    const data = await profileService.getControlRoomState(userId);

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return errorResponse(error);
  }
}

// ── PUT /api/app/control-room ─────────────────────────────────────────────────
// Saves the full Control Room state as a draft. Creates the professional record
// if it doesn't exist yet. Returns the fresh state after saving.

export async function PUT(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorized();

    const body = await request.json();

    const data = await profileService.saveControlRoomDraft(userId, body);

    return NextResponse.json(
      { ...data, message: "Draft saved." },
      { status: 200 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
