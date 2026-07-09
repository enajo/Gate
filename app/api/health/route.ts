import { db } from "@/lib/db";

export const runtime = "nodejs";
// Disable Next.js caching — health checks must always be live.
export const dynamic = "force-dynamic";

export async function GET() {
  let dbStatus: "ok" | "error" = "ok";

  try {
    await db.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = "error";
  }

  const healthy = dbStatus === "ok";

  return Response.json(
    { status: healthy ? "ok" : "degraded", db: dbStatus },
    { status: healthy ? 200 : 503 },
  );
}
