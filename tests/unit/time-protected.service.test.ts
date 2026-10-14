import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/repositories/booking.repository", () => ({ bookingRepository: {} }));
vi.mock("@/server/repositories/profile.repository", () => ({ profileRepository: {} }));

import {
  formatTimeProtected,
  summarizeTimeProtected,
} from "@/server/services/time-protected.service";

const lead = (
  qualificationResult: "QUALIFIED" | "REJECTED" | "REDIRECTED" | "PENDING_REVIEW",
  durationMinutes: number,
  correctedResult: "QUALIFIED" | "REJECTED" | "REDIRECTED" | null = null,
) => ({ qualificationResult, correctedResult, service: { durationMinutes } });

describe("summarizeTimeProtected", () => {
  it("counts each unbooked rejection as a protected call, at its service's length", () => {
    expect(summarizeTimeProtected([lead("REJECTED", 45), lead("REJECTED", 60)])).toEqual({
      calls: 2,
      minutes: 105,
    });
  });

  it("never counts a qualified visitor, including auto-qualified let-throughs", () => {
    expect(summarizeTimeProtected([lead("QUALIFIED", 60)])).toEqual({ calls: 0, minutes: 0 });
  });

  it("doesn't count a rejection the professional overturned — that was a lost client", () => {
    expect(summarizeTimeProtected([lead("REJECTED", 60, "QUALIFIED")])).toEqual({ calls: 0, minutes: 0 });
    // Confirming the rejection keeps it counted.
    expect(summarizeTimeProtected([lead("REJECTED", 60, "REJECTED")])).toEqual({ calls: 1, minutes: 60 });
  });

  it("only counts the gate's own rejections — not visitors it let through who just didn't book", () => {
    expect(summarizeTimeProtected([lead("QUALIFIED", 30, "REJECTED")])).toEqual({ calls: 0, minutes: 0 });
  });

  it("still counts older redirected leads", () => {
    expect(summarizeTimeProtected([lead("REDIRECTED", 30)])).toEqual({ calls: 1, minutes: 30 });
  });
});

describe("formatTimeProtected", () => {
  it.each([
    [1, "1 minute"],
    [45, "45 minutes"],
    [60, "1 hour"],
    [90, "1.5 hours"],
    [390, "6.5 hours"],
  ])("%i minutes → %s", (minutes, label) => {
    expect(formatTimeProtected(minutes)).toBe(label);
  });
});
