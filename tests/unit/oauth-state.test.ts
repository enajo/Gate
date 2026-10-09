import { describe, expect, it } from "vitest";

import {
  DEFAULT_OAUTH_RETURN_TO,
  createOAuthState,
  readReturnToUnverified,
  sanitizeReturnTo,
  verifyOAuthState,
} from "@/lib/oauth-state";

const PROFESSIONAL_ID = "prof_123";

function freshState(returnTo = "/app/oauth/close") {
  return createOAuthState({
    provider: "google",
    professionalId: PROFESSIONAL_ID,
    returnTo,
  });
}

describe("oauth state", () => {
  it("round-trips a state started and finished in the same browser", () => {
    const { state, nonce } = freshState();

    const verified = verifyOAuthState({ provider: "google", state, cookieNonce: nonce });

    expect(verified.professionalId).toBe(PROFESSIONAL_ID);
    expect(verified.returnTo).toBe("/app/oauth/close");
  });

  it("rejects a state whose nonce doesn't match this browser's cookie (account-linking CSRF)", () => {
    const attacker = freshState();
    const victim = freshState();

    expect(() =>
      verifyOAuthState({ provider: "google", state: attacker.state, cookieNonce: victim.nonce }),
    ).toThrow(/invalid or has expired/);
  });

  it("rejects a state when the nonce cookie is missing", () => {
    const { state } = freshState();

    expect(() =>
      verifyOAuthState({ provider: "google", state, cookieNonce: undefined }),
    ).toThrow();
  });

  it("rejects a tampered payload even with a matching nonce", () => {
    const { state, nonce } = freshState();
    const [encoded, signature] = state.split(".");
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    payload.professionalId = "someone_else";
    const forged = `${Buffer.from(JSON.stringify(payload)).toString("base64url")}.${signature}`;

    expect(() =>
      verifyOAuthState({ provider: "google", state: forged, cookieNonce: nonce }),
    ).toThrow();
  });

  it("rejects the old unsigned base64 state format", () => {
    const unsigned = Buffer.from(
      JSON.stringify({ professionalId: PROFESSIONAL_ID, returnTo: "/app" }),
    ).toString("base64url");

    expect(() =>
      verifyOAuthState({ provider: "google", state: unsigned, cookieNonce: "x" }),
    ).toThrow();
  });

  it("rejects a state issued for a different provider", () => {
    const { state, nonce } = freshState();

    expect(() =>
      verifyOAuthState({ provider: "outlook", state, cookieNonce: nonce }),
    ).toThrow();
  });

  it("rejects an expired state", () => {
    const { state, nonce } = freshState();

    expect(() =>
      verifyOAuthState({
        provider: "google",
        state,
        cookieNonce: nonce,
        now: Date.now() + 11 * 60 * 1000,
      }),
    ).toThrow();
  });

  it("never lets returnTo leave the site", () => {
    for (const hostile of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "javascript:alert(1)",
      "app/calendars",
      "/app\nSet-Cookie: x",
    ]) {
      expect(sanitizeReturnTo(hostile)).toBe(DEFAULT_OAUTH_RETURN_TO);
    }

    const { state, nonce } = freshState("https://evil.example");
    expect(verifyOAuthState({ provider: "google", state, cookieNonce: nonce }).returnTo).toBe(
      DEFAULT_OAUTH_RETURN_TO,
    );
  });

  it("falls back to the default returnTo for unreadable state on error redirects", () => {
    expect(readReturnToUnverified(null)).toBe(DEFAULT_OAUTH_RETURN_TO);
    expect(readReturnToUnverified("not-base64-json.sig")).toBe(DEFAULT_OAUTH_RETURN_TO);
    expect(readReturnToUnverified(freshState("/app/oauth/close").state)).toBe("/app/oauth/close");
  });
});
