import "server-only";

import {
  addDays,
  addMinutes,
  isAfter,
  isBefore,
  startOfDay,
} from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import type {
  AvailabilityRule as PrismaAvailabilityRule,
  BlockedDate as PrismaBlockedDate,
  Booking,
  BookingHold,
} from "@prisma/client";
import type {
  AvailabilityComputationResult,
  AvailabilityRule,
  AvailabilityRuleListItem,
  BlockedDate,
  BlockedDateListItem,
  BookableSlot,
  BusyTimeRange,
  CreateAvailabilityRuleInput,
  CreateBlockedDateInput,
  SlotGenerationInput,
  UpdateAvailabilityRuleInput,
  UpdateBlockedDateInput,
  Weekday,
} from "@/types/availability";
import { DEFAULT_TIMEZONE } from "@/lib/constants";
import {
  assertValidDate,
  combineDateAndTime,
  fromUtc,
} from "@/lib/dates";
import { logger } from "@/lib/logger";
import { availabilityRepository } from "@/server/repositories/availability.repository";
import { bookingRepository } from "@/server/repositories/booking.repository";
import { profileRepository } from "@/server/repositories/profile.repository";
import { serviceRepository } from "@/server/repositories/service.repository";
import { calendarProviderService } from "@/server/services/calendar-provider.service";
import {
  createAvailabilityRuleSchema,
  createBlockedDateSchema,
  updateAvailabilityRuleSchema,
  updateBlockedDateSchema,
} from "@/server/validators/availability.validator";

/**
 * Real calendar conflicts across every provider a professional has
 * connected. Fails open on error — a broken calendar sync should never be
 * the reason a visitor can't book, it should just mean conflicts against
 * that calendar aren't checked for this request.
 */
async function fetchExternalBusyRanges(params: {
  professionalId: string;
  start: Date;
  end: Date;
  timezone: string;
}): Promise<BusyTimeRange[]> {
  try {
    const merged = await calendarProviderService.getMergedBusyRanges(params);

    return merged.map((range) => ({
      start: range.start,
      end: range.end,
      source: range.sources[0]?.calendarName ?? range.sources[0]?.provider,
    }));
  } catch (error) {
    logger.error("availabilityService: failed to fetch external busy ranges", {
      professionalId: params.professionalId,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

function mapAvailabilityRule(
  rule: PrismaAvailabilityRule | null,
): AvailabilityRule | null {
  if (!rule) {
    return null;
  }

  return {
    id: rule.id,
    professionalId: rule.professionalId,
    weekday: rule.weekday,
    startTime: rule.startTime,
    endTime: rule.endTime,
    active: rule.active,
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
  };
}

function mapBlockedDate(
  blockedDate: PrismaBlockedDate | null,
): BlockedDate | null {
  if (!blockedDate) {
    return null;
  }

  return {
    id: blockedDate.id,
    professionalId: blockedDate.professionalId,
    startDateTime: blockedDate.startDateTime,
    endDateTime: blockedDate.endDateTime,
    reason: blockedDate.reason,
    createdAt: blockedDate.createdAt,
    updatedAt: blockedDate.updatedAt,
  };
}

function weekdayFromDate(date: Date, timezone: string): Weekday {
  const localDay = fromUtc(date, timezone).getDay();

  switch (localDay) {
    case 0:
      return "SUNDAY";
    case 1:
      return "MONDAY";
    case 2:
      return "TUESDAY";
    case 3:
      return "WEDNESDAY";
    case 4:
      return "THURSDAY";
    case 5:
      return "FRIDAY";
    case 6:
      return "SATURDAY";
    default:
      return "MONDAY";
  }
}

function toDateKey(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, "yyyy-MM-dd");
}

function rangesOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date,
): boolean {
  return startA < endB && endA > startB;
}

function expandRange(
  start: Date,
  end: Date,
  bufferBeforeMinutes: number,
  bufferAfterMinutes: number,
): BusyTimeRange {
  return {
    start: addMinutes(start, -bufferBeforeMinutes),
    end: addMinutes(end, bufferAfterMinutes),
  };
}

function mergeBusyRanges(ranges: BusyTimeRange[]): BusyTimeRange[] {
  if (ranges.length === 0) {
    return [];
  }

  const sorted = [...ranges].sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  );

  const merged: BusyTimeRange[] = [sorted[0]];

  for (const current of sorted.slice(1)) {
    const last = merged[merged.length - 1];

    if (current.start <= last.end) {
      last.end = new Date(
        Math.max(last.end.getTime(), current.end.getTime()),
      );
      last.source = last.source || current.source;
      continue;
    }

    merged.push({ ...current });
  }

  return merged;
}

function slotOverlapsBusyRanges(
  slotStart: Date,
  slotEnd: Date,
  ranges: BusyTimeRange[],
): boolean {
  return ranges.some((range) =>
    rangesOverlap(slotStart, slotEnd, range.start, range.end),
  );
}

function countBookingsByLocalDay(
  bookings: Booking[],
  timezone: string,
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const booking of bookings) {
    if (booking.status === "CANCELLED") {
      continue;
    }

    const key = toDateKey(booking.slotStart, timezone);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}

function buildBusyRangesFromData(params: {
  blockedDates: BlockedDate[];
  bookings: Booking[];
  holds: BookingHold[];
  externalBusyRanges: BusyTimeRange[];
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
}): BusyTimeRange[] {
  const blockedRanges = params.blockedDates.map((item) =>
    expandRange(
      item.startDateTime,
      item.endDateTime,
      params.bufferBeforeMinutes,
      params.bufferAfterMinutes,
    ),
  );

  const bookingRanges = params.bookings
    .filter((booking) => booking.status !== "CANCELLED")
    .map((booking) =>
      expandRange(
        booking.slotStart,
        booking.slotEnd,
        params.bufferBeforeMinutes,
        params.bufferAfterMinutes,
      ),
    );

  const holdRanges = params.holds
    .filter(
      (hold) =>
        hold.status === "ACTIVE" && hold.expiresAt.getTime() > Date.now(),
    )
    .map((hold) =>
      expandRange(
        hold.slotStart,
        hold.slotEnd,
        params.bufferBeforeMinutes,
        params.bufferAfterMinutes,
      ),
    );

  const externalRanges = params.externalBusyRanges.map((range) =>
    expandRange(
      range.start,
      range.end,
      params.bufferBeforeMinutes,
      params.bufferAfterMinutes,
    ),
  );

  return mergeBusyRanges([
    ...blockedRanges,
    ...bookingRanges,
    ...holdRanges,
    ...externalRanges,
  ]);
}

function generateSlotsFromWindows(input: SlotGenerationInput & {
  bookings: Booking[];
  holds: BookingHold[];
  externalBusyRanges: BusyTimeRange[];
}): AvailabilityComputationResult {
  const timezone = input.timezone || DEFAULT_TIMEZONE;
  const start = assertValidDate(input.startDate);
  const end = assertValidDate(input.endDate);

  const noticeCutoff = addMinutes(
    new Date(),
    input.minimumNoticeMinutes ?? 0,
  );

  const activeRules = input.rules.filter((rule) => rule.active);

  const bookingsPerDay = countBookingsByLocalDay(input.bookings, timezone);

  const mergedBlockedRanges = buildBusyRangesFromData({
    blockedDates: input.blockedDates,
    bookings: input.bookings,
    holds: input.holds,
    externalBusyRanges: input.externalBusyRanges,
    bufferBeforeMinutes: input.bufferBeforeMinutes ?? 0,
    bufferAfterMinutes: input.bufferAfterMinutes ?? 0,
  });

  const slots: BookableSlot[] = [];

  let localCursor = startOfDay(fromUtc(start, timezone));
  const localEndBoundary = startOfDay(fromUtc(end, timezone));

  while (localCursor <= localEndBoundary) {
    const weekday = weekdayFromDate(
      combineDateAndTime(localCursor, "00:00"),
      timezone,
    );

    const dayKey = toDateKey(
      combineDateAndTime(localCursor, "00:00"),
      timezone,
    );

    const existingBookingsThatDay = bookingsPerDay.get(dayKey) ?? 0;
    const dayRules = activeRules.filter((rule) => rule.weekday === weekday);

    if (
      dayRules.length > 0 &&
      (input.maxBookingsPerDay == null ||
        existingBookingsThatDay < input.maxBookingsPerDay)
    ) {
      for (const rule of dayRules) {
        let windowStart = combineDateAndTime(localCursor, rule.startTime);
        const windowEnd = combineDateAndTime(localCursor, rule.endTime);

        if (isBefore(windowEnd, start) || isAfter(windowStart, end)) {
          continue;
        }

        if (isBefore(windowStart, start)) {
          windowStart = start;
        }

        if (isBefore(windowStart, noticeCutoff)) {
          windowStart = noticeCutoff;
        }

        let slotStart = new Date(windowStart);

        while (
          addMinutes(slotStart, input.serviceDurationMinutes).getTime() <=
          windowEnd.getTime()
        ) {
          const slotEnd = addMinutes(slotStart, input.serviceDurationMinutes);

          if (slotEnd > end) {
            break;
          }

          if (!slotOverlapsBusyRanges(slotStart, slotEnd, mergedBlockedRanges)) {
            slots.push({
              start: new Date(slotStart),
              end: new Date(slotEnd),
            });
          }

          slotStart = addMinutes(slotStart, input.serviceDurationMinutes);
        }
      }
    }

    localCursor = addDays(localCursor, 1);
  }

  return {
    slots,
    blockedRanges: mergedBlockedRanges,
  };
}

async function requireProfessionalByUserId(userId: string) {
  const professional = await profileRepository.findByUserId(userId);

  if (!professional) {
    throw new Error("Professional profile not found.");
  }

  return professional;
}

async function requireProfessionalBySlug(slug: string) {
  const professional = await profileRepository.findBySlug(slug);

  if (!professional) {
    throw new Error("Professional profile not found.");
  }

  return professional;
}

async function requireServiceForProfessional(
  serviceId: string,
  professionalId: string,
) {
  const service = await serviceRepository.findByIdForProfessional(
    serviceId,
    professionalId,
  );

  if (!service) {
    throw new Error("Service not found.");
  }

  return service;
}

export const availabilityService = {
  async listAvailabilityRules(
    userId: string,
  ): Promise<AvailabilityRuleListItem[]> {
    const professional = await requireProfessionalByUserId(userId);
    const rules =
      await availabilityRepository.findAvailabilityRulesByProfessionalId(
        professional.id,
      );

    return rules.map((rule) => ({
      id: rule.id,
      weekday: rule.weekday,
      startTime: rule.startTime,
      endTime: rule.endTime,
      active: rule.active,
    }));
  },

  async createAvailabilityRule(
    userId: string,
    input: CreateAvailabilityRuleInput,
  ): Promise<AvailabilityRule> {
    const professional = await requireProfessionalByUserId(userId);
    const parsed = createAvailabilityRuleSchema.parse(input);

    const rule = await availabilityRepository.createAvailabilityRuleForProfessional(
      professional.id,
      {
        weekday: parsed.weekday,
        startTime: parsed.startTime,
        endTime: parsed.endTime,
        active: parsed.active ?? true,
      },
    );

    return mapAvailabilityRule(rule)!;
  },

  async updateAvailabilityRule(
    userId: string,
    ruleId: string,
    input: UpdateAvailabilityRuleInput,
  ): Promise<AvailabilityRule> {
    const professional = await requireProfessionalByUserId(userId);
    const existing =
      await availabilityRepository.findAvailabilityRuleByIdForProfessional(
        ruleId,
        professional.id,
      );

    if (!existing) {
      throw new Error("Availability rule not found.");
    }

    const parsed = updateAvailabilityRuleSchema.parse(input);

    const updated = await availabilityRepository.updateAvailabilityRuleById(
      existing.id,
      {
        ...(parsed.weekday !== undefined ? { weekday: parsed.weekday } : {}),
        ...(parsed.startTime !== undefined
          ? { startTime: parsed.startTime }
          : {}),
        ...(parsed.endTime !== undefined ? { endTime: parsed.endTime } : {}),
        ...(parsed.active !== undefined ? { active: parsed.active } : {}),
      },
    );

    return mapAvailabilityRule(updated)!;
  },

  async deleteAvailabilityRule(userId: string, ruleId: string): Promise<void> {
    const professional = await requireProfessionalByUserId(userId);
    const existing =
      await availabilityRepository.findAvailabilityRuleByIdForProfessional(
        ruleId,
        professional.id,
      );

    if (!existing) {
      throw new Error("Availability rule not found.");
    }

    await availabilityRepository.deleteAvailabilityRuleById(existing.id);
  },

  async listBlockedDates(
    userId: string,
    params?: { start?: Date | string; end?: Date | string },
  ): Promise<BlockedDateListItem[]> {
    const professional = await requireProfessionalByUserId(userId);

    const blockedDates =
      params?.start && params?.end
        ? await availabilityRepository.findBlockedDatesInRange({
            professionalId: professional.id,
            start: assertValidDate(params.start),
            end: assertValidDate(params.end),
          })
        : await availabilityRepository.findBlockedDatesByProfessionalId(
            professional.id,
          );

    return blockedDates.map((item) => ({
      id: item.id,
      startDateTime: item.startDateTime,
      endDateTime: item.endDateTime,
      reason: item.reason,
    }));
  },

  async createBlockedDate(
    userId: string,
    input: CreateBlockedDateInput,
  ): Promise<BlockedDate> {
    const professional = await requireProfessionalByUserId(userId);
    const parsed = createBlockedDateSchema.parse(input);

    const blockedDate = await availabilityRepository.createBlockedDateForProfessional(
      professional.id,
      {
        startDateTime: assertValidDate(parsed.startDateTime),
        endDateTime: assertValidDate(parsed.endDateTime),
        reason: parsed.reason ?? null,
      },
    );

    return mapBlockedDate(blockedDate)!;
  },

  async updateBlockedDate(
    userId: string,
    blockedDateId: string,
    input: UpdateBlockedDateInput,
  ): Promise<BlockedDate> {
    const professional = await requireProfessionalByUserId(userId);
    const existing =
      await availabilityRepository.findBlockedDateByIdForProfessional(
        blockedDateId,
        professional.id,
      );

    if (!existing) {
      throw new Error("Blocked date not found.");
    }

    const parsed = updateBlockedDateSchema.parse(input);

    const updated = await availabilityRepository.updateBlockedDateById(
      existing.id,
      {
        ...(parsed.startDateTime !== undefined
          ? { startDateTime: assertValidDate(parsed.startDateTime) }
          : {}),
        ...(parsed.endDateTime !== undefined
          ? { endDateTime: assertValidDate(parsed.endDateTime) }
          : {}),
        ...(parsed.reason !== undefined ? { reason: parsed.reason ?? null } : {}),
      },
    );

    return mapBlockedDate(updated)!;
  },

  async deleteBlockedDate(
    userId: string,
    blockedDateId: string,
  ): Promise<void> {
    const professional = await requireProfessionalByUserId(userId);
    const existing =
      await availabilityRepository.findBlockedDateByIdForProfessional(
        blockedDateId,
        professional.id,
      );

    if (!existing) {
      throw new Error("Blocked date not found.");
    }

    await availabilityRepository.deleteBlockedDateById(existing.id);
  },

  async generateSlots(
    input: SlotGenerationInput & {
      bookings?: Booking[];
      holds?: BookingHold[];
      externalBusyRanges?: BusyTimeRange[];
    },
  ): Promise<AvailabilityComputationResult> {
    return generateSlotsFromWindows({
      ...input,
      bookings: input.bookings ?? [],
      holds: input.holds ?? [],
      externalBusyRanges: input.externalBusyRanges ?? [],
    });
  },

  async getBookableSlotsForService(params: {
    professionalId: string;
    serviceId: string;
    startDate: Date | string;
    endDate: Date | string;
    timezone?: string;
    externalBusyRanges?: BusyTimeRange[];
  }): Promise<AvailabilityComputationResult> {
    const professional = await profileRepository.findById(params.professionalId);

    if (!professional) {
      throw new Error("Professional profile not found.");
    }

    const service = await requireServiceForProfessional(
      params.serviceId,
      professional.id,
    );

    const start = assertValidDate(params.startDate);
    const end = assertValidDate(params.endDate);

    const { rules, blockedDates } =
      await availabilityRepository.getAvailabilityData({
        professionalId: professional.id,
        start,
        end,
      });

    const bookings = await bookingRepository.findBookingsInRange({
      professionalId: professional.id,
      start,
      end,
    });

    const holds = (await bookingRepository.findBookingHoldsByProfessionalId(
      professional.id,
    )).filter(
      (hold) =>
        hold.status === "ACTIVE" &&
        hold.expiresAt.getTime() > Date.now() &&
        rangesOverlap(hold.slotStart, hold.slotEnd, start, end),
    );

    const timezone = params.timezone ?? professional.timezone ?? DEFAULT_TIMEZONE;

    // Real calendar conflicts, across every provider connected — not just
    // whatever was passed in explicitly. Callers can still override with
    // externalBusyRanges (e.g. a preview that shouldn't hit real calendars).
    const externalBusyRanges =
      params.externalBusyRanges ??
      (await fetchExternalBusyRanges({
        professionalId: professional.id,
        start,
        end,
        timezone,
      }));

    return this.generateSlots({
      professionalId: professional.id,
      serviceDurationMinutes: service.durationMinutes,
      startDate: start,
      endDate: end,
      timezone,
      rules: rules.map((rule) => mapAvailabilityRule(rule)!),
      blockedDates: blockedDates.map((item) => mapBlockedDate(item)!),
      busyRanges: externalBusyRanges,
      externalBusyRanges,
      bufferBeforeMinutes: professional.bufferBeforeMinutes,
      bufferAfterMinutes: professional.bufferAfterMinutes,
      minimumNoticeMinutes: professional.minimumNoticeMinutes,
      maxBookingsPerDay: professional.maxBookingsPerDay,
      bookings,
      holds,
    });
  },

  async getPublicBookableSlots(params: {
    slug: string;
    serviceId: string;
    startDate: Date | string;
    endDate: Date | string;
    timezone?: string;
    externalBusyRanges?: BusyTimeRange[];
  }): Promise<AvailabilityComputationResult> {
    const professional = await requireProfessionalBySlug(params.slug);

    return this.getBookableSlotsForService({
      professionalId: professional.id,
      serviceId: params.serviceId,
      startDate: params.startDate,
      endDate: params.endDate,
      timezone: params.timezone,
      externalBusyRanges: params.externalBusyRanges,
    });
  },
};