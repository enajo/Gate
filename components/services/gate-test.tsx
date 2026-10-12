"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, FlaskConical, HelpCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Types (mirror server/services/gate-test.service.ts) ───────────────────────

type Archetype = "IDEAL" | "BORDERLINE" | "MISMATCH";
type Outcome = "QUALIFIED" | "REJECTED" | "NO_DECISION" | "GATE_ERROR";
type Verdict = "AS_EXPECTED" | "CHECK_THIS" | "CLOSE_CALL";

type TestResult = {
  archetype: Archetype;
  persona: { name: string; summary: string };
  transcript: Array<{ role: "assistant" | "user"; content: string }>;
  outcome: Outcome;
  isStrongFit: boolean;
  readyWhen: string | null;
  verdict: Verdict;
};

type VisitorRun =
  | { key: string; archetype: Archetype; status: "running" }
  | { key: string; archetype: Archetype; status: "done"; result: TestResult }
  | { key: string; archetype: Archetype; status: "error"; error: string };

export type GateTestProps = {
  serviceId: string;
  serviceTitle?: string;
  /** The draft prompt being tested — may not be saved yet. */
  prompt: string;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const BATCH: Array<{ archetype: Archetype; variant: number }> = [
  { archetype: "IDEAL", variant: 0 },
  { archetype: "IDEAL", variant: 1 },
  { archetype: "BORDERLINE", variant: 0 },
  { archetype: "BORDERLINE", variant: 1 },
  { archetype: "MISMATCH", variant: 0 },
  { archetype: "MISMATCH", variant: 1 },
];

const ARCHETYPE_LABEL: Record<Archetype, string> = {
  IDEAL: "Ideal client",
  BORDERLINE: "Borderline",
  MISMATCH: "Wrong fit",
};

function outcomeLabel(result: TestResult): string {
  switch (result.outcome) {
    case "QUALIFIED":
      return result.isStrongFit ? "Qualified · strong fit" : "Qualified";
    case "REJECTED":
      return result.readyWhen ? "Not yet" : "Rejected";
    case "NO_DECISION":
      return "No decision";
    case "GATE_ERROR":
      return "AI error";
  }
}

function checkThisHint(result: TestResult): string {
  if (result.outcome === "GATE_ERROR") {
    return "The AI call failed — a real visitor would have been let through automatically. Try running the test again.";
  }
  if (result.outcome === "NO_DECISION") {
    return "The gate kept asking without deciding. A sharper key question in your prompt usually fixes this.";
  }
  if (result.archetype === "IDEAL") {
    return "This is someone you'd want — but the gate turned them away. Your positive signals may be too strict.";
  }
  return "This visitor matches a wrong-fit pattern — but the gate let them in. Try making that red flag more explicit.";
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GateTest({ serviceId, serviceTitle, prompt }: GateTestProps) {
  const [runs, setRuns] = React.useState<VisitorRun[]>([]);
  const [testedPrompt, setTestedPrompt] = React.useState<string | null>(null);

  const isRunning = runs.some((r) => r.status === "running");
  const canRun = prompt.trim().length >= 20 && !isRunning;
  const promptChanged = testedPrompt !== null && testedPrompt !== prompt;

  async function runVisitor(key: string, archetype: Archetype, variant: number) {
    let next: VisitorRun;

    try {
      const res = await fetch(`/api/app/services/${serviceId}/gate/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          archetype,
          variant,
          idealPersonaDescription: prompt,
          serviceTitle: serviceTitle || undefined,
        }),
      });

      const data = (await res.json()) as { result?: TestResult; error?: string };

      next =
        res.ok && data.result
          ? { key, archetype, status: "done", result: data.result }
          : {
              key,
              archetype,
              status: "error",
              error:
                res.status === 429
                  ? "You've run a lot of tests this hour — try again a little later."
                  : (data.error ?? "Couldn't run this test visitor."),
            };
    } catch {
      next = { key, archetype, status: "error", error: "Network error. Please check your connection." };
    }

    setRuns((prev) => prev.map((r) => (r.key === key ? next : r)));
  }

  function handleRun() {
    const runId = Date.now();
    const initial: VisitorRun[] = BATCH.map((v) => ({
      key: `${runId}-${v.archetype}-${v.variant}`,
      archetype: v.archetype,
      status: "running",
    }));

    setRuns(initial);
    setTestedPrompt(prompt);

    initial.forEach((run, i) => {
      void runVisitor(run.key, BATCH[i]!.archetype, BATCH[i]!.variant);
    });
  }

  const finished = runs.filter((r): r is Extract<VisitorRun, { status: "done" }> => r.status === "done");
  const expectedCount = finished.filter((r) => r.result.verdict === "AS_EXPECTED").length;
  const checkCount = finished.filter((r) => r.result.verdict === "CHECK_THIS").length;
  const closeCount = finished.filter((r) => r.result.verdict === "CLOSE_CALL").length;

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div>
          <p className="flex items-center gap-1.5 text-[13px] font-medium text-slate-800">
            <FlaskConical className="size-4 text-brand-amber" />
            Test your gate
          </p>
          <p className="mt-0.5 text-[12px] text-slate-500">
            Send {BATCH.length} simulated visitors through this prompt — ideal clients, borderline cases, and wrong fits — and see who gets in. Nothing is saved or counted.
          </p>
        </div>

        <Button type="button" variant="outline" disabled={!canRun} onClick={handleRun}>
          {isRunning ? (
            <><Loader2 className="size-4 animate-spin" />Testing…</>
          ) : runs.length > 0 ? (
            "Run again"
          ) : (
            "Run test"
          )}
        </Button>
      </div>

      {runs.length > 0 && (
        <div className="space-y-2.5 px-4 py-3">
          {promptChanged && !isRunning && (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-[12px] text-slate-500">
              You&apos;ve edited the prompt since this test — run again to test the new version.
            </p>
          )}

          {!isRunning && finished.length > 0 && (
            <p className="text-[12px] text-slate-600">
              {expectedCount} went as expected
              {checkCount > 0 && <> · <span className="font-medium text-red-600">{checkCount} to check</span></>}
              {closeCount > 0 && <> · {closeCount} close {closeCount === 1 ? "call" : "calls"} for you to judge</>}
            </p>
          )}

          {runs.map((run) => (
            <VisitorCard key={run.key} run={run} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Visitor card ──────────────────────────────────────────────────────────────

function VisitorCard({ run }: { run: VisitorRun }) {
  if (run.status === "running") {
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-slate-100 px-3 py-2.5 text-[12px] text-slate-400">
        <Loader2 className="size-3.5 animate-spin" />
        {ARCHETYPE_LABEL[run.archetype]} — talking to your gate…
      </div>
    );
  }

  if (run.status === "error") {
    return (
      <div className="rounded-lg border border-slate-100 px-3 py-2.5 text-[12px] text-slate-500">
        {ARCHETYPE_LABEL[run.archetype]} — {run.error}
      </div>
    );
  }

  const { result } = run;
  const needsCheck = result.verdict === "CHECK_THIS";

  return (
    <div
      className={`rounded-lg border px-3 py-2.5 ${
        needsCheck ? "border-red-200 bg-red-50/40" : "border-slate-100"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-slate-800">
          <span className="mr-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
            {ARCHETYPE_LABEL[result.archetype]}
          </span>
          {result.persona.name}
        </p>
        <p className="flex items-center gap-1 text-[12px] font-medium text-slate-700">
          {result.verdict === "AS_EXPECTED" && <CheckCircle2 className="size-3.5 text-emerald-600" />}
          {result.verdict === "CHECK_THIS" && <AlertTriangle className="size-3.5 text-red-600" />}
          {result.verdict === "CLOSE_CALL" && <HelpCircle className="size-3.5 text-slate-400" />}
          {outcomeLabel(result)}
        </p>
      </div>

      <p className="mt-1 text-[12px] text-slate-500">{result.persona.summary}</p>
      {result.readyWhen && (
        <p className="mt-1 text-[12px] text-amber-800">Ready when: {result.readyWhen}</p>
      )}

      {needsCheck && <p className="mt-1.5 text-[12px] text-red-700">{checkThisHint(result)}</p>}
      {result.verdict === "CLOSE_CALL" && (
        <p className="mt-1.5 text-[12px] text-slate-500">
          Close call — would you have taken this call? If not, tighten the prompt.
        </p>
      )}

      {result.transcript.length > 0 && (
        <details className="group mt-2">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-800">
            <span className="inline-block transition-transform group-open:rotate-90">▶</span>
            Read the conversation
          </summary>
          <div className="mt-2 space-y-2 rounded-lg bg-slate-50 p-3">
            {result.transcript.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : ""}`}>
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-1.5 text-[12px] leading-relaxed ${
                    msg.role === "assistant"
                      ? "border border-slate-200 bg-white text-slate-800"
                      : "bg-ink text-white"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
