/**
 * "Want your own gate?" attribution. Every visitor to a professional's gate
 * sees it working; the link on that page and in the booking confirmation
 * brings some of them to sign up. `proxy.ts` remembers the link they
 * followed in a short-lived first-party cookie (sign-in redirects drop URL
 * parameters), and onboarding records it on the new Professional.
 */

export const SIGNUP_REF_COOKIE = "gate_signup_ref";
export const SIGNUP_REF_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export const SIGNUP_SOURCES = ["page", "embed", "email"] as const;
export type SignupSource = (typeof SIGNUP_SOURCES)[number];

export type SignupReferral = { slug: string; source: SignupSource };

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** From the link's ?via=&src= — null unless both are well-formed. */
export function parseReferralParams(via: string | null, src: string | null): SignupReferral | null {
  if (!via || via.length > 80 || !SLUG.test(via)) return null;
  if (!src || !(SIGNUP_SOURCES as readonly string[]).includes(src)) return null;
  return { slug: via, source: src as SignupSource };
}

export function encodeReferralCookie(ref: SignupReferral): string {
  return `${ref.slug}:${ref.source}`;
}

export function decodeReferralCookie(value: string | undefined): SignupReferral | null {
  if (!value) return null;
  const [slug, source] = value.split(":");
  return parseReferralParams(slug ?? null, source ?? null);
}
