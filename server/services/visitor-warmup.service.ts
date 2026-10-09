import "server-only";

import OpenAI from "openai";
import { z } from "zod";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Visitor warm-up — the mirror of the pre-call briefing. The briefing turns
 * a lead's qualification transcript into prep for the *professional*; this
 * turns the same transcript into a short note for the *visitor*, shown in
 * their booking confirmation email, so they arrive at the call already
 * thinking about the right things instead of cold.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type VisitorWarmUpInput = {
  visitorName: string;
  professionalName: string;
  serviceTitle: string;
  conversationHistory?: Array<{ role: string; content: string }>;
};

export type VisitorWarmUpNote = {
  /** 1–2 sentences reflecting the visitor's own stated situation back to them. */
  acknowledgement: string;
  /** Up to 3 concrete things worth preparing or bringing to the call. */
  prepPoints: string[];
};

export type VisitorWarmUp = {
  note: VisitorWarmUpNote | null;
  tokensUsed: number;
};

const NO_WARM_UP: VisitorWarmUp = { note: null, tokensUsed: 0 };

// ── OpenAI client ─────────────────────────────────────────────────────────────

const openai = env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: env.OPENAI_API_KEY })
  : null;

// ── Response schema ───────────────────────────────────────────────────────────

const warmUpResponseSchema = z.object({
  acknowledgement: z.string().max(400),
  prepPoints: z.array(z.string().max(200)).max(3),
});

// ── Prompt ────────────────────────────────────────────────────────────────────

const MAX_TRANSCRIPT_CHARS = 3000;

/**
 * Below this many characters of the visitor's own words there's nothing
 * specific to reflect back, and the model reliably ignores "return empty"
 * and writes generic filler instead. Checked in code so it can't be ignored.
 */
const MIN_VISITOR_CHARS = 80;

function visitorChars(history: Array<{ role: string; content: string }>): number {
  return history
    .filter((m) => m.role === "user")
    .reduce((total, m) => total + m.content.trim().length, 0);
}

function buildPrompt(input: VisitorWarmUpInput): string {
  const transcript = (input.conversationHistory ?? [])
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n")
    .slice(0, MAX_TRANSCRIPT_CHARS);

  return `${input.visitorName} just booked "${input.serviceTitle}" with ${input.professionalName}. Below is the short screening conversation they had before booking.

${transcript}

Write a brief note to ${input.visitorName}, shown in their booking confirmation email, that helps them arrive at the call prepared.

Return ONLY valid JSON, no markdown, no code fences:

{
  "acknowledgement": "1-2 short sentences, second person, restating their situation using the concrete details they gave (deadlines, numbers, context, what's going wrong)",
  "prepPoints": ["up to 3 short, specific things to prepare, gather, or think through before the call — each one must come directly from something they said"]
}

Rules:
- Be specific, not encouraging. Restate facts; don't praise, reassure, or comment on their feelings ("it's great that…", "you're taking a proactive step", "it sounds like you're feeling…" are all wrong).
- Every prep point must be traceable to their own words. A point that would fit any visitor booking "${input.serviceTitle}" is generic — leave it out. Fewer points is better than generic ones.
- Use only what's in the conversation. Never invent facts about them, and never make claims about ${input.professionalName}'s results, methods, pricing, or guarantees. Never promise an outcome from the call.
- Don't mention AI, screening, qualification, or the conversation itself ("you told our assistant…").
- If they gave no concrete details, return an empty acknowledgement and an empty prepPoints array.

Example of the right register (for a different visitor):
{"acknowledgement": "You're pricing your first enterprise contract, a 40-seat pilot that procurement wants signed before 30 June.", "prepPoints": ["The pilot scope and seat count you've proposed so far", "Procurement's objections to your current per-seat price"]}`;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const visitorWarmUpService = {
  async generate(input: VisitorWarmUpInput): Promise<VisitorWarmUp> {
    if (!openai) {
      logger.warn("visitorWarmUpService: OPENAI_API_KEY not set — skipping");
      return NO_WARM_UP;
    }

    if (
      !input.conversationHistory ||
      visitorChars(input.conversationHistory) < MIN_VISITOR_CHARS
    ) {
      return NO_WARM_UP;
    }

    try {
      const completion = await openai.chat.completions.create(
        {
          model: "gpt-4o-mini",
          temperature: 0.3,
          max_tokens: 400,
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: buildPrompt(input) }],
        },
        // Shorter than the briefing's 20s — this delays the confirmation
        // email itself, so give up early and send the plain version.
        { timeout: 12_000 },
      );

      const tokensUsed = completion.usage?.total_tokens ?? 0;
      const raw = completion.choices[0]?.message?.content ?? "";

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        logger.error("visitorWarmUpService: model returned non-JSON", { raw });
        return { ...NO_WARM_UP, tokensUsed };
      }

      const validated = warmUpResponseSchema.parse(parsed);
      const acknowledgement = validated.acknowledgement.trim();
      const prepPoints = validated.prepPoints
        .map((point) => point.trim())
        .filter(Boolean);

      // Nothing specific to say — the plain confirmation is better than filler.
      if (!acknowledgement && prepPoints.length === 0) {
        return { ...NO_WARM_UP, tokensUsed };
      }

      return { note: { acknowledgement, prepPoints }, tokensUsed };
    } catch (error) {
      logger.error("visitorWarmUpService: generation failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return NO_WARM_UP;
    }
  },
};
