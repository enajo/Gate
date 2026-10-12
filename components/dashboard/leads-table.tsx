"use client";

import * as React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { getLeadSourceLabel } from "@/lib/lead-source";

// ── Types ─────────────────────────────────────────────────────────────────────

type ChatMessage = { role: "assistant" | "user"; content: string };

type AnswersJson = {
  conversationHistory?: ChatMessage[];
  aiDecision?: string;
  aiMessage?: string;
  /** Must-haves the gate confirmed before qualifying, with the visitor's words. */
  qualificationEvidence?: Array<{ requirement: string; quote: string }>;
  redirectServiceId?: string | null;
  autoQualified?: boolean;
  reason?: string;
  mode?: string;
  rejectionReasons?: Array<{ requirement: string; quote: string | null }>;
  strongFitReason?: string;
  /** The gate's criteria at the time of this decision. */
  gateCriteria?: string | null;
  calibrationReviewsUsed?: number;
};

type CorrectableResult = "QUALIFIED" | "REDIRECTED" | "REJECTED";

export type VisitRow = {
  id: string;
  referrer?: string | null;
  utmSource?: string | null;
  landingPath?: string | null;
  createdAt: Date | string;
};

export type PriorVisitSummary = {
  id: string;
  createdAt: Date | string;
  serviceTitle: string;
  qualificationResult: "QUALIFIED" | "REDIRECTED" | "REJECTED" | "PENDING_REVIEW";
  outcome?: "WON" | "LOST" | "NO_RESPONSE" | null;
};

export type LeadRow = {
  id: string;
  name: string;
  email: string;
  qualificationResult: "QUALIFIED" | "REDIRECTED" | "REJECTED" | "PENDING_REVIEW";
  service: { title: string };
  answersJson: unknown;
  referrer?: string | null;
  utmSource?: string | null;
  correctedResult?: CorrectableResult | null;
  correctionNote?: string | null;
  /** "Right person, wrong time" — what would need to change. */
  notYetReadyWhen?: string | null;
  notYetReturnedAt?: Date | string | null;
  createdAt: Date | string;
  visits?: VisitRow[];
  priorVisits?: PriorVisitSummary[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const OUTCOME_STYLES: Record<string, { label: string; className: string }> = {
  WON: { label: "Won", className: "bg-green-50 text-green-700 border-green-200" },
  LOST: { label: "Lost", className: "bg-gray-100 text-gray-500 border-gray-200" },
  NO_RESPONSE: { label: "No response", className: "bg-gray-50 text-gray-400 border-gray-200" },
};

const RESULT_STYLES: Record<string, { label: string; className: string }> = {
  QUALIFIED: {
    label: "Qualified",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  REDIRECTED: {
    label: "Redirected",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  REJECTED: {
    label: "Rejected",
    className: "bg-gray-100 text-gray-500 border-gray-200",
  },
  PENDING_REVIEW: {
    label: "Pending",
    className: "bg-blue-50 text-blue-600 border-blue-200",
  },
};

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(value: Date | string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

const AUTO_QUALIFIED_REASONS: Record<string, string> = {
  conversation_allowance_exhausted:
    "Let through without screening — your monthly screening conversations were used up.",
  token_balance_exhausted:
    "Let through without screening — your monthly screening allowance was used up.",
  ai_unavailable: "Let through without screening — the AI was unavailable at the time.",
};

/**
 * Why the gate decided what it did — shown for every lead so the expert can
 * check it applied their criteria the way they meant, and correct it if not.
 */
function DecisionReasons({ lead }: { lead: LeadRow }) {
  const data = (lead.answersJson ?? {}) as AnswersJson;

  let body: React.ReactNode;

  if (data.mode === "OPEN") {
    body = <p className="text-[13px] text-gray-600">No screening — this service is in Open mode.</p>;
  } else if (data.autoQualified) {
    body = (
      <p className="text-[13px] text-gray-600">
        {AUTO_QUALIFIED_REASONS[data.reason ?? ""] ?? "Let through without screening."}
      </p>
    );
  } else if (lead.qualificationResult === "QUALIFIED" && data.qualificationEvidence?.length) {
    body = (
      <>
        <ul className="space-y-1.5">
          {data.qualificationEvidence.map((e, i) => (
            <li key={i} className="text-[13px] leading-5 text-ink">
              <span className="font-medium text-emerald-700">✓ {e.requirement}</span>
              <span className="text-gray-500"> — &ldquo;{e.quote}&rdquo;</span>
            </li>
          ))}
        </ul>
        {data.strongFitReason && (
          <p className="mt-2 text-[13px] leading-5 text-ink">
            <span className="font-medium">★ Strong fit:</span> {data.strongFitReason}
          </p>
        )}
      </>
    );
  } else if (lead.qualificationResult === "REJECTED" && data.rejectionReasons) {
    body = (
      <>
        {data.rejectionReasons.length > 0 ? (
          <ul className="space-y-1.5">
            {data.rejectionReasons.map((r, i) => (
              <li key={i} className="text-[13px] leading-5 text-ink">
                <span className="font-medium text-red-700">✗ {r.requirement}</span>
                <span className="text-gray-500">
                  {r.quote ? <> — &ldquo;{r.quote}&rdquo;</> : " — not said outright"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-gray-600">The gate turned them away without naming a reason.</p>
        )}
        {lead.notYetReadyWhen && (
          <p className="mt-2 text-[13px] leading-5 text-amber-800">
            <span className="font-medium">Not yet</span> — ready when {lead.notYetReadyWhen}
          </p>
        )}
      </>
    );
  } else {
    body = (
      <p className="text-[13px] text-gray-500 italic">
        No reasons recorded — this decision was made before Gate started recording them.
      </p>
    );
  }

  return (
    <div className="mb-5 rounded-[1rem] border border-warm-border-soft bg-white/80 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
        Why this decision
      </p>
      <div className="mt-2">{body}</div>

      {(data.gateCriteria || (data.calibrationReviewsUsed ?? 0) > 0) && (
        <div className="mt-3 border-t border-warm-border-soft/60 pt-2.5 text-[12px] text-gray-500">
          {(data.calibrationReviewsUsed ?? 0) > 0 && (
            <p>Shaped by {data.calibrationReviewsUsed} of your past reviews.</p>
          )}
          {data.gateCriteria && (
            <details className="group mt-1">
              <summary className="cursor-pointer list-none hover:text-ink">
                <span className="inline-block transition-transform group-open:rotate-90">▶</span>{" "}
                Criteria this was judged against
              </summary>
              <pre className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg bg-warm-cream/60 p-3 font-sans text-[12px] leading-5 text-gray-700">
                {data.gateCriteria}
              </pre>
            </details>
          )}
          <p className="mt-1">Disagree? Mark the right call below — your reviews calibrate the gate.</p>
        </div>
      )}
    </div>
  );
}

function Transcript({ answersJson }: { answersJson: unknown }) {
  const data = answersJson as AnswersJson;
  const history = data?.conversationHistory ?? [];

  if (history.length === 0) {
    return (
      <p className="text-[13px] text-gray-400 italic">No conversation recorded.</p>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((msg, i) => (
        <div
          key={i}
          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[80%] rounded-[1rem] px-4 py-2.5 text-[13px] leading-6 ${
              msg.role === "user"
                ? "rounded-tr-sm bg-ink text-white"
                : "rounded-tl-sm border border-warm-border-soft bg-white/80 text-ink"
            }`}
          >
            {msg.content}
          </div>
        </div>
      ))}
      {data.aiMessage && (
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-[1rem] rounded-tl-sm border border-warm-border-soft bg-white/80 px-4 py-2.5 text-[13px] leading-6 text-ink">
            {data.aiMessage}
          </div>
        </div>
      )}

    </div>
  );
}

// Redirect is paused — the gate decides fit or not, so corrections do too.
// (CorrectableResult keeps REDIRECTED so older corrections still display.)
const CORRECTABLE_OPTIONS: CorrectableResult[] = ["QUALIFIED", "REJECTED"];

/** Lets a professional flag that the AI's decision was wrong — every correction is captured, not lost. */
function CorrectionControl({ lead }: { lead: LeadRow }) {
  const [correctedResult, setCorrectedResult] = React.useState(lead.correctedResult ?? null);
  const [note, setNote] = React.useState(lead.correctionNote ?? "");
  const [isEditing, setIsEditing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submitCorrection(result: CorrectableResult) {
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/app/leads/${lead.id}/correction`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correctedResult: result, note: note.trim() || undefined }),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to save correction.");

      setCorrectedResult(result);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save correction.");
    } finally {
      setIsSaving(false);
    }
  }

  if (correctedResult && !isEditing) {
    return (
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-[0.85rem] border border-warm-border-soft bg-white/60 px-4 py-3">
        <p className="text-[12px] text-gray-500">
          Marked as <span className="font-medium text-ink">{RESULT_STYLES[correctedResult]?.label}</span>
          {note ? ` — "${note}"` : ""}
        </p>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="text-[12px] font-medium text-gray-500 hover:text-ink hover:underline"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-[0.85rem] border border-warm-border-soft bg-white/60 px-4 py-3">
      <p className="text-[12px] font-medium text-gray-600">Was this the right call?</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {CORRECTABLE_OPTIONS.map((opt) => (
          <button
            key={opt}
            type="button"
            disabled={isSaving}
            onClick={() => void submitCorrection(opt)}
            className="inline-flex items-center rounded-full border border-warm-border-soft bg-white px-3 py-1 text-[12px] font-medium text-gray-600 transition hover:border-ink/40 disabled:opacity-40"
          >
            {RESULT_STYLES[opt]?.label}
          </button>
        ))}
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note — why?"
        maxLength={500}
        className="mt-2 w-full rounded-full border border-warm-border-soft bg-white px-3 py-1.5 text-[12px] outline-none focus:border-ink/40"
      />
      {error && <p className="mt-1.5 text-[12px] text-red-500">{error}</p>}
    </div>
  );
}

/** Every recorded hit from this visitor before they became a lead — the "how did they get here" trail. */
function VisitPath({ visits }: { visits: VisitRow[] }) {
  if (visits.length === 0) return null;

  return (
    <div className="mb-5">
      <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-gray-400">
        Path to this lead
      </p>
      <div className="space-y-2">
        {visits.map((visit, i) => (
          <div
            key={visit.id}
            className="flex items-center justify-between gap-3 rounded-[0.75rem] border border-warm-border-soft bg-white/60 px-3.5 py-2 text-[12px]"
          >
            <span className="text-gray-500">
              {i + 1}. via <span className="font-medium text-ink">{getLeadSourceLabel(visit)}</span>
              {visit.landingPath ? (
                <span className="text-gray-400"> · {visit.landingPath}</span>
              ) : null}
            </span>
            <span className="shrink-0 text-gray-400">{formatDateTime(visit.createdAt)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Every prior time this same email qualified with this professional — the thing missing without it, no memory of a repeat visitor. */
function PreviousContact({ priorVisits }: { priorVisits: PriorVisitSummary[] }) {
  if (priorVisits.length === 0) return null;

  return (
    <div className="mb-5 rounded-[0.85rem] border border-brand-amber/40 bg-brand-amber-faint px-4 py-3.5">
      <p className="text-[12px] font-medium text-ink">
        Reached out {priorVisits.length} time{priorVisits.length === 1 ? "" : "s"} before
      </p>
      <div className="mt-2.5 space-y-1.5">
        {priorVisits.map((visit) => {
          const style = RESULT_STYLES[visit.qualificationResult] ?? RESULT_STYLES.PENDING_REVIEW;
          const outcomeStyle = visit.outcome ? OUTCOME_STYLES[visit.outcome] : null;

          return (
            <div
              key={visit.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-full border border-warm-border-soft bg-white/70 px-3.5 py-1.5 text-[12px]"
            >
              <span className="text-gray-500">
                {formatDate(visit.createdAt)} · {visit.serviceTitle}
              </span>
              <span className="flex gap-1.5">
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${style.className}`}>
                  {style.label}
                </span>
                {outcomeStyle && (
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${outcomeStyle.className}`}>
                    {outcomeStyle.label}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LeadRowItem({ lead }: { lead: LeadRow }) {
  const [open, setOpen] = React.useState(false);
  const style = RESULT_STYLES[lead.qualificationResult] ?? RESULT_STYLES.PENDING_REVIEW;

  return (
    <div className="border-b border-warm-border-soft last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-white/50"
      >
        {open ? (
          <ChevronDown className="size-4 shrink-0 text-gray-400" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-gray-400" />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[14px] font-medium">{lead.name}</p>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${style.className}`}
            >
              {style.label}
            </span>
            {lead.correctedResult && (
              <span className="inline-flex items-center rounded-full border border-warm-border-soft bg-white px-2.5 py-0.5 text-[11px] font-medium text-gray-500">
                Reviewed
              </span>
            )}
            {lead.notYetReadyWhen && (
              <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-800">
                Not yet
              </span>
            )}
            {lead.notYetReturnedAt && (
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-800">
                Came back {formatDate(lead.notYetReturnedAt)}
              </span>
            )}
            {lead.priorVisits && lead.priorVisits.length > 0 && (
              <span className="inline-flex items-center rounded-full border border-brand-amber/40 bg-brand-amber-faint px-2.5 py-0.5 text-[11px] font-medium text-ink">
                Repeat contact
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[12px] text-gray-500">{lead.email}</p>
          {lead.notYetReadyWhen && (
            <p className="mt-0.5 text-[12px] text-amber-800">
              Ready when: {lead.notYetReadyWhen}
            </p>
          )}
        </div>

        <div className="hidden shrink-0 text-right sm:block">
          <p className="text-[13px] text-gray-500">{lead.service.title}</p>
          <p className="mt-0.5 text-[11px] text-gray-400">
            {formatDate(lead.createdAt)} · via {getLeadSourceLabel(lead)}
          </p>
        </div>
      </button>

      {open && (
        <div className="border-t border-warm-border-soft/60 bg-warm-cream/40 px-5 py-5">
          {lead.priorVisits && lead.priorVisits.length > 0 && (
            <PreviousContact priorVisits={lead.priorVisits} />
          )}
          {lead.visits && lead.visits.length > 0 && <VisitPath visits={lead.visits} />}
          <p className="mb-4 text-[11px] uppercase tracking-[0.18em] text-gray-400">
            Conversation
          </p>
          <DecisionReasons lead={lead} />
          <Transcript answersJson={lead.answersJson} />
          <CorrectionControl lead={lead} />
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function LeadsTable({ leads }: { leads: LeadRow[] }) {
  if (leads.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-[15px] font-medium text-ink">No leads yet.</p>
        <p className="mt-2 text-[13px] text-gray-500">
          Leads appear here after visitors complete your qualification gate.
        </p>
      </div>
    );
  }

  return (
    <div>
      {leads.map((lead) => (
        <LeadRowItem key={lead.id} lead={lead} />
      ))}
    </div>
  );
}
