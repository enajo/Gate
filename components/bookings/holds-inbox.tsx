"use client";

import * as React from "react";
import { CalendarClock, Check, Clock, X } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export type HoldInboxItem = {
  id: string;
  slotStart: string;
  slotEnd: string;
  expiresAt: string;
  timezone?: string | null;
  clientName?: string | null;
  clientEmail?: string | null;
  serviceTitle?: string | null;
  requiresApproval: boolean;
};

interface HoldsInboxProps {
  holds: HoldInboxItem[];
  onApprove: (holdId: string) => Promise<void>;
  onDecline: (holdId: string) => Promise<void>;
}

function formatSlot(startIso: string, endIso: string, timezone?: string | null) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const tz = timezone ?? "UTC";

  if (Number.isNaN(start.getTime())) return { date: "Invalid date", time: "" };

  const date = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(start);

  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
  });

  return {
    date,
    time: `${timeFormatter.format(start)} – ${timeFormatter.format(end)}`,
  };
}

function ExpiryCountdown({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = React.useState("");

  React.useEffect(() => {
    function tick() {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setRemaining("Expired");
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setRemaining(`${mins}m ${secs}s`);
    }

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-600">
      <Clock className="size-3" />
      {remaining}
    </span>
  );
}

export function HoldsInbox({ holds, onApprove, onDecline }: HoldsInboxProps) {
  const [actionState, setActionState] = React.useState<
    Record<string, "approving" | "declining" | null>
  >({});

  async function handleApprove(holdId: string) {
    setActionState((s) => ({ ...s, [holdId]: "approving" }));
    try {
      await onApprove(holdId);
    } finally {
      setActionState((s) => ({ ...s, [holdId]: null }));
    }
  }

  async function handleDecline(holdId: string) {
    setActionState((s) => ({ ...s, [holdId]: "declining" }));
    try {
      await onDecline(holdId);
    } finally {
      setActionState((s) => ({ ...s, [holdId]: null }));
    }
  }

  if (!holds.length) {
    return (
      <EmptyState
        title="No pending requests"
        description="When clients submit booking requests that require your approval, they'll appear here."
        icon={<CalendarClock className="size-5 text-slate-500" />}
        inset
      />
    );
  }

  return (
    <div className="space-y-3">
      {holds.map((hold) => {
        const formatted = formatSlot(hold.slotStart, hold.slotEnd, hold.timezone);
        const busy = Boolean(actionState[hold.id]);

        return (
          <div
            key={hold.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4"
          >
            {/* Left: client + slot info */}
            <div className="space-y-1">
              <p className="text-[15px] font-semibold text-slate-900">
                {hold.clientName ?? "Unknown visitor"}
              </p>
              <p className="text-sm text-slate-500">
                {hold.clientEmail}
              </p>
              <p className="text-sm text-slate-700">
                <span className="font-medium">{hold.serviceTitle}</span>
                {" · "}
                {formatted.date}
                {" · "}
                {formatted.time}
              </p>
            </div>

            {/* Right: expiry + actions */}
            <div className="flex items-center gap-3">
              <ExpiryCountdown expiresAt={hold.expiresAt} />

              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => void handleDecline(hold.id)}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                {actionState[hold.id] === "declining" ? (
                  "Declining…"
                ) : (
                  <>
                    <X className="mr-1.5 size-3.5" />
                    Decline
                  </>
                )}
              </Button>

              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={() => void handleApprove(hold.id)}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {actionState[hold.id] === "approving" ? (
                  "Approving…"
                ) : (
                  <>
                    <Check className="mr-1.5 size-3.5" />
                    Approve
                  </>
                )}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
