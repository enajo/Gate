"use client";

import * as React from "react";
import {
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  Trash2,
  X,
  Zap,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ServiceAccessCodesProps {
  serviceId: string;
}

interface CodeRow {
  id: string;
  codeLabel: string | null;
  isActive: boolean;
  usedAt: string | null;
  usedByEmail: string | null;
  createdAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function writeToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve, reject) => {
    const el = document.createElement("textarea");
    el.value = text;
    el.style.cssText = "position:fixed;top:0;left:0;opacity:0;";
    document.body.appendChild(el);
    el.focus();
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    ok ? resolve() : reject(new Error("execCommand copy failed"));
  });
}

// ── Code list modal ───────────────────────────────────────────────────────────

interface CodeModalProps {
  codes: CodeRow[];
  newIds: Set<string>;
  copiedId: string | null;
  deletingIds: Set<string>;
  onCopy: (value: string, id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

function CodeModal({
  codes,
  newIds,
  copiedId,
  deletingIds,
  onCopy,
  onDelete,
  onClose,
}: CodeModalProps) {
  // Lock body scroll while modal open
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Close on Escape
  React.useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const available = codes.filter((c) => c.isActive && !c.usedAt);
  const used = codes.filter((c) => c.usedAt !== null);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex w-full max-w-lg flex-col rounded-[1.75rem] bg-white shadow-2xl"
        style={{ maxHeight: "80vh" }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#F3F0EB] px-5 py-4">
          <div className="flex items-center gap-2">
            <KeyRound className="size-4 text-[#DFA767]" />
            <p className="text-[14px] font-semibold text-[#2B2B2B]">
              Access Codes
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[12px] text-[#6B7280]">
              {available.length} available · {used.length} used
            </span>
            <button
              type="button"
              onClick={onClose}
              className="flex size-7 items-center justify-center rounded-full border border-[#E7E5E4] text-[#9CA3AF] transition hover:border-[#2B2B2B] hover:text-[#2B2B2B]"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Scrollable list */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {codes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <KeyRound className="mb-3 size-6 text-[#D8D0C6]" />
              <p className="text-[13px] text-[#6B7280]">No codes yet.</p>
              <p className="mt-1 text-[11px] text-[#9CA3AF]">
                Generate codes using the controls below.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Available codes */}
              {available.length > 0 && (
                <section>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                    Available ({available.length})
                  </p>
                  <div className="space-y-1.5">
                    {available.map((code) => (
                      <CodeRowItem
                        key={code.id}
                        code={code}
                        isNew={newIds.has(code.id)}
                        copied={copiedId === code.id}
                        deleting={deletingIds.has(code.id)}
                        onCopy={() =>
                          onCopy(code.codeLabel ?? "", code.id)
                        }
                        onDelete={() => onDelete(code.id)}
                        formatDate={formatDate}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Used codes */}
              {used.length > 0 && (
                <section>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                    Used ({used.length})
                  </p>
                  <div className="space-y-1.5">
                    {used.map((code) => (
                      <CodeRowItem
                        key={code.id}
                        code={code}
                        isNew={false}
                        copied={copiedId === code.id}
                        deleting={deletingIds.has(code.id)}
                        onCopy={() =>
                          onCopy(code.codeLabel ?? "", code.id)
                        }
                        onDelete={() => onDelete(code.id)}
                        formatDate={formatDate}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface CodeRowItemProps {
  code: CodeRow;
  isNew: boolean;
  copied: boolean;
  deleting: boolean;
  onCopy: () => void;
  onDelete: () => void;
  formatDate: (iso: string) => string;
}

function CodeRowItem({
  code,
  isNew,
  copied,
  deleting,
  onCopy,
  onDelete,
  formatDate,
}: CodeRowItemProps) {
  return (
    <div
      className={[
        "flex items-center gap-3 rounded-[0.875rem] border px-3 py-2.5 transition-colors",
        isNew
          ? "border-emerald-200 bg-emerald-50/60"
          : code.usedAt
            ? "border-[#F3F0EB] bg-[#FAFAF9]"
            : "border-[#E7E5E4] bg-white",
      ].join(" ")}
    >
      {/* Code label */}
      <div className="min-w-0 flex-1">
        <span className="block font-mono text-[13px] tracking-[0.12em] text-[#2B2B2B]">
          {code.codeLabel ?? "—"}
        </span>
        {code.usedAt ? (
          <span className="block truncate text-[10px] text-[#9CA3AF]">
            Used {formatDate(code.usedAt)}
            {code.usedByEmail ? ` · ${code.usedByEmail}` : ""}
          </span>
        ) : isNew ? (
          <span className="block text-[10px] text-emerald-600">Just generated</span>
        ) : (
          <span className="block text-[10px] text-[#9CA3AF]">
            Created {formatDate(code.createdAt)}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1.5">
        {!code.usedAt && (
          <button
            type="button"
            onClick={onCopy}
            title="Copy code"
            className="flex size-7 items-center justify-center rounded-full border border-[#D8D0C6] text-[#6B7280] transition hover:border-[#2B2B2B] hover:text-[#2B2B2B]"
          >
            {copied ? (
              <CheckCircle2 className="size-3.5 text-green-500" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </button>
        )}

        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          title="Delete code"
          className="flex size-7 items-center justify-center rounded-full border border-[#D8D0C6] text-[#9CA3AF] transition hover:border-red-300 hover:text-red-500 disabled:opacity-40"
        >
          {deleting ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Trash2 className="size-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ServiceAccessCodes({ serviceId }: ServiceAccessCodesProps) {
  const [codes, setCodes] = React.useState<CodeRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [count, setCount] = React.useState(10);
  const [generating, setGenerating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [deletingIds, setDeletingIds] = React.useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = React.useState(false);
  const [newIds, setNewIds] = React.useState<Set<string>>(new Set());

  // Derived
  const available = codes.filter((c) => c.isActive && !c.usedAt).length;
  const used = codes.filter((c) => c.usedAt !== null).length;

  const loadCodes = React.useCallback(async () => {
    if (!serviceId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/app/access-codes?serviceId=${encodeURIComponent(serviceId)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setCodes(
          (
            data as {
              accessCodes: CodeRow[];
            }
          ).accessCodes ?? [],
        );
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  React.useEffect(() => {
    setCodes([]);
    setError(null);
    setNewIds(new Set());
    void loadCodes();
  }, [serviceId, loadCodes]);

  // Sort: new ones first within available group, then by createdAt desc
  const sortedCodes = React.useMemo(() => {
    return [...codes].sort((a, b) => {
      // usedAt null (available) comes before usedAt set (used)
      if (!a.usedAt && b.usedAt) return -1;
      if (a.usedAt && !b.usedAt) return 1;
      // Within same group: newly generated first
      const aNew = newIds.has(a.id) ? 1 : 0;
      const bNew = newIds.has(b.id) ? 1 : 0;
      if (aNew !== bNew) return bNew - aNew;
      return (
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
  }, [codes, newIds]);

  async function handleGenerate() {
    if (generating) return;
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/app/access-codes/bulk-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId, count }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(
          (data as { error?: string }).error ?? "Failed to generate codes.",
        );
        return;
      }

      const generated = (
        data as { codes: { id: string; codeValue: string }[] }
      ).codes;
      setNewIds(new Set(generated.map((c) => c.id)));
      await loadCodes();
      setModalOpen(true); // Auto-open to show new codes
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingIds((prev) => new Set([...prev, id]));
    try {
      const res = await fetch(`/api/app/access-codes/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setCodes((prev) => prev.filter((c) => c.id !== id));
        setNewIds((prev) => {
          const s = new Set(prev);
          s.delete(id);
          return s;
        });
      }
    } catch {
      // ignore
    } finally {
      setDeletingIds((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
    }
  }

  async function handleCopy(value: string, id: string) {
    if (!value) return;
    try {
      await writeToClipboard(value);
      setCopiedId(id);
      setTimeout(
        () => setCopiedId((prev) => (prev === id ? null : prev)),
        2000,
      );
    } catch {
      // ignore
    }
  }

  return (
    <>
      <div className="mt-6 rounded-[1.25rem] border border-[#E7E5E4] bg-white/80 p-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <KeyRound className="size-3.5 text-[#DFA767]" />
          <p className="text-[12px] font-medium text-[#2B2B2B]">
            Access Codes
          </p>

          <span className="ml-auto text-[11px] text-[#9CA3AF]">
            {loading
              ? "Loading…"
              : `${available} available · ${used} used`}
          </span>
        </div>

        <p className="mt-2 text-[11px] leading-5 text-[#6B7280]">
          Generate single-use codes for this service. Each code can only be
          used once.
        </p>

        {/* Controls */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {/* Count input */}
          <div className="flex items-center gap-1.5 rounded-full border border-[#D8D0C6] bg-[#F9FAFB] px-3 py-1.5">
            <span className="text-[11px] text-[#6B7280]">Count</span>
            <input
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(e) =>
                setCount(
                  Math.min(50, Math.max(1, parseInt(e.target.value, 10) || 1)),
                )
              }
              className="w-10 bg-transparent text-center text-[13px] font-medium text-[#2B2B2B] outline-none"
            />
          </div>

          {/* Generate */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex h-9 items-center rounded-full bg-[#2B2B2B] px-4 text-[12px] text-white transition hover:bg-[#1a1a1a] disabled:opacity-60"
          >
            {generating ? (
              <Loader2 className="mr-2 size-3.5 animate-spin" />
            ) : (
              <Zap className="mr-2 size-3.5" />
            )}
            {generating ? "Generating…" : "Generate"}
          </button>

          {/* View all */}
          {codes.length > 0 && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex h-9 items-center rounded-full border border-[#D8D0C6] px-4 text-[12px] transition hover:border-[#2B2B2B]"
            >
              View all {codes.length}
            </button>
          )}
        </div>

        {/* Error */}
        {error ? (
          <div className="mt-4 rounded-[0.875rem] border border-red-100 bg-red-50 px-4 py-3 text-[12px] text-red-700">
            {error}
          </div>
        ) : null}
      </div>

      {/* Code list modal */}
      {modalOpen ? (
        <CodeModal
          codes={sortedCodes}
          newIds={newIds}
          copiedId={copiedId}
          deletingIds={deletingIds}
          onCopy={handleCopy}
          onDelete={handleDelete}
          onClose={() => setModalOpen(false)}
        />
      ) : null}
    </>
  );
}
