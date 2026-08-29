"use client";

import * as React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type ChatMessage = { role: "assistant" | "user"; content: string };

type AnswersJson = {
  conversationHistory?: ChatMessage[];
  aiDecision?: string;
  aiMessage?: string;
  redirectServiceId?: string | null;
  autoQualified?: boolean;
  reason?: string;
};

type CorrectableResult = "QUALIFIED" | "REDIRECTED" | "REJECTED";

export type VisitRow = {
  id: string;
  referrer?: string | null;
  utmSource?: string | null;
  landingPath?: string | null;
  createdAt: Date | string;
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
  createdAt: Date | string;
  visits?: VisitRow[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

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

/** Best-effort label for where this visitor came from — never fails on a malformed referrer. */
function getSourceLabel(lead: Pick<LeadRow, "referrer" | "utmSource">) {
  if (lead.utmSource) return lead.utmSource;

  if (lead.referrer) {
    try {
      return new URL(lead.referrer).hostname.replace(/^www\./, "");
    } catch {
      // malformed/relative referrer — fall through to "Direct"
    }
  }

  return "Direct";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Transcript({ answersJson }: { answersJson: unknown }) {
  const data = answersJson as AnswersJson;
  const history = data?.conversationHistory ?? [];

  if (data?.autoQualified) {
    return (
      <p className="text-[13px] text-gray-400 italic">
        Auto-qualified (AI token balance exhausted).
      </p>
    );
  }

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

const CORRECTABLE_OPTIONS: CorrectableResult[] = ["QUALIFIED", "REDIRECTED", "REJECTED"];

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
              {i + 1}. via <span className="font-medium text-ink">{getSourceLabel(visit)}</span>
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
          </div>
          <p className="mt-0.5 text-[12px] text-gray-500">{lead.email}</p>
        </div>

        <div className="hidden shrink-0 text-right sm:block">
          <p className="text-[13px] text-gray-500">{lead.service.title}</p>
          <p className="mt-0.5 text-[11px] text-gray-400">
            {formatDate(lead.createdAt)} · via {getSourceLabel(lead)}
          </p>
        </div>
      </button>

      {open && (
        <div className="border-t border-warm-border-soft/60 bg-warm-cream/40 px-5 py-5">
          {lead.visits && lead.visits.length > 0 && <VisitPath visits={lead.visits} />}
          <p className="mb-4 text-[11px] uppercase tracking-[0.18em] text-gray-400">
            Conversation
          </p>
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
