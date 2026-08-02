import { addDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import type {
  AvailabilityDate,
  AvailabilityTime,
  PublicSalesPageTemplateData,
} from "@/components/public-page/public-sales-page-template";
import { PublicSalesPageTemplate } from "@/components/public-page/public-sales-page-template";
import { profileRepository } from "@/server/repositories/profile.repository";
import { profileService } from "@/server/services/profile.service";
import { availabilityService } from "@/server/services/availability.service";
import type { BookableSlot } from "@/types/availability";

// ── Helpers ───────────────────────────────────────────────────────────────────

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
  }>;
};

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

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const profile = await profileService.getPublicProfileBySlug(slug);

  if (!profile) return { title: "Not Found" };

  return {
    title: `${profile.fullName} — Gate`,
    description: profile.headline ?? profile.bio ?? undefined,
    openGraph: {
      title: `${profile.fullName} — Gate`,
      description: profile.headline ?? profile.bio ?? undefined,
      images: profile.avatarUrl ? [profile.avatarUrl] : [],
    },
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function PublicProfessionalPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const { utm_source, utm_medium, utm_campaign } = await searchParams;
  const referrer = (await headers()).get("referer");

  // 1. Fetch the published profile data (returns null if not published).
  const data = await profileService.getPublicPageData(slug);
  if (!data) notFound();

  // 2. Fetch the professional's DB record for the ID + timezone.
  const professional = await profileRepository.findPublishedBySlug(slug);
  if (!professional) notFound();

  const timezone = professional.timezone || "UTC";
  const activeService =
    data.services.find((s) => s.id === data.activeServiceId) ??
    data.services[0];

  // 3. Fetch real availability slots for the active service.
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

  const pageData: PublicSalesPageTemplateData = {
    ...data,
    professionalId: professional.id,
    availableDates,
    availableTimes: [], // unused — template reads from slotsPerDate
    slotsPerDate,
    visitorSource: {
      referrer,
      utmSource: utm_source ?? null,
      utmMedium: utm_medium ?? null,
      utmCampaign: utm_campaign ?? null,
    },
  };

  return <PublicSalesPageTemplate data={pageData} />;
}
