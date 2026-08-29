"use client";

import * as React from "react";
import { AlertCircle, MessageCircleMore, Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type BriefingState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      summary: string;
      keyPoints: string[];
      suggestedOpening: string;
    };

type BriefingResponse = {
  briefing?: {
    summary: string;
    keyPoints: string[];
    suggestedOpening: string;
  };
  error?: string;
};

/** Fetches (and, on first view, generates) the AI pre-call summary for a lead's qualification transcript. */
export function PreCallBriefingCard({ leadId }: { leadId: string }) {
  const [state, setState] = React.useState<BriefingState>({ status: "loading" });

  React.useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    fetch(`/api/app/leads/${leadId}/briefing`, { method: "POST" })
      .then(async (res) => {
        const data = (await res.json()) as BriefingResponse;
        if (cancelled) return;

        if (!res.ok || !data.briefing) {
          setState({ status: "error", message: data.error ?? "Couldn't load briefing." });
          return;
        }

        setState({ status: "ready", ...data.briefing });
      })
      .catch(() => {
        if (!cancelled) {
          setState({ status: "error", message: "Couldn't load briefing." });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [leadId]);

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-amber-500" />
          <CardTitle>Pre-call briefing</CardTitle>
        </div>
      </CardHeader>

      <CardContent>
        {state.status === "loading" && (
          <p className="text-sm text-slate-400">Reading the conversation…</p>
        )}

        {state.status === "error" && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <AlertCircle className="size-4" />
            {state.message}
          </div>
        )}

        {state.status === "ready" && !state.summary && (
          <p className="text-sm text-slate-400 italic">
            No conversation recorded for this lead — nothing to summarize.
          </p>
        )}

        {state.status === "ready" && state.summary && (
          <div className="space-y-4">
            <p className="text-sm leading-6 text-slate-700">{state.summary}</p>

            {state.keyPoints.length > 0 && (
              <ul className="space-y-1.5">
                {state.keyPoints.map((point, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-600">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-slate-400" />
                    {point}
                  </li>
                ))}
              </ul>
            )}

            {state.suggestedOpening && (
              <div className="flex gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <MessageCircleMore className="mt-0.5 size-4 shrink-0 text-slate-400" />
                <p className="text-sm italic text-slate-600">
                  &ldquo;{state.suggestedOpening}&rdquo;
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
