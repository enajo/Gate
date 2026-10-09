import { describe, expect, it } from "vitest";

import { availabilityService } from "@/server/services/availability.service";

// generateSlots is a pure computation layer — no repository/network calls —
// so it's tested directly with controlled rule fixtures, no mocking needed.

const PROFESSIONAL_ID = "professional_1";

// A Monday at least 14 days out, computed relative to the real clock so
// this test never drifts into the past (minimumNoticeMinutes/notice-cutoff
// logic zeroes out any window that's already behind "now").
function nextMonday(daysOut: number): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysOut);
  const day = date.getUTCDay(); // 0 = Sunday ... 1 = Monday
  const offsetToMonday = (8 - day) % 7 || 7;
  date.setUTCDate(date.getUTCDate() + offsetToMonday);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

const DAY_START = nextMonday(14);
const DAY_END = new Date(DAY_START.getTime() + 23 * 60 * 60 * 1000 + 59 * 60 * 1000);

function standardRule(overrides: Record<string, unknown> = {}) {
  return {
    id: "rule_standard",
    professionalId: PROFESSIONAL_ID,
    weekday: "MONDAY" as const,
    startTime: "09:00",
    endTime: "10:00",
    active: true,
    priorityOnly: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function priorityRule(overrides: Record<string, unknown> = {}) {
  return standardRule({
    id: "rule_priority",
    startTime: "14:00",
    endTime: "15:00",
    priorityOnly: true,
    ...overrides,
  });
}

describe("availabilityService.generateSlots — dynamic slot priority", () => {
  it("excludes priorityOnly rule slots when includePriorityRules is omitted", async () => {
    const result = await availabilityService.generateSlots({
      professionalId: PROFESSIONAL_ID,
      serviceDurationMinutes: 30,
      startDate: DAY_START,
      endDate: DAY_END,
      timezone: "UTC",
      rules: [standardRule(), priorityRule()],
      blockedDates: [],
    });

    // Only the standard rule's 09:00-10:00 window (two 30-min slots).
    expect(result.slots).toHaveLength(2);
    expect(result.slots.every((s) => s.isPriority === false)).toBe(true);
  });

  it("excludes priorityOnly rule slots when includePriorityRules is explicitly false", async () => {
    const result = await availabilityService.generateSlots({
      professionalId: PROFESSIONAL_ID,
      serviceDurationMinutes: 30,
      startDate: DAY_START,
      endDate: DAY_END,
      timezone: "UTC",
      rules: [standardRule(), priorityRule()],
      blockedDates: [],
      includePriorityRules: false,
    });

    expect(result.slots).toHaveLength(2);
  });

  it("includes and tags priorityOnly rule slots when includePriorityRules is true", async () => {
    const result = await availabilityService.generateSlots({
      professionalId: PROFESSIONAL_ID,
      serviceDurationMinutes: 30,
      startDate: DAY_START,
      endDate: DAY_END,
      timezone: "UTC",
      rules: [standardRule(), priorityRule()],
      blockedDates: [],
      includePriorityRules: true,
    });

    // 09:00-10:00 (standard, 2 slots) + 14:00-15:00 (priority, 2 slots).
    expect(result.slots).toHaveLength(4);

    const priority = result.slots.filter((s) => s.isPriority);
    const standard = result.slots.filter((s) => !s.isPriority);
    expect(priority).toHaveLength(2);
    expect(standard).toHaveLength(2);
  });

  it("never computes priorityOnly slots at all when access isn't granted — not just hides them", async () => {
    // A professional with ONLY a priorityOnly rule that day should see zero
    // bookable slots for a standard request, not an empty-but-present day.
    const result = await availabilityService.generateSlots({
      professionalId: PROFESSIONAL_ID,
      serviceDurationMinutes: 30,
      startDate: DAY_START,
      endDate: DAY_END,
      timezone: "UTC",
      rules: [priorityRule()],
      blockedDates: [],
    });

    expect(result.slots).toEqual([]);
  });
});
