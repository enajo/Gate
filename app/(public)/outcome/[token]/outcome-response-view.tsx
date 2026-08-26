"use client";

import * as React from "react";

type Result = "WON" | "LOST" | "NO_RESPONSE";

const OPTIONS: Array<{ value: Result; label: string }> = [
  { value: "WON", label: "Won ✓" },
  { value: "LOST", label: "Lost" },
  { value: "NO_RESPONSE", label: "Haven't heard back" },
];

export function OutcomeResponseView({
  token,
  visitorName,
  serviceTitle,
  initialOutcome,
  preselected,
}: {
  token: string;
  visitorName: string;
  serviceTitle: string;
  initialOutcome: Result | null;
  preselected: Result | null;
}) {
  const [answered, setAnswered] = React.useState<Result | null>(initialOutcome);
  const [selected, setSelected] = React.useState<Result | null>(preselected);
  const [value, setValue] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(result: Result) {
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/public/leads/${token}/outcome`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          result,
          value: result === "WON" && value.trim() ? Number(value) : undefined,
        }),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");

      setAnswered(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#F9FAFB_0%,#F3EDE2_100%)] px-4 py-16">
      <div className="mx-auto max-w-md">
        <p className="mb-10 text-center text-xs font-bold uppercase tracking-[0.22em] text-ink">
          GATE
        </p>

        <div className="rounded-card border border-warm-border bg-white/80 p-8 shadow-warm-xl backdrop-blur-xl">
          {answered ? (
            <>
              <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                Recorded
              </span>
              <h1 className="mt-5 text-[24px] font-semibold leading-tight tracking-[-0.03em] text-ink">
                Thanks — marked as {OPTIONS.find((o) => o.value === answered)?.label}.
              </h1>
              <p className="mt-3 text-[14px] leading-7 text-gray-500">
                Changed your mind? You can update this any time using the same link.
              </p>
              <button
                type="button"
                onClick={() => setAnswered(null)}
                className="mt-5 text-[13px] font-medium text-gray-500 underline-offset-2 hover:underline"
              >
                Change answer
              </button>
            </>
          ) : (
            <>
              <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.03em] text-ink">
                Did it work out with {visitorName}?
              </h1>
              <p className="mt-3 text-[14px] leading-7 text-gray-500">
                Your {serviceTitle} call a few days ago — how did it go?
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSelected(opt.value)}
                    className={`inline-flex items-center rounded-full border px-4 py-2 text-[13px] font-medium transition ${
                      selected === opt.value
                        ? "border-ink bg-ink text-white"
                        : "border-warm-border bg-white text-gray-600 hover:border-ink/40"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {selected === "WON" && (
                <input
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  inputMode="numeric"
                  placeholder="Deal value (optional)"
                  className="mt-3 w-full rounded-full border border-warm-border bg-white px-4 py-2.5 text-[13px] outline-none focus:border-ink/40"
                />
              )}

              {error && <p className="mt-3 text-[13px] text-red-500">{error}</p>}

              <button
                type="button"
                disabled={!selected || isSaving}
                onClick={() => selected && void submit(selected)}
                className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-ink py-3 text-[14px] font-semibold text-white transition hover:bg-ink-dark disabled:opacity-40"
              >
                {isSaving ? "Saving…" : "Confirm"}
              </button>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-[12px] text-gray-400">
          Powered by <span className="font-semibold">GATE</span>
        </p>
      </div>
    </main>
  );
}
