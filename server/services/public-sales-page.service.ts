import "server-only";

import { addDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

import type {
  AvailabilityDate,
  AvailabilityTime,
  PublicSalesPageTemplateData,
} from "@/components/public-page/public-sales-page-template";
import { profileRepository } from "@/server/repositories/profile.repository";
import { profileService } from "@/server/services/profile.service";
import { availabilityService } from "@/server/services/availability.service";
import type { BookableSlot } from "@/types/availability";

/** Max exposure days — must cover the widest option (TWO_MONTHS = 62). */
const MAX_EXPOSURE_DAYS = 62;

/**
 * Transforms raw BookableSlot[] from the slot engine into the two shapes the
 * template needs:
 *  - availableDates  — one entry per calendar day that has ≥ 1 slot
 *  - slotsPerDate    — map of YYYY-MM-DD → AvailabilityTime[] (id = "start__end")
 */
function transformSlots(
  slots: BookableSlot[],
  timezone: string,
): {
  availableDates: AvailabilityDate[];
  slotsPerDate: Record<string, AvailabilityTime[]>;
} {
  const dateMap = new Map<
    string,
    { date: AvailabilityDate; times: AvailabilityTime[] }
  >();

  for (const slot of slots) {
    const dateKey = formatInTimeZone(slot.start, timezone, "yyyy-MM-dd");
    const dayLabel = formatInTimeZone(slot.start, timezone, "EEE"); // "Mon"
    const dayNum = formatInTimeZone(slot.start, timezone, "d");      // "5"
    const monthLabel = formatInTimeZone(slot.start, timezone, "MMM"); // "Jun"
    const timeLabel = formatInTimeZone(slot.start, timezone, "h:mm a"); // "9:00 AM"

    if (!dateMap.has(dateKey)) {
      dateMap.set(dateKey, {
        date: {
          id: dateKey,
          label: dayLabel,
          day: dayNum,
          monthLabel,
          available: true,
        },
        times: [],
      });
    }

    // Encode start + end into the time id so the template can pass them to
    // the holds endpoint without a separate lookup.
    const timeId = `${slot.start.toISOString()}__${slot.end.toISOString()}`;
    dateMap.get(dateKey)!.times.push({ id: timeId, label: timeLabel });
  }

  const sorted = [...dateMap.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  );

  return {
    availableDates: sorted.map(([, e]) => e.date),
    slotsPerDate: Object.fromEntries(sorted.map(([k, e]) => [k, e.times])),
  };
}

export type VisitorSourceInput = {
  referrer: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
};

/**
 * Everything a public professional page (the marketing `[slug]` route and
 * the iframe-embeddable `/embed/[slug]` route) needs to render
 * `PublicSalesPageTemplate`. Shared so both routes fetch and shape data
 * identically — the embed route is the same gate, just delivered with
 * different frame headers.
 */
export async function getPublicSalesPageData(
  slug: string,
  visitorSource: VisitorSourceInput,
  /** From `?service=` — a service id, for a service-specific link. Falls back to the first service if it doesn't match. */
  requestedService?: string | null,
): Promise<PublicSalesPageTemplateData | null> {
  const data = await profileService.getPublicPageData(slug);
  if (!data) return null;

  const professional = await profileRepository.findPublishedBySlug(slug);
  if (!professional) return null;

  const timezone = professional.timezone || "UTC";
  const requestedMatch = requestedService
    ? data.services.find((s) => s.id === requestedService)
    : undefined;
  const activeServiceId = requestedMatch?.id ?? data.activeServiceId;
  const activeService =
    data.services.find((s) => s.id === activeServiceId) ?? data.services[0];

  let availableDates: AvailabilityDate[] = [];
  let slotsPerDate: Record<string, AvailabilityTime[]> = {};

  if (activeService) {
    try {
      const now = new Date();
      const endDate = addDays(now, MAX_EXPOSURE_DAYS);

      const result = await availabilityService.getPublicBookableSlots({
        slug,
        serviceId: activeService.id,
        startDate: now,
        endDate,
        timezone,
      });

      const transformed = transformSlots(result.slots, timezone);
      availableDates = transformed.availableDates;
      slotsPerDate = transformed.slotsPerDate;
    } catch {
      // If the slot engine throws (e.g. no availability rules set yet),
      // gracefully fall through with empty dates — the template handles it.
    }
  }

  return {
    ...data,
    activeServiceId,
    professionalId: professional.id,
    availableDates,
    availableTimes: [], // unused — template reads from slotsPerDate
    slotsPerDate,
    visitorSource: {
      referrer: visitorSource.referrer,
      utmSource: visitorSource.utmSource ?? null,
      utmMedium: visitorSource.utmMedium ?? null,
      utmCampaign: visitorSource.utmCampaign ?? null,
    },
  };
}
