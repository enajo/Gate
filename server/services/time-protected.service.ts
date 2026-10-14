import "server-only";

import type { LeadQualificationResult } from "@prisma/client";

import { bookingRepository } from "@/server/repositories/booking.repository";
import { profileRepository } from "@/server/repositories/profile.repository";

export type TimeProtected = {
  /** Calls the gate kept off the calendar. */
  calls: number;
  minutes: number;
};

type UnbookedLead = {
  qualificationResult: LeadQualificationResult;
  correctedResult: LeadQualificationResult | null;
  service: { durationMinutes: number };
};

const TURNED_AWAY: LeadQualificationResult[] = ["REJECTED", "REDIRECTED"];

/**
 * A call counts as protected when the gate turned someone away and no
 * booking happened. Deliberately conservative:
 * - The gate's own call only — a visitor it let through who simply didn't
 *   book wasn't stopped by Gate, even if the expert later marks them a bad
 *   fit.
 * - Unbooked only — in Triage a rejected visitor can still book, and that
 *   call wasn't saved.
 * - A rejection the professional overturned (marked QUALIFIED) doesn't
 *   count — that was a lost client, not saved time.
 * - Auto-qualified let-throughs (outage, allowance used up) are QUALIFIED,
 *   so they never count.
 * - Service length only, not buffers or prep time.
 */
export function summarizeTimeProtected(leads: UnbookedLead[]): TimeProtected {
  let calls = 0;
  let minutes = 0;

  for (const lead of leads) {
    if (!TURNED_AWAY.includes(lead.qualificationResult)) continue;
    if (lead.correctedResult === "QUALIFIED") continue;

    calls += 1;
    minutes += lead.service.durationMinutes;
  }

  return { calls, minutes };
}

/** "6.5 hours", "45 minutes", "1 hour". */
export function formatTimeProtected(minutes: number): string {
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;

  const hours = Math.round((minutes / 60) * 10) / 10;
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

export const timeProtectedService = {
  async forProfessional(professionalId: string, since: Date): Promise<TimeProtected> {
    return summarizeTimeProtected(
      await bookingRepository.findUnbookedLeadsWithDuration(professionalId, since),
    );
  },

  async forUser(userId: string, since: Date): Promise<TimeProtected> {
    const professional = await profileRepository.findByUserId(userId);
    if (!professional) return { calls: 0, minutes: 0 };
    return this.forProfessional(professional.id, since);
  },
};
