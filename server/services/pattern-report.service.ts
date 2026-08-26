import "server-only";

import OpenAI from "openai";
import { z } from "zod";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

// ── Types ─────────────────────────────────────────────────────────────────────

export type PatternReportLeadInput = {
  qualificationResult: string;
  correctedResult?: string | null;
  conversationHistory?: Array<{ role: string; content: string }>;
};

export type PatternReport = {
  topRejectionReasons: string[];
  commonObjections: string[];
  suggestion: string;
  tokensUsed: number;
};

const EMPTY_REPORT: PatternReport = {
  topRejectionReasons: [],
  commonObjections: [],
  suggestion: "",
  tokensUsed: 0,
};

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
    if (!openai) {
      logger.warn("patternReportService: OPENAI_API_KEY not set — skipping");
      return EMPTY_REPORT;
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
        return { ...EMPTY_REPORT, tokensUsed };
      }

      const validated = reportResponseSchema.parse(parsed);
      return { ...validated, tokensUsed };
    } catch (error) {
      logger.error("patternReportService: generation failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return EMPTY_REPORT;
    }
  },
};
