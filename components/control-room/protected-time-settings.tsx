"use client";

import { useCallback, useEffect, useState } from "react";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { Loader2, ShieldCheck, Trash2 } from "lucide-react";

/**
 * Shadow calendaring, protective-only: a professional claims a block of
 * time for a stated goal and Gate simply never offers it as bookable.
 * Backed by the existing BlockedDate model, which slot generation already
 * treats as busy. It deliberately doesn't touch anything already on their
 * calendar — no auto-declining, no rescheduling.
 */

type BlockedDate = {
  id: string;
  startDateTime: string;
  endDateTime: string;
  reason?: string | null;
};

function today(timezone: string): string {
  return formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
}

function formatBlock(block: BlockedDate, timezone: string): string {
  const start = new Date(block.startDateTime);
  const end = new Date(block.endDateTime);
  const sameDay =
    formatInTimeZone(start, timezone, "yyyy-MM-dd") ===
    formatInTimeZone(end, timezone, "yyyy-MM-dd");

  return sameDay
    ? `${formatInTimeZone(start, timezone, "EEE, MMM d · HH:mm")}–${formatInTimeZone(end, timezone, "HH:mm")}`
    : `${formatInTimeZone(start, timezone, "EEE, MMM d HH:mm")} → ${formatInTimeZone(end, timezone, "EEE, MMM d HH:mm")}`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[12px] font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}

export function ProtectedTimeSettings({ timezone }: { timezone: string }) {
  const [blocks, setBlocks] = useState<BlockedDate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [goal, setGoal] = useState("");
  const [startDate, setStartDate] = useState(() => today(timezone));
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState(() => today(timezone));
  const [endTime, setEndTime] = useState("12:00");

  const loadBlocks = useCallback(async () => {
    try {
      const res = await fetch("/api/app/availability/blocked-dates");
      if (!res.ok) throw new Error("Failed to load protected time.");
      const data = (await res.json()) as { blockedDates: BlockedDate[] };
      const now = Date.now();
      setBlocks(
        data.blockedDates
          .filter((block) => new Date(block.endDateTime).getTime() > now)
          .sort(
            (a, b) =>
              new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime(),
          ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBlocks([]);
    }
  }, []);

  useEffect(() => {
    void loadBlocks();
  }, [loadBlocks]);

  async function addBlock(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    // Wall-clock times in the professional's profile timezone, not the
    // browser's — the same timezone the weekly schedule uses.
    const start = fromZonedTime(`${startDate}T${startTime}:00`, timezone);
    const end = fromZonedTime(`${endDate}T${endTime}:00`, timezone);

    if (!(end.getTime() > start.getTime())) {
      setError("The end has to be after the start.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/app/availability/blocked-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDateTime: start.toISOString(),
          endDateTime: end.toISOString(),
          reason: goal.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const payload = (await res.json()) as { error?: string };
        throw new Error(payload.error ?? "Failed to protect this time.");
      }
      setGoal("");
      await loadBlocks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to protect this time.");
    } finally {
      setIsSaving(false);
    }
  }

  async function removeBlock(id: string) {
    setError(null);
    setDeletingId(id);
    try {
      const res = await fetch(`/api/app/availability/blocked-dates/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove this block.");
      setBlocks((current) => current?.filter((block) => block.id !== id) ?? current);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove this block.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section id="protected-time" className="card-section scroll-mt-20">
      <div className="flex items-center gap-3">
        <ShieldCheck className="size-5 text-brand-amber" />
        <div>
          <p className="text-[15px] font-medium text-ink">Protected time</p>
          <p className="mt-1 text-[12px] text-gray-500">
            Claim time for your own work. Gate won&apos;t offer it to anyone,
            even inside your weekly hours. Nothing already on your calendar is
            changed.
          </p>
        </div>
      </div>

      <form onSubmit={addBlock} className="mt-5 max-w-xl space-y-4">
        <Field label="What it's for (optional)">
          <input
            className="field-input"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            maxLength={500}
            placeholder="e.g. Deep work: Q4 strategy"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="From">
            <div className="flex gap-2">
              <input
                type="date"
                className="field-input flex-1"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (e.target.value > endDate) setEndDate(e.target.value);
                }}
                required
              />
              <input
                type="time"
                className="field-input w-28"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
          </Field>
          <Field label="Until">
            <div className="flex gap-2">
              <input
                type="date"
                className="field-input flex-1"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
              <input
                type="time"
                className="field-input w-28"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </Field>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-brand-amber bg-brand-amber px-5 text-[13px] font-medium text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
          Protect this time
        </button>
      </form>

      {error ? <p className="mt-4 text-[13px] text-red-500">{error}</p> : null}

      <div className="mt-6 max-w-xl">
        {blocks === null ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="size-5 animate-spin text-brand-amber" />
          </div>
        ) : blocks.length === 0 ? (
          <p className="text-[12px] text-gray-400">No protected time coming up.</p>
        ) : (
          <ul className="space-y-2">
            {blocks.map((block) => (
              <li
                key={block.id}
                className="flex items-center gap-3 rounded-lg border border-warm-border-mid bg-white/70 px-4 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-ink">
                    {block.reason || "Protected time"}
                  </p>
                  <p className="text-[12px] text-gray-500">{formatBlock(block, timezone)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void removeBlock(block.id)}
                  disabled={deletingId === block.id}
                  aria-label={`Remove ${block.reason || "protected time"}`}
                  className="text-gray-400 transition hover:text-red-500 disabled:opacity-60"
                >
                  {deletingId === block.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-5 text-[12px] text-gray-500">
        Times are in your profile&apos;s timezone ({timezone}).
      </p>
    </section>
  );
}
