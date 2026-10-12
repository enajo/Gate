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
// Screening conversations left before the dashboard warns the expert.
export const LOW_CONVERSATION_BALANCE_THRESHOLD = 2;
export const OUTCOME_FOLLOW_UP_DELAY_DAYS = 3;
// Lead time is the single strongest, most-replicated predictor of no-shows —
// same-day bookings run roughly 2% no-show vs. up to 33% for bookings 15+
// days out. A single fixed reminder window (not configurable per professional)
// keeps this simple while still catching the vast majority of bookings.
export const BOOKING_REMINDER_HOURS_BEFORE = 24;

// Plan tiers — limits live in code, not the database, so pricing can change
// without a migration. null means unlimited. AI screening is metered in
// conversations (one visitor's whole screening chat), not tokens — the unit
// an expert can actually reason about. BUSINESS is unlimited under fair use;
// abuse is bounded by per-visitor caps and rate limits, not an allowance.
export const PLAN_TIER_LIMITS: Record<
  "FREE" | "PRO" | "BUSINESS",
  { label: string; maxActiveServices: number | null; monthlyConversations: number | null; priceUsd: number }
> = {
  FREE: { label: "Free", maxActiveServices: 1, monthlyConversations: 10, priceUsd: 0 },
  PRO: { label: "Pro", maxActiveServices: null, monthlyConversations: 100, priceUsd: 29 },
  BUSINESS: { label: "Business", maxActiveServices: null, monthlyConversations: null, priceUsd: 79 },
};

// One screening conversation's ceiling on AI calls. The gate is told to
// decide within 2–4 exchanges; this bounds a conversation that never does
// (or someone deliberately stringing one along) without touching real ones.
export const MAX_AI_CALLS_PER_CONVERSATION = 8;

// New screening conversations one visitor (by IP) can start with one
// expert per day — stops someone burning a FREE expert's monthly allowance
// on purpose. Generous for a real person who refreshes or retries.
export const MAX_CONVERSATIONS_PER_VISITOR_PER_DAY = 5;

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
// A "no response" lead coming back to a professional's page is a real
// re-engagement signal, but one alert per return spree is enough — a ghost
// browsing three pages in an afternoon shouldn't send three emails.
export const GHOST_RETURN_ALERT_COOLDOWN_DAYS = 7;
