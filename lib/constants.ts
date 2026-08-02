export const APP_NAME = "Expert Gatekeeper";
export const APP_DESCRIPTION =
  "A Google-first gated booking platform for professionals.";

export const DEFAULT_TIMEZONE = "UTC";
export const DEFAULT_SLOT_DURATION_MINUTES = 30;
export const DEFAULT_BUFFER_MINUTES = 0;
export const DEFAULT_MIN_NOTICE_HOURS = 12;
export const DEFAULT_HOLD_DURATION_MINUTES = 10;
export const DEFAULT_CALENDAR_SYNC_WINDOW_DAYS = 90;
export const MAX_QUALIFICATION_QUESTIONS = 5;
export const DEFAULT_MAX_BOOKINGS_PER_DAY = 10;
export const LOW_TOKEN_BALANCE_THRESHOLD = 500;

export const ROUTES = {
  home: "/",
  howItWorks: "/how-it-works",
  pricing: "/pricing",
  demo: "/demo",
  login: "/login",
  register: "/register",
  dashboard: "/app",
  onboarding: "/app/onboarding",
  profile: "/app/profile",
  services: "/app/services",
  qualification: "/app/qualification",
  availability: "/app/availability",
  calendars: "/app/calendars",
  accessCodes: "/app/access-codes",
  bookings: "/app/bookings",
  settings: "/app/settings",
} as const;

export const QUALIFICATION_OUTCOMES = [
  "allow",
  "reject",
  "redirect",
] as const;

export const QUALIFICATION_QUESTION_TYPES = [
  "text",
  "textarea",
  "number",
  "select",
  "yes_no",
] as const;

export const BOOKING_HOLD_STATUSES = [
  "active",
  "released",
  "expired",
  "converted",
] as const;

export const BOOKING_STATUSES = [
  "pending_code",
  "code_invalid",
  "confirmed",
  "event_creation_pending",
  "event_created",
  "cancelled",
  "failed",
] as const;

export const EVENT_CREATION_STATUSES = [
  "pending",
  "success",
  "failed",
] as const;

export const GOOGLE_ACCOUNT_STATUSES = [
  "healthy",
  "expired",
  "revoked",
  "error",
] as const;

export const GOOGLE_CALENDAR_SYNC_STATUSES = [
  "pending",
  "healthy",
  "failed",
] as const;

export const NOTIFICATION_TYPES = [
  "booking_confirmed",
  "event_created",
  "failure",
] as const;

export const NOTIFICATION_RECIPIENT_TYPES = [
  "client",
  "professional",
] as const;

export const THEME_OPTIONS = ["light", "dark", "system"] as const;