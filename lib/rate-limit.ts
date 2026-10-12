/**
 * Fixed-window rate limiter backed by Postgres (`rate_limit_counters`).
 *
 * The counter lives in the database rather than in memory because Vercel
 * runs many short-lived instances — an in-process Map gave each one its own
 * count, so limits were mostly lost. One atomic upsert per check keeps it
 * correct under concurrency without a new vendor.
 *
 * Keys are SHA-256 hashed before storage, so raw IPs and emails never land
 * in the table.
 */

import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export interface RateLimitResult {
  allowed:   boolean;
  remaining: number;
  resetAt:   number; // Unix ms
}

// Expired rows are harmless (the upsert resets them), so pruning is
// occasional housekeeping, not correctness.
const PRUNE_PROBABILITY = 0.01;

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

async function pruneExpired(now: Date) {
  try {
    await db.rateLimitCounter.deleteMany({ where: { resetAt: { lt: now } } });
  } catch (error) {
    logger.warn("rate-limit: prune failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Check and increment the counter for `key`.
 * @param key      Unique identifier — typically `"${route}:${ip}"`
 * @param limit    Max requests allowed in the window
 * @param windowMs Window size in milliseconds
 *
 * Fails open: if the database is unreachable the request is allowed, same as
 * the rest of the app's fail-open philosophy — a limiter outage must never
 * take public pages down with it.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = new Date();
  const freshResetAt = new Date(now.getTime() + windowMs);

  try {
    const rows = await db.$queryRaw<Array<{ count: number; reset_at: Date }>>`
      INSERT INTO "rate_limit_counters" ("key", "count", "reset_at")
      VALUES (${hashKey(key)}, 1, ${freshResetAt})
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE
          WHEN "rate_limit_counters"."reset_at" <= ${now} THEN 1
          ELSE "rate_limit_counters"."count" + 1
        END,
        "reset_at" = CASE
          WHEN "rate_limit_counters"."reset_at" <= ${now} THEN EXCLUDED."reset_at"
          ELSE "rate_limit_counters"."reset_at"
        END
      RETURNING "count", "reset_at"
    `;

    if (Math.random() < PRUNE_PROBABILITY) void pruneExpired(now);

    const row = rows[0];
    const count = Number(row?.count ?? 1);
    const resetAt = (row?.reset_at ?? freshResetAt).getTime();

    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetAt,
    };
  } catch (error) {
    logger.error("rate-limit: counter unavailable — allowing request", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { allowed: true, remaining: limit, resetAt: freshResetAt.getTime() };
  }
}

/** Pull the real client IP from standard proxy headers. */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

/** Standard 429 response with Retry-After header. */
export function tooManyRequests(resetAt: number): NextResponse {
  const retryAfterSecs = Math.ceil((resetAt - Date.now()) / 1000);
  return NextResponse.json(
    { error: "Too many requests. Please slow down and try again shortly." },
    {
      status: 429,
      headers: {
        "Retry-After":       String(retryAfterSecs),
        "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
      },
    },
  );
}
