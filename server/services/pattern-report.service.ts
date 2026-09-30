import "server-only";

import OpenAI from "openai";
import { z } from "zod";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getLeadSourceLabel } from "@/lib/lead-source";

// ── Types ─────────────────────────────────────────────────────────────────────

export type PatternReportLeadInput = {
  qualificationResult: string;
  correctedResult?: string | null;
  conversationHistory?: Array<{ role: string; content: string }>;
  referrer?: string | null;
  utmSource?: string | null;
};

export type ChannelBreakdown = {
  channel: string;
  leadCount: number;
  qualifiedCount: number;
  qualifiedRate: number;
};

export type PatternReport = {
  topRejectionReasons: string[];
  commonObjections: string[];
  suggestion: string;
  channelBreakdown: ChannelBreakdown[];
  tokensUsed: number;
};

const EMPTY_REPORT: PatternReport = {
  topRejectionReasons: [],
  commonObjections: [],
  suggestion: "",
  channelBreakdown: [],
  tokensUsed: 0,
};

// ── Channel breakdown (deterministic — no AI call, no token cost) ─────────────

// A channel with only one or two leads in a week is too small a sample for
// its qualified rate to mean anything — still counted, just sorted below
// channels with real volume rather than let a lucky single lead read as
// "this channel is 100% qualified."
const MIN_LEADS_FOR_RELIABLE_RATE = 3;

/**
 * Which channel sends people this professional's AI actually qualifies —
 * not just which channel sends the most traffic. Reuses the same
 * corrected-result-takes-precedence rule as buildPrompt() below: a
 * professional's own correction is closer to ground truth than the AI's
 * original call.
 */
export function buildChannelBreakdown(
  leads: PatternReportLeadInput[],
): ChannelBreakdown[] {
  const byChannel = new Map<string, { leadCount: number; qualifiedCount: number }>();

  for (const lead of leads) {
    const channel = getLeadSourceLabel(lead);
    const effectiveResult = lead.correctedResult ?? lead.qualificationResult;

    const stats = byChannel.get(channel) ?? { leadCount: 0, qualifiedCount: 0 };
    stats.leadCount += 1;
    if (effectiveResult === "QUALIFIED") stats.qualifiedCount += 1;
    byChannel.set(channel, stats);
  }

  return Array.from(byChannel.entries())
    .map(([channel, stats]) => ({
      channel,
      leadCount: stats.leadCount,
      qualifiedCount: stats.qualifiedCount,
      qualifiedRate: stats.qualifiedCount / stats.leadCount,
    }))
    .sort((a, b) => {
      const aReliable = a.leadCount >= MIN_LEADS_FOR_RELIABLE_RATE;
      const bReliable = b.leadCount >= MIN_LEADS_FOR_RELIABLE_RATE;
      if (aReliable !== bReliable) return aReliable ? -1 : 1;
      return b.leadCount - a.leadCount;
    });
}

// ── OpenAI client ─────────────────────────────────────────────────────────────

const openai = env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: env.OPENAI_API_KEY })
  : null;

// ── Response schema ───────────────────────────────────────────────────────────

const reportResponseSchema = z.object({
  topRejectionReasons: z.array(z.string()).max(5),
  commonObjections: z.array(z.string()).max(5),
  suggestion: z.string(),
});

// ── Prompt ────────────────────────────────────────────────────────────────────

// Cap how many transcripts get included — keeps the prompt bounded even for
// a busy professional's week, and older leads are less relevant anyway.
const MAX_LEADS_PER_REPORT = 25;
const MAX_TRANSCRIPT_CHARS = 1500;

function buildPrompt(
  professionalName: string,
  leads: PatternReportLeadInput[],
): string {
  const entries = leads
    .slice(0, MAX_LEADS_PER_REPORT)
    .map((lead, i) => {
      const decision = lead.correctedResult ?? lead.qualificationResult;
      const transcript = (lead.conversationHistory ?? [])
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n")
        .slice(0, MAX_TRANSCRIPT_CHARS);

      return `--- Lead ${i + 1} (decision: ${decision}) ---\n${transcript || "(no conversation recorded)"}`;
    })
    .join("\n\n");

  return `You're analysing a week of AI-screened leads for ${professionalName}.

${entries}

Identify patterns worth telling ${professionalName} about. Return ONLY valid JSON, no markdown, no code fences:

{
  "topRejectionReasons": ["...", up to 3 short bullet points — patterns among REJECTED/REDIRECTED leads only],
  "commonObjections": ["...", up to 3 short bullet points — hesitations or misunderstandings that came up, including among QUALIFIED leads],
  "suggestion": "one short paragraph — a concrete way ${professionalName} might refine how they describe their ideal client or service, based on these patterns. Empty string if nothing is clear enough to suggest."
}

Only report a pattern if it genuinely repeats across multiple leads. If there's too little data or nothing repeats, return empty arrays and an empty suggestion — never invent a pattern that isn't there.`;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const patternReportService = {
  async generate(
    professionalName: string,
    leads: PatternReportLeadInput[],
  ): Promise<PatternReport> {
    // Deterministic and free — computed regardless of whether the AI
    // narrative below runs at all, so a missing/exhausted OpenAI key never
    // blocks this part of the report.
    const channelBreakdown = buildChannelBreakdown(leads);

    if (!openai) {
      logger.warn("patternReportService: OPENAI_API_KEY not set — skipping");
      return { ...EMPTY_REPORT, channelBreakdown };
    }

    if (leads.length === 0) return EMPTY_REPORT;

    try {
      const completion = await openai.chat.completions.create(
        {
          model: "gpt-4o-mini",
          temperature: 0.3,
          max_tokens: 600,
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: buildPrompt(professionalName, leads) }],
        },
        { timeout: 20_000 },
      );

      const tokensUsed = completion.usage?.total_tokens ?? 0;
      const raw = completion.choices[0]?.message?.content ?? "";

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        logger.error("patternReportService: model returned non-JSON", { raw });
        return { ...EMPTY_REPORT, channelBreakdown, tokensUsed };
      }

      const validated = reportResponseSchema.parse(parsed);
      return { ...validated, channelBreakdown, tokensUsed };
    } catch (error) {
      logger.error("patternReportService: generation failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return { ...EMPTY_REPORT, channelBreakdown };
    }
  },
};
