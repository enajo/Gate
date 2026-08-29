import "server-only";

import OpenAI from "openai";
import { z } from "zod";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

// ── Types ─────────────────────────────────────────────────────────────────────

export type PreCallBriefingInput = {
  clientName: string;
  serviceName: string;
  conversationHistory?: Array<{ role: string; content: string }>;
};

export type PreCallBriefing = {
  summary: string;
  keyPoints: string[];
  suggestedOpening: string;
  tokensUsed: number;
};

const EMPTY_BRIEFING: PreCallBriefing = {
  summary: "",
  keyPoints: [],
  suggestedOpening: "",
  tokensUsed: 0,
};

// ── OpenAI client ─────────────────────────────────────────────────────────────

const openai = env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: env.OPENAI_API_KEY })
  : null;

// ── Response schema ───────────────────────────────────────────────────────────

const briefingResponseSchema = z.object({
  summary: z.string(),
  keyPoints: z.array(z.string()).max(5),
  suggestedOpening: z.string(),
});

// ── Prompt ────────────────────────────────────────────────────────────────────

const MAX_TRANSCRIPT_CHARS = 3000;

function buildPrompt(input: PreCallBriefingInput): string {
  const transcript = (input.conversationHistory ?? [])
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n")
    .slice(0, MAX_TRANSCRIPT_CHARS);

  return `You're preparing a professional for an upcoming call with ${input.clientName}, booked for "${input.serviceName}". Below is the qualification conversation the client had with an AI screener before booking.

${transcript}

Return ONLY valid JSON, no markdown, no code fences:

{
  "summary": "2-3 sentences — who they are and what they actually need, in plain language",
  "keyPoints": ["...", up to 4 short bullets — specific facts, numbers, constraints, or deadlines the client mentioned that are worth remembering. Omit anything generic.],
  "suggestedOpening": "one natural sentence to open the call with, referencing something specific from the conversation — not a generic greeting"
}

Base this only on what's actually in the conversation. If it's too thin to say anything specific, return short generic-but-honest values rather than inventing detail.`;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const preCallBriefingService = {
  async generate(input: PreCallBriefingInput): Promise<PreCallBriefing> {
    if (!openai) {
      logger.warn("preCallBriefingService: OPENAI_API_KEY not set — skipping");
      return EMPTY_BRIEFING;
    }

    if (!input.conversationHistory || input.conversationHistory.length === 0) {
      return EMPTY_BRIEFING;
    }

    try {
      const completion = await openai.chat.completions.create(
        {
          model: "gpt-4o-mini",
          temperature: 0.3,
          max_tokens: 500,
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: buildPrompt(input) }],
        },
        { timeout: 20_000 },
      );

      const tokensUsed = completion.usage?.total_tokens ?? 0;
      const raw = completion.choices[0]?.message?.content ?? "";

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        logger.error("preCallBriefingService: model returned non-JSON", { raw });
        return { ...EMPTY_BRIEFING, tokensUsed };
      }

      const validated = briefingResponseSchema.parse(parsed);
      return { ...validated, tokensUsed };
    } catch (error) {
      logger.error("preCallBriefingService: generation failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return EMPTY_BRIEFING;
    }
  },
};
