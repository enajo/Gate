import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { logger } from "@/lib/logger";
import { getClientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import {
  emailLoginService,
  normalizeEmail,
} from "@/server/services/email-login.service";

const requestCodeSchema = z
  .object({ email: z.string().trim().email().max(320) })
  .strict();

// Per IP: blunts one machine spraying many inboxes.
const IP_LIMIT = 10;
const IP_WINDOW = 10 * 60 * 1000;
// Per email: blunts many machines flooding one inbox.
const EMAIL_LIMIT = 5;
const EMAIL_WINDOW = 60 * 60 * 1000;

// POST /api/public/login-code — emails a 6-digit sign-in code.
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const ipResult = await rateLimit(`login-code:ip:${ip}`, IP_LIMIT, IP_WINDOW);
  if (!ipResult.allowed) return tooManyRequests(ipResult.resetAt);

  try {
    const input = requestCodeSchema.parse(await request.json());

    const emailResult = await rateLimit(
      `login-code:email:${normalizeEmail(input.email)}`,
      EMAIL_LIMIT,
      EMAIL_WINDOW,
    );
    if (!emailResult.allowed) return tooManyRequests(emailResult.resetAt);

    const result = await emailLoginService.requestCode(input.email);

    if (!result.ok) {
      return NextResponse.json(
        { error: "Email sign-in isn't available right now. Please continue with Google." },
        { status: 503 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 422 },
      );
    }

    logger.error("POST /api/public/login-code failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Couldn't send a code. Please try again." },
      { status: 500 },
    );
  }
}
