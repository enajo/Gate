import "server-only";

import { randomInt } from "node:crypto";

import { hmacSign, hmacVerify } from "@/lib/crypto";
import { env } from "@/lib/env";
import { resend } from "@/lib/email";
import { logger } from "@/lib/logger";
import { emailLoginCodeRepository } from "@/server/repositories/email-login-code.repository";
import { emailService } from "@/server/services/email.service";

/**
 * Passwordless sign-in: email a 6-digit code, then exchange it for a session
 * via the "email-code" credentials provider in lib/auth.ts.
 *
 * - Codes are never stored, only a keyed hash bound to the email address.
 * - Valid for CODE_TTL_MINUTES, single use, and only the newest code works.
 * - MAX_ATTEMPTS wrong guesses burns the code. That cap is enforced in the
 *   database, so it holds even across serverless instances where the
 *   in-memory IP rate limiter doesn't.
 */

export const CODE_TTL_MINUTES = 10;
export const MAX_ATTEMPTS = 5;
/** A fresh request inside this window doesn't send another email. */
const RESEND_COOLDOWN_SECONDS = 30;
const HASH_PURPOSE = "email-login-code";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashCode(email: string, code: string): string {
  return hmacSign(`${email}:${code}`, HASH_PURPOSE);
}

export type RequestCodeResult =
  | { ok: true }
  | { ok: false; reason: "email_unavailable" };

export const emailLoginService = {
  async requestCode(rawEmail: string, now = new Date()): Promise<RequestCodeResult> {
    const email = normalizeEmail(rawEmail);

    // Without Resend, production has no way to deliver a code. Say so,
    // instead of showing a "we sent you a code" screen for a code that
    // never arrives.
    if (!resend && env.NODE_ENV === "production") {
      logger.error("emailLoginService: RESEND_API_KEY not set — email sign-in unavailable");
      return { ok: false, reason: "email_unavailable" };
    }

    const existing = await emailLoginCodeRepository.findByEmail(email);
    if (
      existing &&
      existing.expiresAt.getTime() > now.getTime() &&
      now.getTime() - existing.createdAt.getTime() < RESEND_COOLDOWN_SECONDS * 1000
    ) {
      // Same answer either way, so this can't be used to probe or spam an inbox.
      return { ok: true };
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");

    await emailLoginCodeRepository.upsertForEmail({
      email,
      codeHash: hashCode(email, code),
      expiresAt: new Date(now.getTime() + CODE_TTL_MINUTES * 60_000),
    });

    if (!resend) {
      // Development only (production returned above): there's no inbox to
      // deliver to, so print the code where the developer can see it.
      logger.info(`emailLoginService: sign-in code for ${email} is ${code} (dev only — Resend not configured)`);
      return { ok: true };
    }

    await emailService.sendLoginCode({ to: email, code, ttlMinutes: CODE_TTL_MINUTES });
    return { ok: true };
  },

  /**
   * Returns the signed-in user, or null for anything wrong (unknown email,
   * wrong, expired, burned or already-used code). Callers never learn which,
   * so it can't be used to probe for valid emails.
   */
  async verifyCode(
    rawEmail: string,
    rawCode: string,
    now = new Date(),
  ): Promise<{ id: string; email: string; name: string | null } | null> {
    const email = normalizeEmail(rawEmail);
    const code = rawCode.replace(/\D/g, "");
    if (code.length !== 6) return null;

    const row = await emailLoginCodeRepository.findByEmail(email);
    if (!row) return null;

    if (row.expiresAt.getTime() <= now.getTime() || row.attempts >= MAX_ATTEMPTS) {
      await emailLoginCodeRepository.deleteById(row.id);
      return null;
    }

    if (!hmacVerify(`${email}:${code}`, row.codeHash, HASH_PURPOSE)) {
      await emailLoginCodeRepository.recordFailedAttempt(row.id, MAX_ATTEMPTS);
      return null;
    }

    // Two requests racing with the same right code: only one consumes it.
    if (!(await emailLoginCodeRepository.consume(row.id, row.codeHash))) return null;

    const user = await emailLoginCodeRepository.upsertVerifiedUser(email);
    return { id: user.id, email: user.email, name: user.name };
  },
};
