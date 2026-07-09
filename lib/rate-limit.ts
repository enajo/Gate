/**
 * In-memory fixed-window rate limiter.
 *
 * Good enough for a single-instance deployment. When you scale to multiple
 * instances (e.g. multiple Vercel regions), replace the Map with an Upstash
 * Redis counter — the API stays identical.
 */

import { NextResponse } from "next/server";

type Window = { count: number; resetAt: number };

const store = new Map<string, Window>();

// Prune expired windows every 10 minutes so the map doesn't grow unbounded
setInterval(
  () => {
    const now = Date.now();
    for (const [key, win] of store) {
      if (now > win.resetAt) store.delete(key);
    }
  },
  10 * 60 * 1000,
);

export interface RateLimitResult {
  allowed:   boolean;
  remaining: number;
  resetAt:   number; // Unix ms
}

/**
 * Check and increment the counter for `key`.
 * @param key      Unique identifier — typically `"${route}:${ip}"`
 * @param limit    Max requests allowed in the window
 * @param windowMs Window size in milliseconds
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const win = store.get(key);

  if (!win || now > win.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (win.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: win.resetAt };
  }

  win.count++;
  return { allowed: true, remaining: limit - win.count, resetAt: win.resetAt };
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
