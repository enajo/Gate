"use client";

import * as React from "react";
import { ArrowRight, CalendarDays, CheckCircle2, Loader2, RefreshCw } from "lucide-react";

import { GoogleConnectButton } from "@/components/calendars/google-connect-button";
import { SyncStatusBadge } from "@/components/calendars/sync-status-badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type CalendarRow = {
  id: string;
  calendarName?: string | null;
  providerEmail?: string | null;
  calendarTimeZone?: string | null;
  syncStatus: "PENDING" | "CONNECTED" | "SYNCING" | "ERROR" | "EXPIRED" | "DISCONNECTED";
  isActive: boolean;
  useForConflictCheck: boolean;
  isDefaultEventCalendar: boolean;
  lastSyncedAt?: string | null;
};

// ── Calendar list inside the modal ───────────────────────────────────────────

function CalendarList({
  calendars,
  onToggleConflictCheck,
  onSetDefault,
}: {
  calendars: CalendarRow[];
  onToggleConflictCheck: (cal: CalendarRow) => void;
  onSetDefault: (cal: CalendarRow) => void;
}) {
  if (!calendars.length) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <CalendarDays className="mb-3 size-8 text-[#D8D0C6]" />
        <p className="text-[14px] font-medium text-[#2B2B2B]">No calendars connected</p>
        <p className="mt-1 max-w-xs text-[13px] text-[#6B7280]">
          Connect your Google Calendar to sync availability and create booking events automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {calendars.map((cal) => (
        <div
          key={cal.id}
          className="rounded-[1.25rem] border border-[#E7E5E4] bg-white p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[14px] font-medium text-[#2B2B2B]">
                {cal.calendarName ?? "Unnamed calendar"}
              </p>
              <p className="mt-0.5 text-[12px] text-[#6B7280]">
                {cal.providerEmail ?? ""}
              </p>
              <div className="mt-1.5">
                <SyncStatusBadge status={cal.syncStatus} />
              </div>
            </div>

            {cal.isDefaultEventCalendar && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                <CheckCircle2 className="size-3" />
                Default
              </span>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant={cal.useForConflictCheck ? "default" : "outline"}
              size="sm"
              onClick={() => onToggleConflictCheck(cal)}
            >
              {cal.useForConflictCheck ? "Conflict check on" : "Conflict check off"}
            </Button>

            {!cal.isDefaultEventCalendar && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onSetDefault(cal)}
              >
                Set as default
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Modal content ─────────────────────────────────────────────────────────────

function CalendarModalContent() {
  const [calendars, setCalendars] = React.useState<CalendarRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [patching, setPatching] = React.useState<string | null>(null);

  const loadCalendars = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/app/google/calendars", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to load calendars.");
      setCalendars((data as { calendars?: CalendarRow[] }).calendars ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load calendars.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadCalendars();
  }, [loadCalendars]);

  async function patch(cal: CalendarRow, payload: Record<string, unknown>) {
    setPatching(cal.id);
    try {
      const res = await fetch(`/api/app/google/calendars/${cal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Update failed.");
      await loadCalendars();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setPatching(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header actions */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-[#6B7280]">
          {loading
            ? "Loading…"
            : calendars.length === 0
              ? "No calendars connected yet."
              : `${calendars.length} calendar${calendars.length !== 1 ? "s" : ""} connected`}
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadCalendars()}
            disabled={loading}
            className="flex size-8 items-center justify-center rounded-full border border-[#D8D0C6] text-[#6B7280] transition hover:border-[#2B2B2B] disabled:opacity-40"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>

          <GoogleConnectButton
            returnTo="/app/oauth/close"
            onSuccess={() => void loadCalendars()}
            onError={(msg) => setError(msg)}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-[0.875rem] border border-red-100 bg-red-50 px-4 py-3 text-[12px] text-red-700">
          {error}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="size-5 animate-spin text-[#9CA3AF]" />
        </div>
      ) : (
        <CalendarList
          calendars={calendars}
          onToggleConflictCheck={(cal) =>
            void patch(cal, { useForConflictCheck: !cal.useForConflictCheck })
          }
          onSetDefault={(cal) => void patch(cal, { isDefaultEventCalendar: true })}
        />
      )}

      {/* Helper text */}
      {!loading && calendars.length > 0 && (
        <p className="text-[11px] leading-5 text-[#9CA3AF]">
          <strong className="text-[#6B7280]">Conflict check</strong> — blocks slots when this
          calendar has an event. &nbsp;
          <strong className="text-[#6B7280]">Default</strong> — where new booking events are
          created.
        </p>
      )}
    </div>
  );
}

// ── Action card + modal ───────────────────────────────────────────────────────

interface CalendarModalCardProps {
  pendingHoldsCount?: number;
}

export function CalendarModalCard({ pendingHoldsCount }: CalendarModalCardProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      {/* Card — matches the style of the other action cards exactly */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative w-full overflow-hidden rounded-[2rem] border border-[#E4DED4]/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.62),rgba(243,237,226,0.84))] p-7 text-left shadow-[0_18px_50px_rgba(120,100,80,0.08)] transition duration-500 ease-out hover:-translate-y-1"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/60 blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-[#2B2B2B] text-white">
              <CalendarDays className="size-5" />
            </div>
            {pendingHoldsCount != null && pendingHoldsCount > 0 && (
              <span className="flex size-6 items-center justify-center rounded-full bg-amber-500 text-[11px] font-bold text-white">
                {pendingHoldsCount}
              </span>
            )}
          </div>

          <h2 className="mt-6 text-[25px] font-semibold tracking-[-0.04em]">
            Calendar
          </h2>

          <p className="mt-3 text-[14px] leading-[1.7] text-[#6B7280]">
            Connect Google Calendar for conflict checking and event creation.
          </p>

          <div className="mt-7 inline-flex items-center text-[14px] text-[#475569]">
            Manage
            <ArrowRight className="ml-2 size-4 transition group-hover:translate-x-1" />
          </div>
        </div>
      </button>

      {/* Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="size-4 text-[#DFA767]" />
              Calendar
            </DialogTitle>
            <DialogDescription>
              Connect Google Calendar, toggle conflict checking, and set your default booking calendar.
            </DialogDescription>
          </DialogHeader>

          <CalendarModalContent />
        </DialogContent>
      </Dialog>
    </>
  );
}
