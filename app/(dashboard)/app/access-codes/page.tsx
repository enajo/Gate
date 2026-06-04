"use client";

import * as React from "react";
import {
  CheckCircle2,
  Copy,
  KeyRound,
  Layers,
  Loader2,
  Plus,
  X,
} from "lucide-react";

import type { AccessCodeRowValue } from "@/components/access-codes/access-code-row";
import { AccessCodeRow } from "@/components/access-codes/access-code-row";
import { PageShell } from "@/components/layout/page-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { SectionHeading } from "@/components/shared/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ── Types ──────────────────────────────────────────────────────────────────────

type ServiceOption = {
  id: string;
  title: string;
};

type GeneratedCode = {
  id: string;
  codeValue: string;
  codeLabel: string;
  serviceId: string | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function groupByService(
  codes: AccessCodeRowValue[],
  services: ServiceOption[],
): Array<{ serviceId: string | null; serviceName: string; codes: AccessCodeRowValue[] }> {
  const serviceMap = new Map(services.map((s) => [s.id, s.title]));
  const groups = new Map<string | null, AccessCodeRowValue[]>();

  for (const code of codes) {
    const key = code.serviceId ?? null;
    const existing = groups.get(key) ?? [];
    existing.push(code);
    groups.set(key, existing);
  }

  const result: Array<{ serviceId: string | null; serviceName: string; codes: AccessCodeRowValue[] }> = [];

  // Service-scoped groups first (sorted by name)
  const serviceKeys = [...groups.keys()].filter((k) => k !== null) as string[];
  serviceKeys.sort((a, b) => {
    const nameA = serviceMap.get(a) ?? a;
    const nameB = serviceMap.get(b) ?? b;
    return nameA.localeCompare(nameB);
  });

  for (const sid of serviceKeys) {
    result.push({
      serviceId: sid,
      serviceName: serviceMap.get(sid) ?? "Unknown service",
      codes: groups.get(sid) ?? [],
    });
  }

  // Universal codes last
  const universal = groups.get(null);
  if (universal?.length) {
    result.push({ serviceId: null, serviceName: "Universal (any service)", codes: universal });
  }

  return result;
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AccessCodesPage() {
  const [accessCodes, setAccessCodes] = React.useState<AccessCodeRowValue[]>([]);
  const [services, setServices] = React.useState<ServiceOption[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Generate dialog
  const [generateOpen, setGenerateOpen] = React.useState(false);
  const [genServiceId, setGenServiceId] = React.useState<string>("");
  const [genCount, setGenCount] = React.useState(10);
  const [genPrefix, setGenPrefix] = React.useState("");
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [generateError, setGenerateError] = React.useState<string | null>(null);

  // Results modal
  const [generatedCodes, setGeneratedCodes] = React.useState<GeneratedCode[]>([]);
  const [resultsOpen, setResultsOpen] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [copiedAll, setCopiedAll] = React.useState(false);

  // Load data
  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [codesRes, servicesRes] = await Promise.all([
        fetch("/api/app/access-codes", { cache: "no-store" }),
        fetch("/api/app/services", { cache: "no-store" }),
      ]);

      const [codesData, servicesData] = await Promise.all([
        codesRes.json() as Promise<{ accessCodes?: AccessCodeRowValue[]; error?: string }>,
        servicesRes.json() as Promise<{ services?: ServiceOption[]; error?: string }>,
      ]);

      if (!codesRes.ok) throw new Error(codesData.error ?? "Failed to load access codes.");

      setAccessCodes(codesData.accessCodes ?? []);
      setServices((servicesData.services ?? []).map((s) => ({ id: s.id, title: s.title })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  // Generate
  async function handleGenerate() {
    setGenerateError(null);
    setIsGenerating(true);

    try {
      const res = await fetch("/api/app/access-codes/bulk-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: genServiceId || null,
          count: genCount,
          labelPrefix: genPrefix.trim() || null,
        }),
      });

      const data = (await res.json()) as {
        codes?: GeneratedCode[];
        error?: string;
      };

      if (!res.ok) throw new Error(data.error ?? "Failed to generate codes.");

      setGeneratedCodes(data.codes ?? []);
      setGenerateOpen(false);
      setResultsOpen(true);
      await loadData();
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Failed to generate codes.");
    } finally {
      setIsGenerating(false);
    }
  }

  // Toggle / delete
  async function handleToggleActive(accessCode: AccessCodeRowValue) {
    try {
      const res = await fetch(`/api/app/access-codes/${accessCode.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !accessCode.isActive }),
      });
      const data = (await res.json()) as { accessCode?: AccessCodeRowValue };
      if (res.ok && data.accessCode) {
        setAccessCodes((curr) =>
          curr.map((c) => (c.id === data.accessCode!.id ? data.accessCode! : c)),
        );
      }
    } catch { /* silent */ }
  }

  async function handleDelete(accessCode: AccessCodeRowValue) {
    try {
      const res = await fetch(`/api/app/access-codes/${accessCode.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false, deleted: true }),
      });
      if (res.ok) {
        setAccessCodes((curr) => curr.filter((c) => c.id !== accessCode.id));
      }
    } catch { /* silent */ }
  }

  // Copy helpers — use clipboard API with a textarea fallback for browsers
  // that block it (focus traps, HTTP, permission not yet granted, etc.)
  function writeToClipboard(text: string): Promise<void> {
    if (navigator.clipboard?.writeText) {
      return navigator.clipboard.writeText(text);
    }
    // Legacy fallback
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

  async function copyCode(code: GeneratedCode) {
    try {
      await writeToClipboard(code.codeValue);
      setCopiedId(code.id);
      window.setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // Could not copy — at minimum the value is visible in the modal
    }
  }

  async function copyAll() {
    const text = generatedCodes.map((c) => c.codeValue).join("\n");
    try {
      await writeToClipboard(text);
      setCopiedAll(true);
      window.setTimeout(() => setCopiedAll(false), 1500);
    } catch {
      // Could not copy
    }
  }

  const groups = groupByService(accessCodes, services);

  const usedCount = accessCodes.filter((c) => c.usedAt).length;
  const unusedCount = accessCodes.filter((c) => !c.usedAt && c.isActive).length;

  return (
    <PageShell
      header={
        <SectionHeading
          title="Access codes"
          description="Generate single-use codes per service — one code per person. Each code expires after use."
          maxWidth="full"
        />
      }
      actions={
        <Button type="button" onClick={() => setGenerateOpen(true)}>
          <Plus className="size-4" />
          Generate codes
        </Button>
      }
    >
      {isLoading ? (
        <LoadingState
          inset
          title="Loading access codes"
          description="Fetching your booking access controls…"
        />
      ) : error && accessCodes.length === 0 ? (
        <ErrorState inset title="Could not load access codes" description={error} />
      ) : (
        <div className="space-y-6">
          {/* Stats row */}
          {accessCodes.length > 0 && (
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
                <span className="font-semibold text-slate-900">{accessCodes.length}</span>
                <span className="text-slate-500">total codes</span>
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm">
                <span className="font-semibold text-emerald-700">{unusedCount}</span>
                <span className="text-emerald-600">available</span>
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <span className="font-semibold text-slate-600">{usedCount}</span>
                <span className="text-slate-500">used</span>
              </div>
            </div>
          )}

          {/* Grouped lists */}
          {groups.length === 0 ? (
            <EmptyState
              inset
              icon={<KeyRound className="size-5 text-slate-500" />}
              title="No access codes yet"
              description="Generate a batch of single-use codes for a specific service."
              action={
                <Button type="button" onClick={() => setGenerateOpen(true)}>
                  <Plus className="size-4" />
                  Generate codes
                </Button>
              }
            />
          ) : (
            groups.map((group) => {
              const groupUsed = group.codes.filter((c) => c.usedAt).length;
              const groupAvailable = group.codes.filter((c) => !c.usedAt && c.isActive).length;

              return (
                <div key={group.serviceId ?? "universal"} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-slate-100">
                      <Layers className="size-3.5 text-slate-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      {group.serviceName}
                    </h3>
                    <Badge variant="outline" className="text-xs">
                      {groupAvailable} available
                    </Badge>
                    {groupUsed > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {groupUsed} used
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    {group.codes.map((code) => (
                      <AccessCodeRow
                        key={code.id}
                        accessCode={code}
                        onToggleActive={handleToggleActive}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Generate Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate access codes</DialogTitle>
            <DialogDescription>
              Create a batch of single-use codes. Each code can only be used once by one person.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* Service selector */}
            <div className="space-y-2">
              <Label>Service (optional)</Label>
              <select
                value={genServiceId}
                onChange={(e) => setGenServiceId(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400"
              >
                <option value="">Universal — works for any service</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">
                Service-scoped codes only work for that specific booking type.
              </p>
            </div>

            {/* Count */}
            <div className="space-y-2">
              <Label>Number of codes</Label>
              <div className="flex items-center gap-3">
                {[5, 10, 20, 50].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setGenCount(n)}
                    className={`h-9 flex-1 rounded-xl border text-sm font-medium transition ${
                      genCount === n
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Prefix */}
            <div className="space-y-2">
              <Label>Code prefix (optional)</Label>
              <Input
                placeholder="VIP"
                value={genPrefix}
                onChange={(e) => setGenPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                maxLength={8}
                className="font-mono uppercase"
              />
              <p className="text-xs text-slate-500">
                Codes will look like{" "}
                <span className="font-mono font-medium">
                  {genPrefix ? `${genPrefix}-A3B7F2E9` : "A3B7F2E9"}
                </span>
              </p>
            </div>

            {generateError && (
              <p className="text-sm text-red-600">{generateError}</p>
            )}

            <div className="flex items-center justify-end gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setGenerateOpen(false)}
                disabled={isGenerating}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void handleGenerate()}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <KeyRound className="size-4" />
                    Generate {genCount} codes
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Generated Codes Results Modal ──────────────────────────────────── */}
      <Dialog open={resultsOpen} onOpenChange={setResultsOpen}>
        <DialogContent className="max-h-[80vh] max-w-lg overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-500" />
              {generatedCodes.length} codes generated
            </DialogTitle>
            <DialogDescription>
              Copy these codes and share one with each person. Each code works exactly once.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-1">
            {generatedCodes.map((code) => (
              <div
                key={code.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5"
              >
                <span className="font-mono text-sm font-semibold tracking-wide text-slate-900">
                  {code.codeValue}
                </span>
                <button
                  type="button"
                  onClick={() => void copyCode(code)}
                  className="flex size-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:text-slate-900"
                  aria-label="Copy code"
                >
                  {copiedId === code.id ? (
                    <CheckCircle2 className="size-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => void copyAll()}
              className="flex-1"
            >
              {copiedAll ? (
                <>
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="size-4" />
                  Copy all codes
                </>
              )}
            </Button>
            <Button
              type="button"
              onClick={() => setResultsOpen(false)}
              className="flex-1"
            >
              <X className="size-4" />
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
