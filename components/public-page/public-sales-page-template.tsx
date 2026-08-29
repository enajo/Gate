"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  CreditCard,
  KeyRound,
  LockKeyhole,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";

import { ConversationGate } from "@/components/public-page/conversation-gate";

type GateStep = "access" | "gate" | "processing" | "time" | "details" | "confirmed";

export type AvailabilityExposure =
  | "THREE_DAYS"
  | "FIVE_DAYS"
  | "TWO_WEEKS"
  | "ONE_MONTH"
  | "TWO_MONTHS";

export type GateQuestion = {
  id: string;
  label: string;
  type: "textarea" | "select" | "text";
  required?: boolean;
  options?: string[];
};

export type AvailabilityDate = {
  id: string;
  label: string;
  day: string;
  monthLabel: string;
  disabled?: boolean;
  available?: boolean;
};

export type AvailabilityTime = {
  id: string;
  label: string;
};

export type PublicMetric = {
  id: string;
  label: string;
};

export type PublicReview = {
  id: string;
  quote: string;
  author: string;
  role?: string;
  rating?: number;
};

export type PublicService = {
  id: string;
  title: string;
  headline: string;
  duration: string;
  format: string;
  price?: string;
  currency?: string;

  qualificationRequired: boolean;
  paymentRequired: boolean;
  accessCodeRequired: boolean;
  manualApprovalRequired: boolean;
  availabilityExposure: AvailabilityExposure;
  currentAccessCode?: string;
  /** When set, marks this as a direct-buy alternative (no calendar). */
  directPurchaseUrl?: string | null;
  /** Block A — the expert's plain-English ideal persona / expectations for this service. */
  idealPersonaDescription?: string | null;

  questions: GateQuestion[];
};

export type PublicTheme = {
  accentColor: string;
  backgroundColor: string;
};

export type VisitorSource = {
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
};

export type PublicSalesPageTemplateData = {
  name: string;
  role: string;
  bio?: string;
  avatarUrl?: string | null;
  theme: PublicTheme;
  services: PublicService[];
  activeServiceId: string;
  timezone: string;
  availableDates: AvailabilityDate[];
  availableTimes: AvailabilityTime[];
  /** Times grouped by date-key (YYYY-MM-DD). Populated by the real slot engine. */
  slotsPerDate?: Record<string, AvailabilityTime[]>;
  /** Internal DB id — passed through for client-side hold creation. */
  professionalId?: string;
  metrics?: PublicMetric[];
  featuredReview?: PublicReview | null;
  /** Referrer + UTM params captured server-side on page load, for lead attribution. */
  visitorSource?: VisitorSource;
};

function getYiq(hexColor: string) {
  const cleanHex = hexColor.replace("#", "");

  if (cleanHex.length !== 6) return 255;

  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);

  return (r * 299 + g * 587 + b * 114) / 1000;
}

function getReadableTextColor(backgroundColor: string) {
  return getYiq(backgroundColor) < 160 ? "#FFFFFF" : "#111827";
}

function getInitialStep(service: PublicService): GateStep {
  if (service.accessCodeRequired) return "access";
  if (service.qualificationRequired) return "gate";
  return "time";
}

function getExposureLimit(exposure: AvailabilityExposure) {
  const limits: Record<AvailabilityExposure, number> = {
    THREE_DAYS: 3,
    FIVE_DAYS: 5,
    TWO_WEEKS: 14,
    ONE_MONTH: 31,
    TWO_MONTHS: 62,
  };

  return limits[exposure];
}

function ProgressBars({
  step,
  accentColor,
}: {
  step: GateStep;
  accentColor: string;
}) {
  const normalizedStep =
    step === "access" || step === "processing"
      ? "gate"
      : step === "confirmed"
        ? "details"
        : step;

  const steps: Array<Exclude<GateStep, "access" | "processing" | "confirmed">> = [
    "gate",
    "time",
    "details",
  ];

  const activeIndex = steps.indexOf(normalizedStep);

  return (
    <div className="mb-10">
      <div className="grid grid-cols-3 gap-2">
        {steps.map((item, index) => (
          <div
            key={item}
            className="h-1 rounded-full transition"
            style={{
              backgroundColor:
                index <= activeIndex ? accentColor : "rgba(15,23,42,0.12)",
            }}
          />
        ))}
      </div>

      <div className="mt-3 grid grid-cols-3 text-[10px] uppercase tracking-[0.24em] text-[var(--text-secondary)]">
        <span>Qualify</span>
        <span className="text-center">Time</span>
        <span className="text-right">Details</span>
      </div>
    </div>
  );
}

export function PublicSalesPageTemplate({
  data,
  preview = false,
}: {
  data: PublicSalesPageTemplateData;
  preview?: boolean;
}) {
  const initialService =
    data.services.find((service) => service.id === data.activeServiceId) ||
    data.services[0];

  const firstAvailableDate = data.availableDates.find((date) => date.available);
  const firstAvailableTime = data.availableTimes[0];

  const [activeServiceId, setActiveServiceId] = useState(initialService.id);
  const activeService =
    data.services.find((service) => service.id === activeServiceId) ||
    initialService;

  const [step, setStep] = useState<GateStep>(getInitialStep(activeService));
  const [accessCode, setAccessCode] = useState("");
  const [accessCodeError, setAccessCodeError] = useState("");
  const [selectedDateId, setSelectedDateId] = useState(
    firstAvailableDate?.id ?? "",
  );
  const [selectedTimeId, setSelectedTimeId] = useState(
    firstAvailableTime?.id ?? "",
  );

  // Date carousel — how many dates are visible at once in the single row
  const DATE_STRIP_SIZE = 5;
  const [dateCarouselStart, setDateCarouselStart] = useState(0);

  // Slot cap — start with 5, expand on demand
  const INITIAL_SLOT_CAP = 5;
  const [showAllSlots, setShowAllSlots] = useState(false);

  // Booking / lead / hold state
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestNotes, setGuestNotes] = useState("");
  const [leadId, setLeadId] = useState<string | null>(null);
  const [holdId, setHoldId] = useState<string | null>(null);
  const [holdExpiresAt, setHoldExpiresAt] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [autoConfirmed, setAutoConfirmed] = useState(false);
  const [validatedAccessCodeId, setValidatedAccessCodeId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);

  // Log this hit for visit stitching — fire-and-forget, once per mount, real
  // pages only. The server pairs it with an anonymous cookie and links it to
  // a Lead later if this visitor ever qualifies.
  useEffect(() => {
    if (preview || !data.professionalId) return;

    fetch("/api/public/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        professionalId: data.professionalId,
        referrer: data.visitorSource?.referrer,
        utmSource: data.visitorSource?.utmSource,
        utmMedium: data.visitorSource?.utmMedium,
        utmCampaign: data.visitorSource?.utmCampaign,
        landingPath: window.location.pathname,
      }),
    }).catch(() => {
      // Fail open — visit logging must never affect the visitor experience.
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview, data.professionalId]);

  // Times for the currently selected date — use per-date map when real slots
  // are present, otherwise fall back to the flat list (preview / mock mode).
  const timesForSelectedDate = useMemo<AvailabilityTime[]>(() => {
    if (data.slotsPerDate && selectedDateId) {
      return data.slotsPerDate[selectedDateId] ?? [];
    }
    return data.availableTimes;
  }, [data.slotsPerDate, data.availableTimes, selectedDateId]);

  const accentColor = data.theme.accentColor;
  const accentTextColor = getReadableTextColor(accentColor);
  const accentButtonStyle = {
    backgroundColor: accentColor,
    borderColor: accentColor,
    color: accentTextColor,
  };

  const backgroundColor = data.theme.backgroundColor;
  const isDark = getYiq(backgroundColor) < 135;

  const exposureLimit = getExposureLimit(activeService.availabilityExposure);
  const exposedDates = data.availableDates.slice(0, exposureLimit);

  const selectedDate = exposedDates.find((date) => date.id === selectedDateId);

  // Look up the selected time from the per-date list (real slots) or the
  // flat list (mock / preview). data.availableTimes may be empty when
  // slotsPerDate is the source of truth.
  const selectedTime =
    timesForSelectedDate.find((time) => time.id === selectedTimeId) ??
    data.availableTimes.find((time) => time.id === selectedTimeId);

  const initials = useMemo(() => {
    return data.name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [data.name]);

  const theme = {
    "--bg-main": backgroundColor,
    "--accent": accentColor,
    "--text-primary": isDark ? "#F8FAFC" : "#172033",
    "--text-secondary": isDark ? "#CBD5E1" : "#667085",
    "--card-bg": isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.74)",
    "--panel-bg": isDark ? "rgba(15,23,42,0.42)" : "rgba(255,255,255,0.60)",
    "--border": isDark ? "rgba(255,255,255,0.16)" : "rgba(35,35,35,0.12)",
  } as React.CSSProperties;

  function selectDate(dateId: string) {
    setSelectedDateId(dateId);
    setShowAllSlots(false); // collapse back to the capped view
    // Reset time selection — times differ per date when real slots are used.
    const newTimes = data.slotsPerDate?.[dateId] ?? data.availableTimes;
    setSelectedTimeId(newTimes[0]?.id ?? "");
  }

  function selectService(serviceId: string) {
    const nextService =
      data.services.find((service) => service.id === serviceId) ||
      activeService;

    setActiveServiceId(serviceId);
    setStep(getInitialStep(nextService));
    setAccessCode("");
    setAccessCodeError("");
  }

  async function continueAfterAccessCode() {
    if (!accessCode.trim()) {
      setAccessCodeError("Please enter an access code.");
      return;
    }

    setAccessCodeError("");
    setIsSubmitting(true);

    try {
      if (data.professionalId) {
        // Server-side hash validation — never sends the real codes to the client
        const res = await fetch("/api/public/access-codes/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            professionalId: data.professionalId,
            serviceId: activeService.id,
            code: accessCode.trim(),
          }),
        });

        if (!res.ok) throw new Error("Validation failed.");

        const payload = (await res.json()) as { isValid: boolean; accessCodeId?: string | null };

        if (!payload.isValid) {
          setAccessCodeError("Invalid access code. Please check and try again.");
          return;
        }

        // Store the matched code id so we can mark it used when the hold is created
        setValidatedAccessCodeId(payload.accessCodeId ?? null);
      }

      // Code is valid (or preview mode — no professionalId)
      setStep(activeService.qualificationRequired ? "gate" : "time");
    } catch {
      setAccessCodeError("Could not verify the code. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Hold + booking submission ───────────────────────────────────────────────

  async function handleBookSlot() {
    setSubmitError(null);

    const name = guestName.trim();
    const email = guestEmail.trim();

    if (!name || !email) {
      setSubmitError("Please enter your name and email.");
      return;
    }
    if (!selectedTime) {
      setSubmitError("Please select a time slot.");
      return;
    }
    if (!data.professionalId) {
      // Preview mode — no backend
      setStep("confirmed");
      return;
    }

    // Slot start/end are encoded in the time id as "startISO__endISO"
    const parts = selectedTime.id.split("__");
    const slotStart = parts[0];
    const slotEnd = parts[1];

    if (!slotStart || !slotEnd) {
      setSubmitError("Invalid slot selection. Please try again.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. If not yet qualified (no leadId), create a basic lead first via
      //    the qualification endpoint with empty answers.
      let currentLeadId = leadId;
      if (!currentLeadId) {
        const qualRes = await fetch("/api/public/qualification/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            professionalId: data.professionalId,
            serviceId: activeService.id,
            name,
            email,
            answers: {},
          }),
        });
        if (!qualRes.ok) {
          const p = (await qualRes.json()) as { error?: string };
          throw new Error(p.error ?? "Failed to create booking record.");
        }
        const qualData = (await qualRes.json()) as { lead: { id: string } };
        currentLeadId = qualData.lead.id;
        setLeadId(currentLeadId);
      }

      // 2. Create the 15-minute hold
      const holdRes = await fetch("/api/public/holds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professionalId: data.professionalId,
          serviceId: activeService.id,
          leadId: currentLeadId,
          slotStart,
          slotEnd,
          timezone: data.timezone,
          accessCodeId: validatedAccessCodeId ?? null,
        }),
      });

      if (!holdRes.ok) {
        const p = (await holdRes.json()) as { error?: string };
        throw new Error(p.error ?? "Slot is no longer available.");
      }

      const holdData = (await holdRes.json()) as {
        holdId: string;
        expiresAt: string;
        autoConfirmed?: boolean;
        bookingId?: string | null;
      };
      setHoldId(holdData.holdId);
      setHoldExpiresAt(holdData.expiresAt);
      setAutoConfirmed(holdData.autoConfirmed ?? false);
      if (holdData.bookingId) setBookingId(holdData.bookingId);

      setStep("confirmed");
      setBookingConfirmed(true);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main
      className={preview ? "min-h-full px-4 py-6" : "min-h-screen px-4 py-10"}
      style={{
        ...theme,
        background: `radial-gradient(circle at 50% 0%, ${accentColor}24, transparent 34%), var(--bg-main)`,
        color: "var(--text-primary)",
      }}
    >
      <section className="mx-auto max-w-6xl">
        <div
          className="overflow-hidden rounded-card border bg-[var(--card-bg)] shadow-[0_24px_90px_rgba(15,23,42,0.12)] backdrop-blur-xl"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="grid min-h-[720px] lg:grid-cols-[1.35fr_0.88fr]">
            <aside
              className="border-b p-8 lg:border-b-0 lg:border-r lg:p-10"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex h-full flex-col">
                <div className="flex items-center gap-4">
                  <div className="flex size-16 items-center justify-center overflow-hidden rounded-2xl bg-ink-deep text-[15px] font-medium text-white">
                    {data.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={data.avatarUrl}
                        alt={data.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      initials
                    )}
                  </div>

                  <div>
                    <p className="text-[16px] font-medium">{data.name}</p>
                    <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
                      {data.role}
                    </p>
                  </div>
                </div>

                {data.services.length > 1 ? (
                  <div className="mt-8 flex flex-wrap gap-2">
                    {data.services.map((service) => {
                      const active = service.id === activeServiceId;

                      return (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => selectService(service.id)}
                          className="rounded-full border px-4 py-2 text-[13px] font-medium transition hover:bg-white/50"
                          style={
                            active
                              ? accentButtonStyle
                              : {
                                  borderColor: "var(--border)",
                                  color: "var(--text-secondary)",
                                }
                          }
                        >
                          {service.title}
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                <div className="mt-12 max-w-2xl">
                  <p
                    className="text-xs uppercase tracking-[0.28em]"
                    style={{ color: accentColor }}
                  >
                    Apply for access
                  </p>

                  <h1 className="mt-5 text-[44px] font-semibold leading-[0.95] tracking-[-0.065em] sm:text-[58px]">
                    {activeService.title}
                  </h1>

                  <p className="mt-7 max-w-xl text-[20px] leading-[1.55]">
                    {activeService.headline}
                  </p>

                  {data.bio ? (
                    <p className="mt-5 max-w-xl text-[15px] leading-[1.75] text-[var(--text-secondary)]">
                      {data.bio}
                    </p>
                  ) : null}
                </div>

                <div className="mt-10 grid max-w-xl gap-3 text-[14px] text-[var(--text-secondary)] sm:grid-cols-3">
                  <p className="flex items-center gap-2">
                    <Clock3 className="size-4" />
                    {activeService.duration}
                  </p>

                  <p className="flex items-center gap-2">
                    <Phone className="size-4" />
                    {activeService.format}
                  </p>

                  {activeService.qualificationRequired ? (
                    <p className="flex items-center gap-2">
                      <LockKeyhole className="size-4" />
                      Qualification required
                    </p>
                  ) : null}
                </div>

                {activeService.paymentRequired && activeService.price ? (
                  <div
                    className="mt-8 inline-flex w-fit rounded-full border px-4 py-2 text-[14px] font-medium"
                    style={{ borderColor: "var(--border)" }}
                  >
                    {activeService.currency}
                    {activeService.price}
                  </div>
                ) : null}

                {data.metrics?.length ? (
                  <div className="mt-10 flex max-w-xl flex-wrap gap-2">
                    {data.metrics.map((metric) => (
                      <span
                        key={metric.id}
                        className="rounded-full border px-3 py-1 text-[12px] text-[var(--text-secondary)]"
                        style={{ borderColor: "var(--border)" }}
                      >
                        {metric.label}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="mt-auto pt-12">
                  <div
                    className="max-w-xl rounded-[1.5rem] border p-5"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div className="flex items-center gap-3">
                      {step === "details" ? (
                        <ShieldCheck
                          className="size-5"
                          style={{ color: accentColor }}
                        />
                      ) : data.featuredReview ? (
                        <Star className="size-5" style={{ color: accentColor }} />
                      ) : (
                        <Sparkles
                          className="size-5"
                          style={{ color: accentColor }}
                        />
                      )}

                      <p className="text-[14px] font-medium">
                        {step === "details"
                          ? "Protected by GATE Escrow Architecture"
                          : data.featuredReview
                            ? "Verified client feedback"
                            : "Your time stays protected"}
                      </p>
                    </div>

                    <p className="mt-3 text-[13px] leading-6 text-[var(--text-secondary)]">
                      {step === "details"
                        ? "Payment authorization and booking confirmation happen inside a protected request flow."
                        : data.featuredReview
                          ? `“${data.featuredReview.quote}” — ${data.featuredReview.author}${
                              data.featuredReview.role
                                ? `, ${data.featuredReview.role}`
                                : ""
                            }`
                          : "GATE screens requests before showing availability, so only qualified prospects move forward."}
                    </p>
                  </div>
                </div>
              </div>
            </aside>

            <section className="bg-[var(--panel-bg)] p-7 backdrop-blur-xl lg:p-9">
              <ProgressBars step={step} accentColor={accentColor} />

              {step === "access" ? (
                <div>
                  <p
                    className="text-xs uppercase tracking-[0.24em]"
                    style={{ color: accentColor }}
                  >
                    Private access
                  </p>

                  <h2 className="mt-4 text-[28px] font-semibold tracking-[-0.045em]">
                    Enter your access code.
                  </h2>

                  <p className="mt-3 text-[14px] leading-7 text-[var(--text-secondary)]">
                    This service is invite-only. Enter the current access code
                    shared by the expert to continue.
                  </p>

                  <label className="mt-8 block">
                    <span className="text-[14px] font-medium">Access Code</span>
                    <div className="mt-2 flex h-12 items-center gap-3 rounded-full border bg-white/80 px-4 text-ink-deep">
                      <KeyRound className="size-4 text-gray-500" />
                      <input
                        value={accessCode}
                        onChange={(event) => {
                          // Normalize to uppercase so the hash always matches
                          // generated codes regardless of how the user types
                          setAccessCode(event.target.value.toUpperCase());
                          setAccessCodeError("");
                        }}
                        className="w-full bg-transparent text-[14px] uppercase outline-none"
                      />
                    </div>
                  </label>

                  {accessCodeError ? (
                    <p className="mt-3 text-[13px] text-red-500">
                      {accessCodeError}
                    </p>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => void continueAfterAccessCode()}
                    disabled={isSubmitting}
                    className="mt-8 inline-flex h-11 items-center justify-center rounded-full border px-6 text-[15px] font-medium transition hover:brightness-[1.04] disabled:opacity-60"
                    style={accentButtonStyle}
                  >
                    {isSubmitting ? "Checking…" : "Continue"}
                    {!isSubmitting && <ArrowRight className="ml-2 size-4" />}
                  </button>
                </div>
              ) : null}

              {step === "gate" ? (
                <div className="animate-[fadeIn_0.25s_ease-out]">
                  {data.professionalId ? (
                    <ConversationGate
                      key={activeService.id}
                      professionalId={data.professionalId}
                      serviceId={activeService.id}
                      professionalName={data.name}
                      accentColor={accentColor}
                      accentTextColor={accentTextColor}
                      visitorSource={data.visitorSource}
                      onQualified={({ leadId, name, email }) => {
                        setLeadId(leadId);
                        setGuestName(name);
                        setGuestEmail(email);
                        setStep("time");
                      }}
                    />
                  ) : (
                    /* Preview mode — no backend, skip straight through */
                    <div className="flex flex-col items-center gap-4 py-12 text-center">
                      <p className="text-[14px]" style={{ color: "var(--text-secondary)" }}>
                        Qualification gate — live in published mode.
                      </p>
                      <button
                        type="button"
                        onClick={() => setStep("time")}
                        className="inline-flex h-10 items-center gap-2 rounded-full border px-5 text-[14px] font-medium transition hover:brightness-[1.04]"
                        style={accentButtonStyle}
                      >
                        Preview: skip to calendar
                        <ArrowRight className="size-4" />
                      </button>
                    </div>
                  )}
                </div>
              ) : null}

              {step === "processing" ? (
                <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
                  <div
                    className="size-14 animate-spin rounded-full border-2 border-transparent"
                    style={{
                      borderTopColor: accentColor,
                      borderRightColor: accentColor,
                    }}
                  />

                  <p className="mt-7 text-[22px] font-semibold tracking-[-0.04em]">
                    Reviewing your request
                  </p>

                  <div className="mt-4 space-y-2 text-[13px] text-[var(--text-secondary)]">
                    <p>Analyzing project scope...</p>
                    <p>Checking real-time calendar availability...</p>
                    <p>Preparing qualified openings...</p>
                  </div>
                </div>
              ) : null}

              {step === "time" ? (
                <div className="flex h-full flex-col">
                  {(activeService.qualificationRequired ||
                    activeService.accessCodeRequired) ? (
                    <button
                      type="button"
                      onClick={() =>
                        setStep(
                          activeService.qualificationRequired
                            ? "gate"
                            : "access",
                        )
                      }
                      className="mb-7 flex size-10 shrink-0 items-center justify-center rounded-full border transition"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <ArrowLeft className="size-4" />
                    </button>
                  ) : null}

                  <h2 className="shrink-0 text-[28px] font-semibold tracking-[-0.045em]">
                    Select a scarce opening.
                  </h2>

                  <p className="mt-3 shrink-0 text-[14px] leading-7 text-[var(--text-secondary)]">
                    Only limited availability is shown at a time.
                  </p>

                  {/* ── Single-row date carousel ──────────────────────────── */}
                  <div className="mt-8 shrink-0">
                    {/* Month label + carousel nav */}
                    <div className="flex items-center justify-between">
                      <p className="text-[15px] font-medium">
                        {selectedDate?.monthLabel ?? exposedDates[dateCarouselStart]?.monthLabel}
                      </p>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={dateCarouselStart === 0}
                          onClick={() =>
                            setDateCarouselStart((p) => Math.max(0, p - DATE_STRIP_SIZE))
                          }
                          className="flex size-7 items-center justify-center rounded-full border transition disabled:opacity-30"
                          style={{ borderColor: "var(--border)" }}
                          aria-label="Previous dates"
                        >
                          <ArrowLeft className="size-3.5" />
                        </button>

                        <button
                          type="button"
                          disabled={
                            dateCarouselStart + DATE_STRIP_SIZE >= exposedDates.length
                          }
                          onClick={() =>
                            setDateCarouselStart((p) =>
                              Math.min(
                                p + DATE_STRIP_SIZE,
                                exposedDates.length - 1,
                              ),
                            )
                          }
                          className="flex size-7 items-center justify-center rounded-full border transition disabled:opacity-30"
                          style={{ borderColor: "var(--border)" }}
                          aria-label="Next dates"
                        >
                          <ArrowRight className="size-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Single-row strip — never wraps */}
                    <div className="mt-4 flex items-center gap-2">
                      {exposedDates.length === 0 ? (
                        <p className="text-[13px] text-[var(--text-secondary)]">
                          No availability set yet.
                        </p>
                      ) : (
                        exposedDates
                          .slice(dateCarouselStart, dateCarouselStart + DATE_STRIP_SIZE)
                          .map((date) => {
                            const active = selectedDateId === date.id;
                            return (
                              <button
                                key={date.id}
                                type="button"
                                disabled={date.disabled || !date.available}
                                onClick={() => selectDate(date.id)}
                                className="flex flex-1 flex-col items-center gap-0.5 rounded-2xl border py-2.5 text-center transition disabled:opacity-30"
                                style={
                                  active
                                    ? {
                                        backgroundColor: accentColor,
                                        borderColor: accentColor,
                                        color: accentTextColor,
                                      }
                                    : date.available
                                      ? {
                                          borderColor: accentColor,
                                          color: accentColor,
                                        }
                                      : { borderColor: "var(--border)" }
                                }
                              >
                                <span className="text-[10px] font-medium uppercase tracking-wider opacity-80">
                                  {date.label}
                                </span>
                                <span className="text-[18px] font-bold leading-none">
                                  {date.day}
                                </span>
                              </button>
                            );
                          })
                      )}
                    </div>
                  </div>

                  {/* ── Time slot capsule — fixed height, scrollable, masked ─ */}
                  <div className="mt-6 flex-1 overflow-hidden">
                    {selectedDate ? (
                      <p className="mb-3 shrink-0 text-[13px] font-semibold text-[var(--text-secondary)]">
                        {selectedDate.label}, {selectedDate.monthLabel}{" "}
                        {selectedDate.day}
                      </p>
                    ) : null}

                    {timesForSelectedDate.length === 0 ? (
                      <p className="text-[13px] text-[var(--text-secondary)]">
                        No openings on this date. Select another day above.
                      </p>
                    ) : (
                      <div className="relative">
                        {/* Scrollable capsule */}
                        <div
                          className="max-h-[268px] overflow-y-auto"
                          style={{ scrollbarWidth: "none" }}
                        >
                          <div className="space-y-2.5 pb-10">
                            {(showAllSlots
                              ? timesForSelectedDate
                              : timesForSelectedDate.slice(0, INITIAL_SLOT_CAP)
                            ).map((time) => {
                              const active = selectedTimeId === time.id;
                              return (
                                <div key={time.id} className="grid grid-cols-2 gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedTimeId(time.id)}
                                    className={
                                      active
                                        ? "h-11 rounded-xl text-[14px] font-semibold"
                                        : "col-span-2 h-11 rounded-xl border text-[14px] font-semibold transition hover:bg-white/60"
                                    }
                                    style={
                                      active
                                        ? accentButtonStyle
                                        : {
                                            borderColor: accentColor,
                                            color: accentColor,
                                          }
                                    }
                                  >
                                    {time.label}
                                  </button>

                                  {active ? (
                                    <button
                                      type="button"
                                      onClick={() => setStep("details")}
                                      className="h-11 rounded-xl text-[14px] font-semibold"
                                      style={accentButtonStyle}
                                    >
                                      Next
                                    </button>
                                  ) : null}
                                </div>
                              );
                            })}

                            {/* Show more trigger — rendered inside the scroll
                                area so it never pushes the page */}
                            {!showAllSlots &&
                            timesForSelectedDate.length > INITIAL_SLOT_CAP ? (
                              <button
                                type="button"
                                onClick={() => setShowAllSlots(true)}
                                className="w-full pt-1 text-[12px] font-medium transition"
                                style={{ color: accentColor }}
                              >
                                Show{" "}
                                {timesForSelectedDate.length - INITIAL_SLOT_CAP}{" "}
                                more{" "}
                                {timesForSelectedDate.length - INITIAL_SLOT_CAP === 1
                                  ? "slot"
                                  : "slots"}
                                …
                              </button>
                            ) : null}
                          </div>
                        </div>

                        {/* Gradient fade mask — sits over the scroll area,
                            pointer-events:none so clicks still reach slots */}
                        <div
                          className="pointer-events-none absolute bottom-0 left-0 right-0 h-10"
                          style={{
                            background:
                              "linear-gradient(to bottom, transparent, var(--panel-bg))",
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <p className="mt-4 flex shrink-0 items-center gap-2 text-[12px] text-[var(--text-secondary)]">
                    <MapPin className="size-3.5" />
                    {data.timezone}
                  </p>
                </div>
              ) : null}

              {step === "details" ? (
                <div>
                  <button
                    type="button"
                    onClick={() => setStep("time")}
                    className="mb-7 flex size-10 items-center justify-center rounded-full border transition"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <ArrowLeft className="size-4" />
                  </button>

                  <p
                    className="text-xs uppercase tracking-[0.24em]"
                    style={{ color: accentColor }}
                  >
                    Final request
                  </p>

                  <h2 className="mt-4 text-[28px] font-semibold tracking-[-0.045em]">
                    Enter your details.
                  </h2>

                  {/* Slot summary */}
                  {selectedDate && selectedTime ? (
                    <div
                      className="mt-5 rounded-2xl border px-4 py-3 text-[13px] text-[var(--text-secondary)]"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <Clock3 className="mr-2 inline size-4" />
                      {selectedDate.label}, {selectedDate.monthLabel}{" "}
                      {selectedDate.day} — {selectedTime.label}
                    </div>
                  ) : null}

                  <div className="mt-7 space-y-5">
                    <label className="block">
                      <span className="text-[14px] font-medium">Name *</span>
                      <input
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="Jane Smith"
                        className="mt-2 h-12 w-full rounded-xl border bg-white/80 px-4 text-[14px] text-ink-deep outline-none transition focus:border-ink-deep"
                      />
                    </label>

                    <label className="block">
                      <span className="text-[14px] font-medium">Email *</span>
                      <input
                        type="email"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        placeholder="jane@company.com"
                        className="mt-2 h-12 w-full rounded-xl border bg-white/80 px-4 text-[14px] text-ink-deep outline-none transition focus:border-ink-deep"
                      />
                    </label>

                    <label className="block">
                      <span className="text-[14px] font-medium">
                        Notes for the expert
                      </span>
                      <textarea
                        value={guestNotes}
                        onChange={(e) => setGuestNotes(e.target.value)}
                        className="mt-2 min-h-24 w-full rounded-xl border bg-white/80 px-4 py-3 text-[14px] text-ink-deep outline-none transition focus:border-ink-deep"
                      />
                    </label>
                  </div>

                  {activeService.paymentRequired ? (
                    <div className="mt-6 space-y-3">
                      <div className="rounded-2xl border bg-white/80 p-4 text-ink-deep">
                        <div className="flex items-center gap-3">
                          <CreditCard className="size-4 text-gray-500" />
                          <p className="text-[13px] font-medium">
                            Secure card authorization
                          </p>
                        </div>

                        <div className="mt-4 grid gap-3">
                          <div className="h-11 rounded-xl border border-gray-200 bg-white px-4 py-3 text-[13px] text-gray-400">
                            Card number
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="h-11 rounded-xl border border-gray-200 bg-white px-4 py-3 text-[13px] text-gray-400">
                              MM / YY
                            </div>
                            <div className="h-11 rounded-xl border border-gray-200 bg-white px-4 py-3 text-[13px] text-gray-400">
                              CVC
                            </div>
                          </div>
                        </div>
                      </div>

                      <div
                        className="rounded-2xl border px-4 py-3 text-[13px] leading-6 text-[var(--text-secondary)]"
                        style={{ borderColor: "var(--border)" }}
                      >
                        <ShieldCheck className="mr-2 inline size-4" />
                        Protected by GATE Escrow Architecture.
                      </div>
                    </div>
                  ) : null}

                  {activeService.manualApprovalRequired ? (
                    <div
                      className="mt-6 rounded-2xl border px-4 py-3 text-[13px] leading-6 text-[var(--text-secondary)]"
                      style={{ borderColor: "var(--border)" }}
                    >
                      This booking request will be sent for expert approval
                      before confirmation.
                    </div>
                  ) : null}

                  {submitError ? (
                    <p className="mt-5 text-[13px] text-red-500">{submitError}</p>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => void handleBookSlot()}
                    disabled={
                      isSubmitting ||
                      !selectedDate ||
                      !selectedTime ||
                      preview
                    }
                    className="mt-7 inline-flex h-11 items-center justify-center rounded-full px-6 text-[15px] font-medium disabled:opacity-60"
                    style={accentButtonStyle}
                  >
                    {isSubmitting
                      ? "Reserving slot…"
                      : activeService.paymentRequired
                        ? "Authorize Payment & Book Slot"
                        : activeService.manualApprovalRequired
                          ? "Submit for Approval"
                          : "Book Slot"}
                    {!isSubmitting && <Check className="ml-2 size-4" />}
                  </button>
                </div>
              ) : null}

              {step === "confirmed" ? (
                <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
                  <div
                    className="flex size-16 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${accentColor}22` }}
                  >
                    <Check className="size-7" style={{ color: accentColor }} />
                  </div>

                  {autoConfirmed ? (
                    <>
                      <p className="mt-7 text-[24px] font-semibold tracking-[-0.04em]">
                        Booking confirmed!
                      </p>

                      <p className="mt-3 max-w-xs text-[14px] leading-7 text-[var(--text-secondary)]">
                        A calendar invite is on its way to {guestEmail || "your inbox"}.
                        You're all set.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="mt-7 text-[24px] font-semibold tracking-[-0.04em]">
                        Request received!
                      </p>

                      <p className="mt-3 max-w-xs text-[14px] leading-7 text-[var(--text-secondary)]">
                        Your slot is temporarily held. {data.name} will review
                        and confirm within 24 hours — watch your inbox.
                      </p>

                      {holdExpiresAt ? (
                        <p className="mt-4 text-[12px] text-[var(--text-secondary)]">
                          Slot hold expires at{" "}
                          {new Date(holdExpiresAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          .
                        </p>
                      ) : null}
                    </>
                  )}

                  {holdId ? (
                    <a
                      href={`/booking/${holdId}`}
                      className="mt-6 text-[13px] underline underline-offset-2"
                      style={{ color: accentColor }}
                    >
                      View booking status →
                    </a>
                  ) : null}
                </div>
              ) : null}
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}

export default PublicSalesPageTemplate;