// Outlook/Microsoft-Graph-API-shaped types only. Provider-neutral contracts
// (CalendarProviderAdapter, MergedBusyRange, CreateCalendarEventInput, etc.)
// already live in types/google.ts despite the filename — import those
// instead of redeclaring them here.

export type OutlookOAuthTokens = {
  accessToken: string;
  refreshToken?: string | null;
  expiryDate?: number | null;
  scope?: string | null;
  tokenType?: string | null;
};

export type OutlookCallbackPayload = {
  code: string;
  state?: string;
};

export type OutlookCalendarListItem = {
  id: string;
  name: string;
  isDefaultCalendar?: boolean;
  canEdit?: boolean;
  owner?: {
    name?: string | null;
    address?: string | null;
  } | null;
};

export type OutlookScheduleStatus =
  | "free"
  | "tentative"
  | "busy"
  | "oof"
  | "workingElsewhere"
  | "unknown";

export type OutlookScheduleItem = {
  status: OutlookScheduleStatus;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
};

export type OutlookGetScheduleResponse = {
  value?: Array<{
    scheduleId: string;
    scheduleItems?: OutlookScheduleItem[];
  }>;
};
