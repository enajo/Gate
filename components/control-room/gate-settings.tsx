"use client";

import * as React from "react";
import { BotMessageSquare, CheckCircle2, Link2, Plus, Settings2, ShieldCheck, Trash2 } from "lucide-react";
import type { ProfileState } from "./profile-settings";
import { ServiceAccessCodes } from "./service-access-codes";
import { GateSetup, type GateSetupAnswers } from "@/components/services/gate-setup";

interface GateSettingsProps {
  profile: ProfileState;
  setProfile: React.Dispatch<React.SetStateAction<ProfileState>>;
}

const availabilityExposureOptions = [
  { value: "THREE_DAYS", label: "3 days" },
  { value: "FIVE_DAYS", label: "5 days" },
  { value: "TWO_WEEKS", label: "2 weeks" },
  { value: "ONE_MONTH", label: "1 month" },
  { value: "TWO_MONTHS", label: "2 months" },
] as const;

function generateAccessCode() {
  return `GATE-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export function GateSettings({ profile, setProfile }: GateSettingsProps) {
  const [configuringGateForId, setConfiguringGateForId] = React.useState<string | null>(null);

  const activeService =
    profile.services.find((s) => s.id === profile.activeServiceId) ||
    profile.services[0];

  // ── Service helpers ─────────────────────────────────────────────────────────

  function setActiveService(serviceId: string) {
    setProfile((p) => ({ ...p, activeServiceId: serviceId }));
  }

  function updateService(
    serviceId: string,
    key: keyof ProfileState["services"][number],
    value: string | boolean | null,
  ) {
    setProfile((p) => ({
      ...p,
      services: p.services.map((s) =>
        s.id === serviceId ? { ...s, [key]: value } : s,
      ),
    }));
  }

  function addService() {
    const id = crypto.randomUUID();
    setProfile((p) => ({
      ...p,
      activeServiceId: id,
      services: [
        ...p.services,
        {
          id,
          title: "New Service",
          headline: "",
          duration: "30 min",
          format: "Video call",
          price: "",
          currency: "$",
          qualificationRequired: false,
          paymentRequired: false,
          accessCodeRequired: false,
          manualApprovalRequired: false,
          availabilityExposure: "FIVE_DAYS" as const,
          directPurchaseUrl: null,
          idealPersonaDescription: null,
          currentAccessCode: generateAccessCode(),
          questions: [],
        },
      ],
    }));
  }

  function removeService(serviceId: string) {
    setProfile((p) => {
      const remaining = p.services.filter((s) => s.id !== serviceId);
      return {
        ...p,
        services: remaining,
        activeServiceId:
          p.activeServiceId === serviceId
            ? (remaining[0]?.id ?? "")
            : p.activeServiceId,
      };
    });
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <section id="gate" className="scroll-mt-20 space-y-6">
      {/* ── Gate Control ───────────────────────────────────────────────────── */}
      <div className="card-section">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="size-5 text-brand-amber" />
            <div>
              <p className="text-[15px] font-medium text-ink">Gate Control</p>
              <p className="mt-1 text-[12px] text-gray-500">
                Configure each service&apos;s price, access rules, and AI
                qualifier.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={addService}
            className="inline-flex h-9 items-center rounded-full border border-warm-border-soft px-4 text-[13px] transition hover:border-ink"
          >
            <Plus className="mr-2 size-4" />
            Add Service
          </button>
        </div>

        {/* Service tabs */}
        {profile.services.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {profile.services.map((s) => {
              const active = s.id === activeService?.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveService(s.id)}
                  className={
                    active
                      ? "rounded-full bg-ink px-4 py-2 text-[13px] text-white"
                      : "rounded-full border border-warm-border-soft bg-white/70 px-4 py-2 text-[13px] text-stone-600 transition hover:border-ink"
                  }
                >
                  {s.title || "Untitled"}
                </button>
              );
            })}
          </div>
        )}

        {/* Service editor */}
        {!activeService ? (
          <div className="mt-6 rounded-[1.5rem] border border-dashed border-warm-border-soft bg-white/50 p-8 text-center">
            <p className="text-[14px] text-gray-500">No services yet.</p>
            <p className="mt-1 text-[12px] text-gray-400">
              Click &ldquo;Add Service&rdquo; above to create your first offering.
            </p>
          </div>
        ) : (
          <div className="mt-6 rounded-[1.5rem] border border-warm-border-mid bg-white/70 p-5">
            <div className="flex items-center justify-between gap-4">
              <p className="text-[13px] font-medium text-ink">
                Editing: {activeService.title || "Untitled"}
              </p>
              <button
                type="button"
                onClick={() => removeService(activeService.id)}
                title="Delete service"
                className="text-gray-400 transition hover:text-red-500"
              >
                <Trash2 className="size-4" />
              </button>
            </div>

            {/* Core fields */}
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Service Title">
                <input
                  value={activeService.title}
                  onChange={(e) =>
                    updateService(activeService.id, "title", e.target.value)
                  }
                  className="field-input"
                />
              </Field>

              <Field label="Duration">
                <input
                  value={activeService.duration}
                  onChange={(e) =>
                    updateService(activeService.id, "duration", e.target.value)
                  }
                  className="field-input"
                  placeholder="30 min"
                />
              </Field>

              <Field label="Format">
                <input
                  value={activeService.format}
                  onChange={(e) =>
                    updateService(activeService.id, "format", e.target.value)
                  }
                  className="field-input"
                  placeholder="Video call"
                />
              </Field>

              <Field label="Price">
                <div className="grid grid-cols-[76px_1fr] gap-2">
                  <input
                    value={activeService.currency ?? ""}
                    onChange={(e) =>
                      updateService(
                        activeService.id,
                        "currency",
                        e.target.value,
                      )
                    }
                    className="field-input"
                    placeholder="$"
                  />
                  <input
                    value={activeService.price ?? ""}
                    onChange={(e) =>
                      updateService(activeService.id, "price", e.target.value)
                    }
                    className="field-input"
                    placeholder="500"
                  />
                </div>
              </Field>
            </div>

            <div className="mt-4">
              <Field label="Service Headline">
                <input
                  value={activeService.headline}
                  onChange={(e) =>
                    updateService(activeService.id, "headline", e.target.value)
                  }
                  className="field-input"
                  placeholder="High-status promise for this specific offer"
                />
              </Field>
            </div>

            {/* Direct Purchase URL — marks this service as a direct-buy option */}
            <div className="mt-4">
              <Field label="Direct Purchase URL (optional)">
                <div className="flex items-center gap-2">
                  <Link2 className="size-3.5 shrink-0 text-gray-400" />
                  <input
                    type="url"
                    value={activeService.directPurchaseUrl ?? ""}
                    onChange={(e) =>
                      updateService(
                        activeService.id,
                        "directPurchaseUrl",
                        e.target.value || null,
                      )
                    }
                    placeholder="https://buy.stripe.com/… leave blank for calendar booking"
                    className="field-input flex-1"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-gray-400">
                  Set this if the service doesn&apos;t need a calendar (e.g. a
                  course, template, or async offer). The AI will recommend it as
                  an alternative to visitors who aren&apos;t a fit for core
                  calendar services.
                </p>
              </Field>
            </div>

            {/* ── Gate Rules ──────────────────────────────────────────────── */}
            <div className="mt-8">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                Gate Rules
              </p>

              {/* 2 × 2 toggle grid — capped so each card sizes to its
                  label/description instead of stretching to fill a wide
                  column, which was leaving a large dead gap before the
                  toggle switch on the right. */}
              <div className="grid max-w-lg grid-cols-2 gap-2.5">
                <Toggle
                  label="Qualification"
                  description="AI screens visitors"
                  checked={activeService.qualificationRequired}
                  onChange={(v) =>
                    updateService(activeService.id, "qualificationRequired", v)
                  }
                />
                <Toggle
                  label="Payment"
                  description="Require payment upfront"
                  checked={activeService.paymentRequired}
                  onChange={(v) =>
                    updateService(activeService.id, "paymentRequired", v)
                  }
                />
                <Toggle
                  label="Access Code"
                  description="Invite-only access"
                  checked={activeService.accessCodeRequired}
                  onChange={(v) =>
                    updateService(activeService.id, "accessCodeRequired", v)
                  }
                />
                <Toggle
                  label="Manual Approval"
                  description="You review each request"
                  checked={activeService.manualApprovalRequired}
                  onChange={(v) =>
                    updateService(activeService.id, "manualApprovalRequired", v)
                  }
                />
              </div>

              {/* AI Qualifier — expands below the grid when Qualification is ON */}
              {activeService.qualificationRequired ? (
                <div className="mt-3 rounded-[1.25rem] border border-warm-border-mid bg-warm-cream-light p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <BotMessageSquare className="mt-0.5 size-4 shrink-0 text-brand-amber" />
                      <div>
                        <p className="text-[13px] font-semibold text-ink">
                          AI Qualifier
                        </p>
                        <p className="mt-0.5 text-[11px] leading-5 text-gray-500">
                          {activeService.idealPersonaDescription
                            ? "Your gate is configured and ready to screen visitors."
                            : "Answer 4 quick questions so your AI gate knows exactly who to qualify."}
                        </p>
                      </div>
                    </div>

                    {activeService.idealPersonaDescription && configuringGateForId !== activeService.id && (
                      <button
                        type="button"
                        onClick={() => setConfiguringGateForId(activeService.id)}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-warm-border-soft bg-white/70 px-3 py-1.5 text-[12px] text-ink transition hover:border-ink"
                      >
                        <Settings2 className="size-3.5" />
                        Edit gate
                      </button>
                    )}
                  </div>

                  {/* Configured state — just show a status badge */}
                  {activeService.idealPersonaDescription && configuringGateForId !== activeService.id ? (
                    <div className="mt-4 flex items-center gap-2 rounded-[0.875rem] border border-emerald-100 bg-emerald-50 px-4 py-3">
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                      <p className="text-[12px] text-emerald-800">
                        Gate is configured — visitors will be screened before booking.
                      </p>
                    </div>
                  ) : (
                    /* Chat setup */
                    <div className="mt-4">
                      <GateSetup
                        serviceId={activeService.id}
                        serviceName={activeService.title}
                        serviceTitle={activeService.title}
                        initialPrompt={activeService.idealPersonaDescription}
                        initialPhase={activeService.idealPersonaDescription ? "edit" : "chat"}
                        onSave={async (compiledPrompt: string, _answers: GateSetupAnswers) => {
                          updateService(activeService.id, "idealPersonaDescription", compiledPrompt);
                          setConfiguringGateForId(null);

                          // Auto-persist so the gate survives a page refresh without
                          // requiring the expert to also click "Save Draft".
                          const updatedProfile = {
                            ...profile,
                            services: profile.services.map((s) =>
                              s.id === activeService.id
                                ? { ...s, idealPersonaDescription: compiledPrompt }
                                : s,
                            ),
                          };
                          await fetch("/api/app/control-room", {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(updatedProfile),
                          });
                        }}
                        onCancel={
                          activeService.idealPersonaDescription
                            ? () => setConfiguringGateForId(null)
                            : undefined
                        }
                      />
                    </div>
                  )}
                </div>
              ) : null}

              {/* Access codes panel */}
              {activeService.accessCodeRequired ? (
                <div className="mt-3">
                  <ServiceAccessCodes serviceId={activeService.id} />
                </div>
              ) : null}
            </div>

            {/* ── Availability ─────────────────────────────────────────────── */}
            <div className="mt-8">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                Availability Window
              </p>

              <div className="flex max-w-xl items-center justify-between gap-4 rounded-[0.875rem] border border-warm-border-soft bg-white/70 px-4 py-3">
                <div>
                  <p className="text-[13px] font-medium text-ink">
                    Calendar exposure
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    How far ahead visitors can see open slots
                  </p>
                </div>
                <select
                  value={activeService.availabilityExposure}
                  onChange={(e) =>
                    updateService(
                      activeService.id,
                      "availabilityExposure",
                      e.target.value,
                    )
                  }
                  className="rounded-lg border border-warm-border-soft bg-white px-3 py-1.5 text-[13px] text-ink outline-none transition focus:border-ink"
                >
                  {availabilityExposureOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={
        checked
          ? "flex items-center justify-between gap-3 rounded-[0.875rem] border border-brand-amber bg-brand-amber-faint px-4 py-3 text-left"
          : "flex items-center justify-between gap-3 rounded-[0.875rem] border border-warm-border-soft bg-white/60 px-4 py-3 text-left transition hover:border-warm-border-mid"
      }
    >
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-ink">{label}</p>
        {description ? (
          <p className="mt-0.5 text-[11px] text-gray-400">{description}</p>
        ) : null}
      </div>

      {/* Toggle track */}
      <span
        className={
          checked
            ? "relative inline-flex h-5 w-9 shrink-0 rounded-full bg-brand-amber transition-colors"
            : "relative inline-flex h-5 w-9 shrink-0 rounded-full bg-warm-border-lighter transition-colors"
        }
      >
        <span
          className={
            checked
              ? "absolute right-0.5 top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform"
              : "absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform"
          }
        />
      </span>
    </button>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[12px] font-medium text-ink">
        {label}
      </span>
      {children}
    </label>
  );
}
