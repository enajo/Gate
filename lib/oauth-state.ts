import "server-only";

import { generateRandomToken, hmacSign, hmacVerify } from "@/lib/crypto";

/**
 * Signed, browser-bound OAuth `state` for the calendar connect flows,
 * shared by Google and Outlook.
 *
 * - The payload is HMAC-signed, so nobody can forge or edit it (including
 *   swapping in a different returnTo or professionalId).
 * - A random nonce is embedded in the state AND stored in an httpOnly
 *   cookie scoped to that provider's callback route. The callback only
 *   succeeds in the same browser that started the flow, which blocks
 *   account-linking CSRF: an attacker completing OAuth with their own
 *   calendar account and tricking a logged-in professional into opening
 *   the callback link.
 * - States expire after STATE_TTL_MS.
 */

export type OAuthStateProvider = "google" | "outlook";

export type OAuthStatePayload = {
  provider: OAuthStateProvider;
  professionalId: string;
  returnTo: string;
  nonce: string;
  issuedAt: number;
};

const STATE_TTL_MS = 10 * 60 * 1000;
const SIGNATURE_PURPOSE = "calendar-oauth-state";
export const DEFAULT_OAUTH_RETURN_TO = "/app/calendars";
export const OAUTH_NONCE_COOKIE_MAX_AGE_SECONDS = STATE_TTL_MS / 1000;

export function oauthNonceCookieName(provider: OAuthStateProvider): string {
  return `gate_oauth_nonce_${provider}`;
}

/** Only the callback route needs the nonce cookie, so it's never sent anywhere else. */
export function oauthNonceCookiePath(provider: OAuthStateProvider): string {
  return `/api/app/${provider}/callback`;
}

/**
 * Same-origin paths only. Rejects absolute URLs, protocol-relative
 * "//host" and "/\host" (which browsers treat as "//host"), so returnTo
 * can never become an open redirect.
 */
export function sanitizeReturnTo(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.startsWith("/\\") ||
    /[\u0000-\u001f]/.test(value)
  ) {
    return DEFAULT_OAUTH_RETURN_TO;
  }

  return value;
}

export function createOAuthState(params: {
  provider: OAuthStateProvider;
  professionalId: string;
  returnTo?: string;
}): { state: string; nonce: string } {
  const nonce = generateRandomToken(16);
  const payload: OAuthStatePayload = {
    provider: params.provider,
    professionalId: params.professionalId,
    returnTo: sanitizeReturnTo(params.returnTo),
    nonce,
    issuedAt: Date.now(),
  };

  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return { state: `${encoded}.${hmacSign(encoded, SIGNATURE_PURPOSE)}`, nonce };
}

function decodePayload(encoded: string): Partial<OAuthStatePayload> | null {
  try {
    return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

/**
 * Throws on anything wrong: missing, tampered, expired, wrong provider, or
 * a nonce that doesn't match this browser's cookie.
 */
export function verifyOAuthState(params: {
  provider: OAuthStateProvider;
  state: string | null | undefined;
  cookieNonce: string | null | undefined;
  now?: number;
}): OAuthStatePayload {
  const invalid = new Error(
    "This calendar connection link is invalid or has expired. Please try connecting again.",
  );

  const [encoded, signature, ...rest] = (params.state ?? "").split(".");

  if (!encoded || !signature || rest.length > 0) throw invalid;
  if (!hmacVerify(encoded, signature, SIGNATURE_PURPOSE)) throw invalid;

  const payload = decodePayload(encoded);
  const now = params.now ?? Date.now();

  if (
    !payload ||
    payload.provider !== params.provider ||
    typeof payload.professionalId !== "string" ||
    typeof payload.nonce !== "string" ||
    typeof payload.issuedAt !== "number" ||
    now - payload.issuedAt > STATE_TTL_MS ||
    payload.issuedAt > now + 60_000
  ) {
    throw invalid;
  }

  if (!params.cookieNonce || params.cookieNonce !== payload.nonce) {
    throw invalid;
  }

  return {
    provider: payload.provider,
    professionalId: payload.professionalId,
    returnTo: sanitizeReturnTo(payload.returnTo),
    nonce: payload.nonce,
    issuedAt: payload.issuedAt,
  };
}

/**
 * Where to send the browser when verification fails. Reading returnTo
 * without verifying is safe here only because sanitizeReturnTo limits it
 * to a same-origin path. It keeps the popup flow landing on its close page
 * instead of a full dashboard page inside the popup.
 */
export function readReturnToUnverified(state: string | null | undefined): string {
  const encoded = (state ?? "").split(".")[0];
  return sanitizeReturnTo(encoded ? decodePayload(encoded)?.returnTo : undefined);
}
