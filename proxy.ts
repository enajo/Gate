import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import {
  encodeReferralCookie,
  parseReferralParams,
  SIGNUP_REF_COOKIE,
  SIGNUP_REF_MAX_AGE_SECONDS,
} from "@/lib/signup-referral";

const AUTH_ROUTES = ["/login", "/register"];
const PROTECTED_PREFIXES = ["/app", "/admin"];

function hasSessionCookie(request: NextRequest) {
  const possibleSessionCookies = [
    "authjs.session-token",
    "__Secure-authjs.session-token",
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
  ];

  return possibleSessionCookies.some((name) => request.cookies.has(name));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const start = Date.now();

  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));
  const isProtectedRoute = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );

  const isAuthenticated = hasSessionCookie(request);

  let response: NextResponse;

  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    response = NextResponse.redirect(loginUrl);
  } else if (isAuthRoute && isAuthenticated) {
    response = NextResponse.redirect(new URL("/app", request.url));
  } else {
    response = NextResponse.next({
      request: {
        headers: new Headers({
          ...Object.fromEntries(request.headers),
          "x-request-id": requestId,
          "x-pathname": pathname,
        }),
      },
    });
  }

  // Arrived via a gate's "Want your own gate?" link — remember which one
  // until they finish onboarding (sign-in redirects drop the query string).
  const referral = parseReferralParams(
    request.nextUrl.searchParams.get("via"),
    request.nextUrl.searchParams.get("src"),
  );
  if (referral && !isAuthenticated) {
    response.cookies.set(SIGNUP_REF_COOKIE, encodeReferralCookie(referral), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: SIGNUP_REF_MAX_AGE_SECONDS,
      path: "/",
    });
  }

  // Attach request ID to every response so clients and Sentry can correlate
  response.headers.set("x-request-id", requestId);

  logger.info("request", {
    requestId,
    method:     request.method,
    path:       pathname,
    status:     response.status,
    durationMs: Date.now() - start,
  });

  return response;
}

export const config = {
  matcher: ["/", "/app/:path*", "/admin/:path*", "/login", "/register"],
};
