import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { retryEventCreationJob } from "@/server/jobs/retry-event-creation.job";

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function errorResponse(error: unknown) {
  const message =
    error instanceof Error ? error.message : "An unexpected error occurred.";

  return NextResponse.json({ error: message }, { status: 400 });
}

async function isAuthorized() {
  const session = await auth();
  return Boolean(session?.user?.id);
}

export async function POST() {
  try {
    const authorized = await isAuthorized();

    if (!authorized) {
      return unauthorizedResponse();
    }

    const result = await retryEventCreationJob();

    return NextResponse.json(
      {
        ok: true,
        result,
      },
      { status: 200 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}