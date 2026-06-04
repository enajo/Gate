import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { accessCodeService } from "@/server/services/access-code.service";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceId = request.nextUrl.searchParams.get("serviceId");

  if (!serviceId) {
    return NextResponse.json(
      { error: "serviceId query param is required" },
      { status: 422 },
    );
  }

  try {
    const stats = await accessCodeService.statsByService(
      session.user.id,
      serviceId,
    );
    return NextResponse.json(stats);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";

    if (message === "Professional profile not found.") {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
