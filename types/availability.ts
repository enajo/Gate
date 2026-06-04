export type Weekday =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export type AvailabilityExposure =
  | "THREE_DAYS"
  | "FIVE_DAYS"
  | "ONE_WEEK"
  | "TWO_WEEKS"
  | "ALL";

export type AvailabilityRule = {
  id: string;
  professionalId: string;
  weekday: Weekday;
  startTime: string;
  endTime: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type BlockedDate = {
  id: string;
  professionalId: string;
  startDateTime: Date;
  endDateTime: Date;
  reason?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateAvailabilityRuleInput = {
  weekday: Weekday;
  startTime: string;
  endTime: string;
  active?: boolean;
};

export type UpdateAvailabilityRuleInput = Partial<CreateAvailabilityRuleInput>;

export type CreateBlockedDateInput = {
  startDateTime: Date | string;
  endDateTime: Date | string;
  reason?: string | null;
};

export type UpdateBlockedDateInput = Partial<CreateBlockedDateInput>;

export type AvailabilityWindow = {
  start: Date;
  end: Date;
};

export type BusyTimeRange = {
  start: Date;
  end: Date;
  source?: string;
};

export type BookableSlot = {
  id?: string;
  start: Date;
  end: Date;
};

export type PublicBookableSlot = {
  id: string;
  start: string;
  end: string;
  label: string;
  day: string;
  dateLabel: string;
  monthLabel: string;
};

export type AvailabilitySettings = {
  timezone: string;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  minimumNoticeMinutes: number;
  maxBookingsPerDay?: number | null;
  availabilityExposure: AvailabilityExposure;
};

export type SlotGenerationInput = {
  professionalId: string;
  serviceDurationMinutes: number;
  startDate: Date | string;
  endDate: Date | string;
  timezone: string;
  rules: AvailabilityRule[];
  blockedDates: BlockedDate[];
  busyRanges?: BusyTimeRange[];
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  minimumNoticeMinutes?: number;
  maxBookingsPerDay?: number | null;
  availabilityExposure?: AvailabilityExposure;
};

export type AvailabilityComputationResult = {
  slots: BookableSlot[];
  blockedRanges: BusyTimeRange[];
};

export type DailyAvailability = {
  date: string;
  slots: BookableSlot[];
};

export type AvailabilityRangeQuery = {
  startDate: string;
  endDate: string;
  timezone?: string;
  exposure?: AvailabilityExposure;
};

export type BookingConflictCheckInput = {
  slotStart: Date | string;
  slotEnd: Date | string;
  busyRanges: BusyTimeRange[];
  blockedDates: BlockedDate[];
};

export type AvailabilityRuleListItem = Pick<
  AvailabilityRule,
  "id" | "weekday" | "startTime" | "endTime" | "active"
>;

export type BlockedDateListItem = Pick<
  BlockedDate,
  "id" | "startDateTime" | "endDateTime" | "reason"
>;