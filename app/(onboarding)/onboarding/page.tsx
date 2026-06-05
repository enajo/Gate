"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  LockKeyhole,
  Sparkles,
  UserRound,
} from "lucide-react";

const roles = ["Consultant", "Coach", "Mentor", "Fractional Executive"];

const goals = [
  {
    title: "Paid Consultations",
    description: "Secure upfront revenue for your advisory time.",
    icon: BadgeCheck,
  },
  {
    title: "Qualify Leads",
    description: "Filter out low-intent inquiries automatically.",
    icon: Sparkles,
  },
  {
    title: "Applications Only",
    description: "Review profiles manually before accepting slots.",
    icon: BriefcaseBusiness,
  },
  {
    title: "Private Access",
    description: "Lock your booking page behind custom access codes.",
    icon: LockKeyhole,
  },
];

export default function OnboardingPage() {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 fields
  const [publicName, setPublicName] = useState("");
  const [role, setRole] = useState("Consultant");
  const [otherRole, setOtherRole] = useState("");
  const [headline, setHeadline] = useState("");

  // Step 2 fields
  const [goal, setGoal] = useState("Qualify Leads");

  // Submission state
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayRole = role === "Other" ? otherRole || "Your role" : role;
  const hasHeadline = headline.trim().length > 0;
  const displayHeadline =
    headline || "Helping high-value clients reach the right next step.";

  const canContinue = publicName.trim().length >= 2;

  async function handleLaunch() {
    if (launching) return;
    setLaunching(true);
    setError(null);

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: publicName.trim(),
          title: role === "Other" ? otherRole.trim() || "Professional" : role,
          headline: headline.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(
          (data as { error?: string }).error ?? "Something went wrong. Please try again.",
        );
        setLaunching(false);
        return;
      }

      // Profile created — send to Control Room to complete setup
      router.push("/app/control-room");
    } catch {
      setError("Network error. Please check your connection and try again.");
      setLaunching(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,rgba(223,167,103,0.18),transparent_30%),radial-gradient(circle_at_85%_22%,rgba(71,85,105,0.10),transparent_26%),linear-gradient(180deg,#F9FAFB_0%,#F6F2EA_45%,#F3EDE2_100%)] text-ink">
      <header className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 text-[13px]">
        <Link href="/" className="font-medium tracking-wide">
          GATE
        </Link>

        <span className="text-gray-500">
          Step {step} of 2 — {step === 1 ? "Profile Setup" : "Gate Configuration"}
        </span>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-56px)] max-w-6xl items-center gap-12 px-4 py-12 lg:grid-cols-[1fr_0.9fr]">
        {/* ── Left: live preview ────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-[radial-gradient(circle_at_top_left,rgba(223,167,103,0.18),transparent_34%),linear-gradient(145deg,rgba(255,255,255,0.58),rgba(243,237,226,0.82))] p-10 shadow-warm-2xl">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-amber/20 blur-3xl" />

          <div className="relative">
            <p className="text-xs uppercase tracking-[0.26em] text-brand-amber">
              Live preview
            </p>

            <div className="mt-16 rounded-card bg-white/70 p-8 shadow-warm-lg">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-ink text-white">
                <UserRound className="size-6" />
              </div>

              <h1 className="mt-8 text-[38px] font-semibold leading-none tracking-[-0.05em]">
                {publicName || "Your Name"}
              </h1>

              <p className="mt-3 text-[15px] text-gray-500">{displayRole}</p>

              <p
                className={
                  hasHeadline
                    ? "mt-6 max-w-md text-[22px] leading-tight tracking-[-0.035em] text-ink"
                    : "mt-6 max-w-md text-[22px] italic leading-tight tracking-[-0.035em] text-gray-400"
                }
              >
                {displayHeadline}
              </p>

              <div className="mt-8 inline-flex h-10 items-center justify-center rounded-full bg-ink-soft px-5 text-[14px] text-white">
                Apply to work together
              </div>
            </div>

            <p className="mt-8 max-w-md text-[14px] leading-[1.7] text-gray-500">
              This is how qualified leads will see your public gate. You can
              refine everything inside your Control Room.
            </p>
          </div>
        </div>

        {/* ── Right: form ───────────────────────────────────────────────── */}
        <div className="relative overflow-hidden card-warm p-7 shadow-warm-xl backdrop-blur">
          <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-brand-amber/20 blur-3xl" />

          <div className="relative">
            {launching ? (
              <div className="flex min-h-[480px] flex-col items-center justify-center text-center">
                <Sparkles className="size-10 text-brand-amber" />
                <h2 className="mt-6 text-[32px] font-medium tracking-[-0.045em]">
                  Creating your gate…
                </h2>
                <p className="mt-3 max-w-sm text-[14px] leading-[1.7] text-gray-500">
                  Setting up your profile and workspace. You&apos;ll be taken to
                  the Control Room to finish setup.
                </p>
              </div>
            ) : step === 1 ? (
              <div>
                <p className="text-xs uppercase tracking-[0.26em] text-brand-amber">
                  Step 1 of 2
                </p>

                <h2 className="mt-4 text-[30px] font-medium leading-tight tracking-[-0.045em]">
                  Shape your public identity.
                </h2>

                <div className="mt-7 space-y-5">
                  {/* Name */}
                  <label className="block">
                    <span className="text-[13px] font-medium">
                      Your Public Name
                    </span>
                    <input
                      value={publicName}
                      onChange={(e) => setPublicName(e.target.value)}
                      placeholder="e.g., Alex Carter"
                      className="mt-2 h-11 w-full rounded-full border border-warm-border-soft bg-white/55 px-4 text-[14px] outline-none focus:border-ink-soft"
                    />
                  </label>

                  {/* Role */}
                  <div>
                    <span className="text-[13px] font-medium">Your Role</span>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {[...roles, "Other"].map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setRole(item)}
                          className={
                            role === item
                              ? "rounded-full border border-ink-soft bg-ink-soft px-4 py-2 text-[13px] text-white"
                              : "rounded-full border border-warm-border-soft px-4 py-2 text-[13px] text-ink transition hover:border-ink-soft"
                          }
                        >
                          {item === "Other" ? "+ Other" : item}
                        </button>
                      ))}
                    </div>

                    {role === "Other" && (
                      <input
                        maxLength={30}
                        value={otherRole}
                        onChange={(e) => setOtherRole(e.target.value)}
                        placeholder="Type your professional role…"
                        className="mt-3 h-11 w-full rounded-full border border-warm-border-soft bg-white/55 px-4 text-[14px] outline-none focus:border-ink-soft"
                      />
                    )}
                  </div>

                  {/* Headline */}
                  <label className="block">
                    <span className="text-[13px] font-medium">
                      Your Headline{" "}
                      <span className="text-gray-400">(optional)</span>
                    </span>

                    <div className="relative mt-2">
                      <input
                        maxLength={80}
                        value={headline}
                        onChange={(e) => setHeadline(e.target.value)}
                        placeholder="e.g., Fractional COO for SaaS companies"
                        className="h-11 w-full rounded-full border border-warm-border-soft bg-white/55 px-4 pr-16 text-[14px] outline-none focus:border-ink-soft"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">
                        {headline.length}/80
                      </span>
                    </div>

                    <p className="mt-2 text-[12px] text-gray-500">
                      This is the first thing qualified leads see. Keep it
                      punchy.
                    </p>
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!canContinue}
                  className="mt-8 inline-flex h-11 w-full items-center justify-center rounded-full bg-ink-soft px-5 text-[14px] text-white transition hover:bg-ink-slate disabled:opacity-50"
                >
                  Continue
                  <ArrowRight className="ml-2 size-4" />
                </button>
              </div>
            ) : (
              <div>
                <p className="text-xs uppercase tracking-[0.26em] text-brand-amber">
                  Step 2 of 2
                </p>

                <h2 className="mt-4 text-[30px] font-medium leading-tight tracking-[-0.045em]">
                  What&apos;s your booking goal?
                </h2>

                <p className="mt-2 text-[13px] text-gray-500">
                  Choose the style that fits your practice. You can change this
                  at any time.
                </p>

                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  {goals.map((item) => {
                    const Icon = item.icon;
                    const selected = goal === item.title;

                    return (
                      <button
                        key={item.title}
                        type="button"
                        onClick={() => setGoal(item.title)}
                        className={
                          selected
                            ? "rounded-[1.5rem] border border-brand-amber bg-ink p-5 text-left text-warm-cream shadow-[0_18px_50px_rgba(43,43,43,0.16)]"
                            : "rounded-[1.5rem] border border-warm-border-soft bg-white/50 p-5 text-left transition hover:border-ink-soft"
                        }
                      >
                        <Icon
                          className={
                            selected
                              ? "size-5 text-brand-amber"
                              : "size-5 text-ink-soft"
                          }
                        />
                        <h3 className="mt-4 text-[16px] font-semibold">
                          {item.title}
                        </h3>
                        <p
                          className={
                            selected
                              ? "mt-2 text-[12px] leading-5 text-warm-border-soft"
                              : "mt-2 text-[12px] leading-5 text-gray-500"
                          }
                        >
                          {item.description}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {error && (
                  <div className="mt-4 error-banner">
                    {error}
                  </div>
                )}

                <div className="mt-8 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-warm-border-soft px-5 text-[14px] text-ink transition hover:border-ink-soft"
                  >
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={handleLaunch}
                    disabled={launching}
                    className="inline-flex h-11 flex-[1.4] items-center justify-center rounded-full border border-brand-amber bg-[linear-gradient(135deg,#DFA767,#E8BC82)] px-5 text-[14px] text-ink transition hover:brightness-[1.04] disabled:opacity-60"
                  >
                    Launch My Gate
                    <ArrowRight className="ml-2 size-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
