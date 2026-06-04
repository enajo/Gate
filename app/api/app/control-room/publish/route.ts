import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { profileService } from "@/server/services/profile.service";

async function getAuthenticatedUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function errorResponse(error: unknown) {
  const message =
    error instanceof Error ? error.message : "An unexpected error occurred.";

  if (message === "Professional profile not found.") {
    return NextResponse.json({ error: message }, { status: 404 });
  }

  return NextResponse.json({ error: message }, { status: 400 });
}

// ── POST /api/app/control-room/publish ────────────────────────────────────────
// Sets publishedAt to now. The public page becomes live.

export async function POST() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorized();

    await profileService.publishControlRoom(userId);

    return NextResponse.json(
      { message: "Profile published.", publishedAt: new Date().toISOString() },
      { status: 200 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

// ── DELETE /api/app/control-room/publish ──────────────────────────────────────
// Sets publishedAt to null. The public page returns 404.

export async function DELETE() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorized();

    await profileService.unpublishControlRoom(userId);

    return NextResponse.json(
      { message: "Profile unpublished." },
      { status: 200 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
