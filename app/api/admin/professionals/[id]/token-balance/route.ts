import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { adminService } from "@/server/services/admin.service";

function forbiddenResponse() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!isAdmin(session)) return forbiddenResponse();

    const { id } = await params;
    const body = (await request.json()) as { tokenBalance?: unknown };

    if (typeof body.tokenBalance !== "number") {
      return NextResponse.json(
        { error: "tokenBalance must be a number." },
        { status: 400 },
      );
    }

    await adminService.setTokenBalance(id, body.tokenBalance);

    return NextResponse.json({ message: "Token balance updated." }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
