import "server-only";

import type { Lead } from "@prisma/client";
import OpenAI from "openai";
import { z, ZodError } from "zod";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ConversationMessage = {
  role: "assistant" | "user";
  content: string;
};

export type LabeledExample = {
  /** Short gist of the visitor's situation — a couple of their own answers, not the full transcript. */
  situationSummary: string;
  correctDecision: "QUALIFIED" | "REDIRECT" | "REJECTED";
  note?: string | null;
};

export type ConversationServiceInput = {
  professionalName: string;
  professionalTitle?: string | null;
  professionalBio?: string | null;
  services: Array<{
    id: string;
    title: string;
    displayPrice?: string | null;
    description?: string | null;
    idealPersonaDescription?: string | null;
    directPurchaseUrl?: string | null;
  }>;
  /** The service the visitor originally requested — drives the ideal persona context. */
  targetServiceId: string;
  /** Full conversation so far (assistant + user turns, oldest first). */
  history: ConversationMessage[];
  visitorName: string;
  /**
   * The professional's own past reviews of this service's leads — real
   * calibration, not a hypothetical rubric. Below a minimum sample size this
   * is omitted entirely rather than risk overfitting the gate to one or two
   * corrections.
   */
  labeledExamples?: LabeledExample[];
};

const MIN_LABELED_EXAMPLES = 3;

export type ConversationTurn =
  | { type: "question"; message: string; tokensUsed: number }
  | {
      type: "final";
      decision: "QUALIFIED" | "REDIRECT" | "REJECTED";
      redirectServiceId: string | null;
      /** Only ever true when decision === "QUALIFIED" — see nextTurn's defensive guard. */
      isStrongFit: boolean;
      message: string;
      tokensUsed: number;
    };

// ── Fallback (fail open — never block a visitor) ──────────────────────────────

const FALLBACK_TURN: ConversationTurn = {
  type: "final",
  decision: "QUALIFIED",
  redirectServiceId: null,
  // Fail-open, not a real judgment — must never grant slot priority.
  isStrongFit: false,
  message: "Sounds like a great fit — let me pull up some available times.",
  tokensUsed: 0,
};

// ── OpenAI client ─────────────────────────────────────────────────────────────

const openai = env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: env.OPENAI_API_KEY })
  : null;

// ── Response schema ───────────────────────────────────────────────────────────

const aiResponseSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("question"),
    message: z.string().min(1).max(800),
  }),
  z.object({
    type: z.literal("final"),
    decision: z.enum(["QUALIFIED", "REDIRECT", "REJECTED"]),
    redirectServiceId: z.string().nullable(),
    isStrongFit: z.boolean().optional(),
    message: z.string().min(1).max(800),
  }),
]);

// ── System prompt ─────────────────────────────────────────────────────────────

function buildSystemPrompt(input: ConversationServiceInput): string {
  const {
    professionalName,
    professionalTitle,
    professionalBio,
    services,
    targetServiceId,
    labeledExamples,
  } = input;

  const targetService = services.find((s) => s.id === targetServiceId);
  const coreServices = services.filter((s) => !s.directPurchaseUrl);
  const altServices = services.filter((s) => !!s.directPurchaseUrl);

  const formatService = (s: ConversationServiceInput["services"][number]) => {
    const price = s.displayPrice ? ` — ${s.displayPrice}` : "";
    const desc = s.description ? `\n     ${s.description}` : "";
    const url = s.directPurchaseUrl ? `\n     Buy link: ${s.directPurchaseUrl}` : "";
    return `  • [id: ${s.id}] ${s.title}${price}${desc}${url}`;
  };

  const coreBlock =
    coreServices.length > 0
      ? `PRIMARY SERVICES (calendar booking required):\n${coreServices.map(formatService).join("\n")}`
      : "PRIMARY SERVICES: (none configured)";

  const altBlock =
    altServices.length > 0
      ? `\nALTERNATIVE OFFERS (direct purchase, no call needed):\n${altServices.map(formatService).join("\n")}`
      : "";

  const personaBlock = targetService?.idealPersonaDescription
    ? `IDEAL CLIENT FOR THIS SERVICE\n────────────────────────────────────────────────\n${targetService.idealPersonaDescription.trim()}`
    : "IDEAL CLIENT: (none specified — if the visitor's situation is clearly unrelated to the service description, REJECT; otherwise QUALIFY)";

  const bioLine = professionalBio ? `\nBIO: ${professionalBio.trim()}\n` : "";

  const calibrationBlock =
    labeledExamples && labeledExamples.length >= MIN_LABELED_EXAMPLES
      ? `\nRECENT CALIBRATION (this expert's own review of past calls for this service — weight these heavily, they're real corrections, not a hypothetical)\n────────────────────────────────────────────────\n${labeledExamples
          .map((ex, i) => {
            const noteSuffix = ex.note ? ` (note: "${ex.note.trim()}")` : "";
            return `${i + 1}. "${ex.situationSummary.trim()}" → correct call: ${ex.correctDecision}${noteSuffix}`;
          })
          .join("\n")}\n────────────────────────────────────────────────\n`
      : "";

  return `You are a screening assistant for ${professionalName}${professionalTitle ? `, ${professionalTitle}` : ""}.${bioLine}

Your job is to run a short qualification conversation and return a strict PASS/FAIL decision for ${professionalName}'s calendar.

────────────────────────────────────────────────
${coreBlock}${altBlock}

────────────────────────────────────────────────
${personaBlock}
────────────────────────────────────────────────
${calibrationBlock}
HOW TO RUN THE CONVERSATION
1. On the very first turn, warmly greet the visitor by name, briefly and
   naturally let them know they're talking with an AI assistant screening on
   ${professionalName}'s behalf (one short clause is enough — this is a legal
   disclosure requirement, not optional), then ask one open question about
   their situation.
2. Ask ONE question per turn. If an answer is vague, ask ONE targeted follow-up.
3. Reach a final decision within 2–4 exchanges.
4. If a question turn's answer clearly matches the ideal client profile
   with a strong positive signal, you may briefly affirm that before your
   next question (e.g. "That's exactly the kind of situation I help with —
   quick follow-up: ...") rather than staying neutral until the final
   decision. Only do this when the signal is genuinely clear, and never let
   it contradict whatever the eventual decision turns out to be.

DECISION RULES — pick exactly one:
• QUALIFIED  — visitor clearly fits the ideal client profile. Only use this when you have POSITIVE signal.
• REDIRECT   — doesn't fit the primary service but clearly fits an alternative offer; set redirectServiceId to that service's id string.
• REJECTED   — visitor does not fit. Use this whenever you have NEGATIVE signal OR are genuinely unsure.

CRITICAL: The "decision" field and the "message" field must ALWAYS agree.
• If decision is QUALIFIED, the message must sound welcoming and positive — never mention "not a fit", "mismatch", or any hedge.
• If decision is REJECTED, the message must be a polite, firm close — never offer hope or suggest a future call.
• NEVER output a QUALIFIED decision with a message that sounds like rejection. NEVER output a REJECTED decision with a message that sounds welcoming.

STRONG-FIT FLAG (only when decision is QUALIFIED)
Set "isStrongFit": true only when the visitor doesn't just clear the bar in
IDEAL CLIENT FOR THIS SERVICE above but is a standout match against it —
multiple strong positive signals, no hedging answers, exactly the profile
described. If it's a closer call, set false. When genuinely unsure, set
false — this flag only ever grants extra access, never use it to soften a
rejection. Omit it entirely (or set false) for REDIRECT/REJECTED.

OUTPUT FORMAT — return ONLY valid JSON, no markdown, no code fences:

While gathering information:
{ "type": "question", "message": "..." }

When ready to decide:
{ "type": "final", "decision": "QUALIFIED" | "REDIRECT" | "REJECTED", "redirectServiceId": null | "<service-id>", "isStrongFit": true | false, "message": "..." }

MESSAGE GUIDELINES
• Write as a warm, confident human assistant — never robotic
• question turns: one natural question only, no preamble
• QUALIFIED: 1–2 sentences, enthusiastic welcoming close ("Great — let me pull up some times.")
• REDIRECT: 2–3 sentences — acknowledge the mismatch, name the alternative, clear next step
• REJECTED: 2 sentences max — polite and final; no apology, no "maybe later"; do NOT ask for their email (the UI handles that)
• Avoid robotic/technical phrasing like "algorithm", "routing", or internal
  process names — but you've already disclosed you're an AI on turn one, and
  if asked directly whether you're a bot or AI at any point, confirm it
  honestly and warmly rather than deflecting
• Never ask more than one question in a single turn`;
}

// ── Calibration examples ──────────────────────────────────────────────────────

/**
 * A short gist of the visitor's own answers from a past lead's stored
 * transcript — not the full conversation, to keep the prompt (and token
 * cost) bounded. Defensive about shape: `answersJson` varies depending on
 * which path created the Lead (normal AI turn vs. the token-exhausted
 * fail-open path), and is untyped JSON at the DB layer either way.
 */
function summarizeAnswers(answersJson: unknown): string | null {
  if (!answersJson || typeof answersJson !== "object") return null;

  const record = answersJson as Record<string, unknown>;
  const conversationHistory = Array.isArray(record.conversationHistory)
    ? record.conversationHistory
    : Array.isArray(record.history)
      ? record.history
      : null;

  if (!conversationHistory) return null;

  const userAnswers = conversationHistory
    .filter(
      (m): m is { role: string; content: string } =>
        !!m &&
        typeof m === "object" &&
        (m as { role?: unknown }).role === "user" &&
        typeof (m as { content?: unknown }).content === "string",
    )
    .map((m) => m.content.trim())
    .filter(Boolean);

  if (userAnswers.length === 0) return null;

  return userAnswers.slice(-2).join(" — ");
}

// ── Service ───────────────────────────────────────────────────────────────────

export const aiConversationService = {
  /**
   * Turns a service's professional-reviewed leads (see
   * bookingRepository.findRecentLabeledLeadsForService) into calibration
   * examples for the qualification prompt. Whether the professional agreed
   * with or overrode the AI's original call doesn't matter here — either
   * way `correctedResult` is the ground-truth label for that situation.
   */
  buildLabeledExamples(leads: Lead[]): LabeledExample[] {
    return leads.flatMap((lead) => {
      if (!lead.correctedResult || lead.correctedResult === "PENDING_REVIEW") {
        return [];
      }

      const situationSummary = summarizeAnswers(lead.answersJson);
      if (!situationSummary) return [];

      return [
        {
          situationSummary,
          correctDecision:
            lead.correctedResult === "REDIRECTED" ? "REDIRECT" : lead.correctedResult,
          note: lead.correctionNote,
        },
      ];
    });
  },

  async nextTurn(input: ConversationServiceInput): Promise<ConversationTurn> {
    if (!openai) {
      logger.warn("aiConversationService: OPENAI_API_KEY not set — auto-qualifying");
      return FALLBACK_TURN;
    }

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: buildSystemPrompt(input) },
      ...input.history.map((m) => ({
        role: m.role as "assistant" | "user",
        content: m.content,
      })),
    ];

    try {
      const completion = await openai.chat.completions.create(
        {
          model: "gpt-4o-mini",
          temperature: 0.4,
          max_tokens: 300,
          response_format: { type: "json_object" },
          messages,
        },
        { timeout: 10_000 },
      );

      const tokensUsed = completion.usage?.total_tokens ?? 0;
      const raw = completion.choices[0]?.message?.content ?? "";

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        logger.error("aiConversationService: model returned non-JSON", { raw });
        return FALLBACK_TURN;
      }

      const validated = aiResponseSchema.parse(parsed);

      logger.info("aiConversationService: AI response", {
        type: validated.type,
        decision: validated.type === "final" ? validated.decision : undefined,
        message: validated.message,
        tokensUsed,
      });

      if (validated.type === "question") {
        return { type: "question", message: validated.message, tokensUsed };
      }

      // Sanity-check: REDIRECT must reference a known service
      if (validated.decision === "REDIRECT") {
        const knownIds = input.services.map((s) => s.id);
        if (
          !validated.redirectServiceId ||
          !knownIds.includes(validated.redirectServiceId)
        ) {
          logger.warn(
            "aiConversationService: REDIRECT pointed to unknown serviceId — downgrading to REJECTED",
            { redirectServiceId: validated.redirectServiceId },
          );
          return {
            type: "final",
            decision: "REJECTED",
            redirectServiceId: null,
            isStrongFit: false,
            message: validated.message,
            tokensUsed,
          };
        }
      }

      return {
        type: "final",
        decision: validated.decision,
        redirectServiceId:
          validated.type === "final" ? validated.redirectServiceId : null,
        // Defensive: strength only ever modifies a real QUALIFIED decision,
        // never trust it on any other outcome even if the model is confused.
        isStrongFit:
          validated.decision === "QUALIFIED"
            ? (validated.isStrongFit ?? false)
            : false,
        message: validated.message,
        tokensUsed,
      };
    } catch (error) {
      if (error instanceof ZodError) {
        logger.error("aiConversationService: unexpected model response shape", {
          issues: error.flatten(),
        });
      } else {
        logger.error("aiConversationService: OpenAI call failed — auto-qualifying", {
          error: error instanceof Error ? error.message : String(error),
        });
      }

      return FALLBACK_TURN;
    }
  },
};
