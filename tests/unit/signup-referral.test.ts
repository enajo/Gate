import { describe, expect, it } from "vitest";

import {
  decodeReferralCookie,
  encodeReferralCookie,
  parseReferralParams,
} from "@/lib/signup-referral";

describe("signup referral", () => {
  it("accepts a well-formed slug and a known source", () => {
    expect(parseReferralParams("sarah-malik", "page")).toEqual({ slug: "sarah-malik", source: "page" });
    expect(parseReferralParams("john-carter", "email")).toEqual({ slug: "john-carter", source: "email" });
  });

  it.each([
    ["missing slug", null, "page"],
    ["missing source", "sarah-malik", null],
    ["unknown source", "sarah-malik", "twitter"],
    ["uppercase slug", "Sarah-Malik", "page"],
    ["slug with a separator", "sarah:page", "page"],
    ["slug with markup", "<script>", "page"],
    ["over-long slug", "a".repeat(81), "page"],
  ])("rejects %s", (_label, via, src) => {
    expect(parseReferralParams(via, src)).toBeNull();
  });

  it("round-trips through the cookie, and rejects a tampered one", () => {
    const ref = { slug: "sarah-malik", source: "embed" as const };
    expect(decodeReferralCookie(encodeReferralCookie(ref))).toEqual(ref);

    expect(decodeReferralCookie(undefined)).toBeNull();
    expect(decodeReferralCookie("sarah-malik:admin")).toBeNull();
    expect(decodeReferralCookie("../etc:page")).toBeNull();
  });
});
