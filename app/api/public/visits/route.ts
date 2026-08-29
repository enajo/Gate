import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { generateRandomToken } from "@/lib/crypto";
import { logger } from "@/lib/logger";
import { getClientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { visitRepository } from "@/server/repositories/visit.repository";

const VISITOR_COOKIE = "gate_visitor_id";
const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

const visitSchema = z
  .object({
    professionalId: z.string().trim().min(1),
    referrer: z.string().trim().max(500).nullish(),
    utmSource: z.string().trim().max(200).nullish(),
    utmMedium: z.string().trim().max(200).nullish(),
    utmCampaign: z.string().trim().max(200).nullish(),
    landingPath: z.string().trim().max(500).nullish(),
  })
  .strict();

const VISIT_LIMIT = 30;
const VISIT_WINDOW = 5 * 60 * 1000;

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const result = rateLimit(`public:visits:${ip}`, VISIT_LIMIT, VISIT_WINDOW);
  if (!result.allowed) return tooManyRequests(result.resetAt);

  try {
    const json = (await request.json()) as Record<string, unknown>;
    const input = visitSchema.parse(json);

    const cookieStore = await cookies();
    let visitorId = cookieStore.get(VISITOR_COOKIE)?.value;

    if (!visitorId) {
      visitorId = generateRandomToken(16);
      cookieStore.set(VISITOR_COOKIE, visitorId, {
        maxAge: VISITOR_COOKIE_MAX_AGE,
        path: "/",
        sameSite: "lax",
        httpOnly: true,
      });
    }

    await visitRepository.createVisit({
      professionalId: input.professionalId,
      visitorId,
      referrer: input.referrer ?? null,
      utmSource: input.utmSource ?? null,
      utmMedium: input.utmMedium ?? null,
      utmCampaign: input.utmCampaign ?? null,
      landingPath: input.landingPath ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.flatten() },
        { status: 422 },
      );
    }

    // Fail open — a visit-logging failure should never surface to the visitor.
    logger.error("POST /api/public/visits failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ ok: false });
  }
}
