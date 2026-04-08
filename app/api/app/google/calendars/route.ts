import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { googleSyncService } from "@/server/services/google-sync.service";

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function errorResponse(error: unknown) {
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

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const calendars = await googleSyncService.listConnectedCalendars(userId);

    return NextResponse.json(
      {
        calendars,
      },
      { status: 200 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}