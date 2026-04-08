export type CalendarProvider = "GOOGLE" | "OUTLOOK";

export type CalendarSyncStatus =
  | "PENDING"
  | "CONNECTED"
  | "SYNCING"
  | "ERROR"
  | "EXPIRED"
  | "DISCONNECTED";

export type CalendarEventSyncStatus =
  | "PENDING"
  | "CREATED"
  | "UPDATED"
  | "FAILED"
  | "CANCELLED";

export type CalendarAccount = {
  id: string;
  professionalId: string;
  provider: CalendarProvider;
  externalAccountId: string;
  externalCalendarId?: string | null;
  providerEmail?: string | null;
  calendarName?: string | null;
  calendarTimeZone?: string | null;
  accessTokenEncrypted: string;
  refreshTokenEncrypted?: string | null;
  syncStatus: CalendarSyncStatus;
  isActive: boolean;
  useForConflictCheck: boolean;
  isDefaultEventCalendar: boolean;
  lastSyncedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateCalendarAccountInput = {
  provider: CalendarProvider;
  externalAccountId: string;
  externalCalendarId?: string | null;
  providerEmail?: string | null;
  calendarName?: string | null;
  calendarTimeZone?: string | null;
  accessTokenEncrypted: string;
  refreshTokenEncrypted?: string | null;
  syncStatus?: CalendarSyncStatus;
  isActive?: boolean;
  useForConflictCheck?: boolean;
  isDefaultEventCalendar?: boolean;
  lastSyncedAt?: Date | null;
};

export type UpdateCalendarAccountInput =
  Partial<CreateCalendarAccountInput>;

export type CalendarAccountListItem = Pick<
  CalendarAccount,
  | "id"
  | "provider"
  | "providerEmail"
  | "calendarName"
  | "calendarTimeZone"
  | "syncStatus"
  | "isActive"
  | "useForConflictCheck"
  | "isDefaultEventCalendar"
  | "lastSyncedAt"
>;

export type GoogleOAuthUrlParams = {
  accessType?: "offline" | "online";
  prompt?: "consent" | "none" | "select_account";
  state?: string;
};

export type GoogleOAuthTokens = {
  accessToken: string;
  refreshToken?: string | null;
  expiryDate?: number | null;
  scope?: string | null;
  tokenType?: string | null;
  idToken?: string | null;
};

export type GoogleCalendarListItem = {
  id: string;
  summary: string;
  description?: string | null;
  primary?: boolean;
  selected?: boolean;
  accessRole?: string | null;
  timeZone?: string | null;
  backgroundColor?: string | null;
  foregroundColor?: string | null;
};

export type GoogleFreeBusyTimeRange = {
  start: Date;
  end: Date;
};

export type GoogleFreeBusyCalendar = {
  calendarId: string;
  busy: GoogleFreeBusyTimeRange[];
};

export type GoogleFreeBusyResponse = {
  timeMin: string;
  timeMax: string;
  calendars: GoogleFreeBusyCalendar[];
};

export type CalendarConflictSource = {
  calendarAccountId: string;
  calendarName?: string | null;
  provider: CalendarProvider;
};

export type MergedBusyRange = {
  start: Date;
  end: Date;
  sources: CalendarConflictSource[];
};

export type CalendarEventAttendee = {
  email: string;
  displayName?: string;
  optional?: boolean;
};

export type CreateCalendarEventInput = {
  calendarAccountId: string;
  title: string;
  description?: string | null;
  start: Date | string;
  end: Date | string;
  timeZone: string;
  attendees: CalendarEventAttendee[];
  location?: string | null;
  conferenceDataVersion?: number;
};

export type UpdateCalendarEventInput = {
  calendarAccountId: string;
  externalEventId: string;
  title?: string;
  description?: string | null;
  start?: Date | string;
  end?: Date | string;
  timeZone?: string;
  attendees?: CalendarEventAttendee[];
  location?: string | null;
};

export type CreatedCalendarEvent = {
  externalEventId: string;
  eventUrl?: string | null;
  meetingUrl?: string | null;
  status: CalendarEventSyncStatus;
};

export type SyncCalendarBusyTimesInput = {
  professionalId: string;
  start: Date | string;
  end: Date | string;
  timezone: string;
};

export type DefaultEventCalendarSelectionInput = {
  professionalId: string;
  calendarAccountId: string;
};

export type ToggleCalendarConflictCheckInput = {
  professionalId: string;
  calendarAccountId: string;
  useForConflictCheck: boolean;
};

export type GoogleCallbackPayload = {
  code: string;
  state?: string;
};

export type GoogleConnectedCalendarSummary = {
  accountId: string;
  email?: string | null;
  calendars: GoogleCalendarListItem[];
};