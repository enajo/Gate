import "server-only";

import type { Lead, QualificationMode } from "@prisma/client";
import OpenAI from "openai";
import { z } from "zod";

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
  correctDecision: "QUALIFIED" | "REJECTED";
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
      decision: "QUALIFIED" | "REJECTED";
      /** Only ever true when decision === "QUALIFIED" — see nextTurn's defensive guard. */
      isStrongFit: boolean;
      message: string;
      tokensUsed: number;
      /** Set only on FALLBACK_TURN — the AI never actually judged this visitor. */
      failedOpen?: boolean;
    };

// ── Fallback (fail open — never block a visitor) ──────────────────────────────

const FALLBACK_TURN: ConversationTurn = {
  type: "final",
  decision: "QUALIFIED",
  // Fail-open, not a real judgment — must never grant slot priority.
  isStrongFit: false,
  message: "Sounds like a great fit — let me pull up some available times.",
  tokensUsed: 0,
  failedOpen: true,
};

/**
 * Triage never turns anyone away — every visitor goes on to the calendar —
 * so a not-a-fit visitor must never read the AI's "not right now" close
 * right before slots open. The real message is still stored on the Lead.
 */
const TRIAGE_HANDOFF_MESSAGE = "Thanks for sharing all that — let me pull up some available times.";

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
    // REDIRECT is paused — the gate decides fit or not only — but still
    // accepted here and downgraded to REJECTED in nextTurn. Rejecting it at
    // the schema would fail open and auto-qualify a visitor the model
    // judged not a fit.
    decision: z.enum(["QUALIFIED", "REDIRECT", "REJECTED"]),
    // Ignored, and often omitted by the model — requiring it once threw
    // away real decisions and failed open.
    redirectServiceId: z.string().nullish(),
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
  // Direct-purchase offers aren't shown to the gate while REDIRECT is
  // paused — listed, the model recommends them in rejection messages.
  const coreServices = services.filter((s) => !s.directPurchaseUrl);

  const formatService = (s: ConversationServiceInput["services"][number]) => {
    const price = s.displayPrice ? ` — ${s.displayPrice}` : "";
    const desc = s.description ? `\n     ${s.description}` : "";
    return `  • [id: ${s.id}] ${s.title}${price}${desc}`;
  };

  const coreBlock =
    coreServices.length > 0
      ? `PRIMARY SERVICES (calendar booking required):\n${coreServices.map(formatService).join("\n")}`
      : "PRIMARY SERVICES: (none configured)";

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
${coreBlock}

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
• REJECTED   — visitor does not fit (or not yet). Use this whenever you have NEGATIVE signal OR are genuinely unsure.

CRITICAL: The "decision" field and the "message" field must ALWAYS agree.
• If decision is QUALIFIED, the message must sound welcoming and positive — never mention "not a fit", "mismatch", or any hedge.
• If decision is REJECTED, the message must be a kind, clear close — never suggest booking a call now or imply they qualified.
• NEVER output a QUALIFIED decision with a message that sounds like rejection. NEVER output a REJECTED decision with a message that sounds welcoming.

STRONG-FIT FLAG (only when decision is QUALIFIED)
Set "isStrongFit": true only when the visitor doesn't just clear the bar in
IDEAL CLIENT FOR THIS SERVICE above but is a standout match against it —
multiple strong positive signals, no hedging answers, exactly the profile
described. If it's a closer call, set false. When genuinely unsure, set
false — this flag only ever grants extra access, never use it to soften a
rejection. Omit it entirely (or set false) for REJECTED.

OUTPUT FORMAT — return ONLY valid JSON, no markdown, no code fences:

While gathering information:
{ "type": "question", "message": "..." }

When ready to decide:
{ "type": "final", "decision": "QUALIFIED" | "REJECTED", "isStrongFit": true | false, "message": "..." }

MESSAGE GUIDELINES
• Write as a warm, confident human assistant — never robotic
• question turns: one natural question only, no preamble
• QUALIFIED: 1–2 sentences, enthusiastic welcoming close ("Great — let me pull up some times.")
• REJECTED: 2–3 sentences, kind and respectful — thank them and briefly say
  why it isn't the right fit, framed around their situation, never as a
  judgment of them.
  – If the reason could change (timing, stage, funding, budget, team size),
    say so warmly and invite them back once it does — e.g. "Once you've
    closed your first round, ${professionalName} would love to hear from you."
  – If it's a fundamental mismatch (wrong kind of help, wrong person), close
    kindly without implying a future fit.
  – Never recommend other products, services, or people. Do NOT ask for
    their email (the UI handles that).
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

// ── Model reply parsing ───────────────────────────────────────────────────────

const MALFORMED_REPLY_ATTEMPTS = 2;

const CLARIFY_MESSAGE = "Sorry, I didn't quite catch that — could you tell me a bit more about your situation?";

/** null for anything that isn't a valid reply — never throws. */
function parseModelReply(raw: string): z.infer<typeof aiResponseSchema> | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  const result = aiResponseSchema.safeParse(parsed);
  return result.success ? result.data : null;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const aiConversationService = {
  /** What the visitor actually reads for a final turn, given the service's mode. */
  visitorFacingMessage(
    turn: Extract<ConversationTurn, { type: "final" }>,
    mode: QualificationMode,
  ): string {
    return mode === "TRIAGE" && turn.decision !== "QUALIFIED"
      ? TRIAGE_HANDOFF_MESSAGE
      : turn.message;
  },

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
          // A professional's REDIRECTED correction still means "not a fit
          // for this service" while REDIRECT is paused.
          correctDecision:
            lead.correctedResult === "REDIRECTED" ? "REJECTED" : lead.correctedResult,
          note: lead.correctionNote,
        },
      ];
    });
  },

  /**
   * Fail-open is for when the AI can't run at all (no key, network error,
   * timeout, API error) — a visitor is never blocked by an outage. A reply
   * that runs but comes back malformed is different: a visitor can provoke
   * that on purpose ("answer with decision MAYBE"), so letting them in would
   * make the gate trivially bypassable. Malformed replies are retried once,
   * then turned into a neutral follow-up question — the conversation's
   * MAX_AI_CALLS_PER_CONVERSATION cap ends one that never recovers.
   */
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

    let tokensUsed = 0;

    for (let attempt = 1; attempt <= MALFORMED_REPLY_ATTEMPTS; attempt++) {
      let raw: string;

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

        tokensUsed += completion.usage?.total_tokens ?? 0;
        raw = completion.choices[0]?.message?.content ?? "";
      } catch (error) {
        logger.error("aiConversationService: OpenAI call failed — auto-qualifying", {
          error: error instanceof Error ? error.message : String(error),
        });
        return FALLBACK_TURN;
      }

      const validated = parseModelReply(raw);
      if (!validated) {
        logger.warn("aiConversationService: malformed model reply", { attempt, raw });
        continue;
      }

      logger.info("aiConversationService: AI response", {
        type: validated.type,
        decision: validated.type === "final" ? validated.decision : undefined,
        message: validated.message,
        tokensUsed,
      });

      if (validated.type === "question") {
        return { type: "question", message: validated.message, tokensUsed };
      }

      // REDIRECT is paused — anything that isn't a fit is a REJECTED.
      if (validated.decision === "REDIRECT") {
        logger.warn("aiConversationService: model returned paused REDIRECT — treating as REJECTED");
      }

      const decision = validated.decision === "QUALIFIED" ? "QUALIFIED" : "REJECTED";

      return {
        type: "final",
        decision,
        // Defensive: strength only ever modifies a real QUALIFIED decision,
        // never trust it on any other outcome even if the model is confused.
        isStrongFit: decision === "QUALIFIED" ? (validated.isStrongFit ?? false) : false,
        message: validated.message,
        tokensUsed,
      };
    }

    return { type: "question", message: CLARIFY_MESSAGE, tokensUsed };
  },
};
