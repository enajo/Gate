import {
  addMinutes,
  endOfDay,
  format,
  isValid,
  parseISO,
  startOfDay,
} from "date-fns";
import {
  formatInTimeZone,
  fromZonedTime,
  toZonedTime,
} from "date-fns-tz";

import { DEFAULT_TIMEZONE } from "@/lib/constants";

export type DateInput = Date | string | number;

export function toDate(value: DateInput): Date {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string") {
    return parseISO(value);
  }

  return new Date(value);
}

export function isValidDate(value: DateInput): boolean {
  return isValid(toDate(value));
}

export function assertValidDate(
  value: DateInput,
  message = "Invalid date value",
): Date {
  const date = toDate(value);

  if (!isValid(date)) {
    throw new Error(message);
  }

  return date;
}

export function formatDate(
  value: DateInput,
  pattern = "yyyy-MM-dd",
): string {
  return format(assertValidDate(value), pattern);
}

export function formatDateTime(
  value: DateInput,
  timezone = DEFAULT_TIMEZONE,
  pattern = "yyyy-MM-dd HH:mm",
): string {
  return formatInTimeZone(assertValidDate(value), timezone, pattern);
}

export function formatTime(
  value: DateInput,
  timezone = DEFAULT_TIMEZONE,
  pattern = "HH:mm",
): string {
  return formatInTimeZone(assertValidDate(value), timezone, pattern);
}

export function toUtc(value: DateInput, timezone: string): Date {
  return fromZonedTime(assertValidDate(value), timezone);
}

export function fromUtc(value: DateInput, timezone: string): Date {
  return toZonedTime(assertValidDate(value), timezone);
}

export function addMinutesToDate(
  value: DateInput,
  minutes: number,
): Date {
  return addMinutes(assertValidDate(value), minutes);
}

export function getUtcDayBounds(
  value: DateInput,
  timezone: string,
): { start: Date; end: Date } {
  const zonedDate = toZonedTime(assertValidDate(value), timezone);

  const start = fromZonedTime(startOfDay(zonedDate), timezone);
  const end = fromZonedTime(endOfDay(zonedDate), timezone);

  return { start, end };
}

export function combineDateAndTime(
  date: DateInput,
  time: string,
): Date {
  const safeDate = assertValidDate(date);

  const [hours, minutes] = time.split(":").map(Number);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new Error(`Invalid time value: ${time}`);
  }

  const combined = new Date(safeDate);

  combined.setHours(hours, minutes, 0, 0);

  return combined;
}

export function toIsoString(value: DateInput): string {
  return assertValidDate(value).toISOString();
}

export function now(): Date {
  return new Date();
}