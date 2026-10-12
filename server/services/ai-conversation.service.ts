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
  /** Set only when this visitor is coming back after a "not yet" — see buildReturningContext. */
  returningVisitor?: ReturningVisitorContext | null;
};

/**
 * The only memory the gate keeps across visits, and only for "not yet"
 * visitors (see qualification-conversation.service.ts for how they're
 * recognized).
 */
/** A must-have, and the visitor's own words that confirm it. */
export type QualificationEvidence = {
  requirement: string;
  quote: string;
};

export type ReturningVisitorContext = {
  /** e.g. "3 March 2026" */
  previousVisitDate: string;
  readyWhen: string;
  /** A couple of the visitor's own earlier answers. */
  earlierAnswers: string | null;
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
      /**
       * Only on a REJECTED that's "right person, wrong time": what would need
       * to change. null for QUALIFIED and for fundamental mismatches.
       */
      readyWhen?: string | null;
      /** Only on QUALIFIED: each must-have, with the visitor's words confirming it (checked against what they said). */
      evidence?: QualificationEvidence[];
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
    // Optional so a model that omits them never fails the parse.
    notYet: z.boolean().optional(),
    readyWhen: z.string().max(300).nullish(),
    evidence: z
      .array(
        z.object({
          requirement: z.string().trim().min(1).max(200),
          quote: z.string().trim().min(1).max(300),
        }),
      )
      .max(6)
      .optional(),
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
    returningVisitor,
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

  const returningBlock = returningVisitor
    ? `\nRETURNING VISITOR — you spoke with this person on ${returningVisitor.previousVisitDate}. They weren't ready yet; what needed to change: ${returningVisitor.readyWhen}.${
        returningVisitor.earlierAnswers ? ` What they told you then: "${returningVisitor.earlierAnswers}".` : ""
      }
On your first turn, welcome them back by name (keep the AI disclosure), mention
briefly that you spoke before, and ask whether that has changed. Then screen
as usual against the profile above — coming back is not a reason to qualify
them, and don't assume anything changed unless they say so.
────────────────────────────────────────────────\n`
    : "";

  return `You are a screening assistant for ${professionalName}${professionalTitle ? `, ${professionalTitle}` : ""}.${bioLine}

Your job is to run a short qualification conversation and return a strict PASS/FAIL decision for ${professionalName}'s calendar.

────────────────────────────────────────────────
${coreBlock}

────────────────────────────────────────────────
${personaBlock}
────────────────────────────────────────────────
${calibrationBlock}${returningBlock}
HOW TO RUN THE CONVERSATION
1. On the very first turn, warmly greet the visitor by name, briefly and
   naturally let them know they're talking with an AI assistant screening on
   ${professionalName}'s behalf (one short clause is enough — this is a legal
   disclosure requirement, not optional), then ask one open question about
   their situation.
2. Ask ONE question per turn. If an answer is vague, ask ONE targeted follow-up.
3. Reach a final decision within 2–4 exchanges — but never by skipping an
   unconfirmed must-have (see MUST-HAVES below); asking about one is always
   worth an extra exchange.
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

MUST-HAVES — check every one before you QUALIFY
Use the MUST-HAVES section of the ideal client profile if it has one. If it
doesn't, treat the 2–4 clearest hard requirements in the profile (role,
stage, funding, budget, timing, size — whatever it says is required) as the
must-haves.
• Never QUALIFY until EVERY must-have is confirmed by something the visitor
  actually said. Plausible context is not confirmation — "I lead a funded
  startup" does not confirm "is the founder and CEO".
• If a must-have is still unconfirmed, ask about it directly (one question
  per turn) instead of deciding.
• If the visitor clearly fails a must-have, decide REJECTED (and consider
  the NOT-YET FLAG).
• With QUALIFIED, include "evidence": one entry per must-have —
  { "requirement": "<the must-have>", "quote": "<the visitor's exact words,
  copied verbatim, under 15 words, no ellipses>" }. Only quote what the
  visitor wrote, never your own words.

NOT-YET FLAG (only when decision is REJECTED)
Set "notYet": true only when they're the right kind of person but the
reason is something that could realistically change — timing, stage,
funding, budget, team size. Then set "readyWhen" to a short phrase naming
what would need to change, written about them (e.g. "has closed a funding
round", "can budget around $6k", "is ready to start within 3 months").
For a fundamental mismatch (wrong kind of help, wrong person) set "notYet":
false and "readyWhen": null. Omit both for QUALIFIED.

OUTPUT FORMAT — return ONLY valid JSON, no markdown, no code fences:

While gathering information:
{ "type": "question", "message": "..." }

When ready to decide:
{ "type": "final", "decision": "QUALIFIED" | "REJECTED", "isStrongFit": true | false, "notYet": true | false, "readyWhen": null | "...", "evidence": [{ "requirement": "...", "quote": "..." }], "message": "..." }
("evidence" is required for QUALIFIED; omit it for REJECTED.)

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

// ── Must-have evidence ────────────────────────────────────────────────────────

function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[^a-z0-9' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Whether a quoted fragment really came from the visitor. Exact (normalized)
 * match first; otherwise at least 80% of its meaningful words must appear in
 * what they wrote — tolerant of a dropped word, not of a fabricated claim
 * ("I'm the CEO" when they said "CTO" fails on "ceo").
 */
function quoteIsFromVisitor(quote: string, visitorText: string, visitorWords: Set<string>): boolean {
  const normalized = normalizeForMatch(quote);
  if (!normalized) return false;
  if (visitorText.includes(normalized)) return true;

  const words = normalized.split(" ").filter((w) => w.length >= 3);
  if (words.length < 2) return false;

  const found = words.filter((w) => visitorWords.has(w)).length;
  return found / words.length >= 0.8;
}

/**
 * Why a QUALIFIED reply's evidence doesn't hold up, or null if it does. The
 * server can't judge whether a must-have is met — but it can insist the AI
 * cites the visitor's own words for each one, which is what stops it
 * qualifying on a plausible story it never actually checked.
 */
function evidenceProblem(
  evidence: QualificationEvidence[] | undefined,
  history: ConversationMessage[],
): string | null {
  if (!evidence || evidence.length === 0) {
    return "it listed no evidence for the must-haves";
  }

  const visitorText = normalizeForMatch(
    history.filter((m) => m.role === "user").map((m) => m.content).join(" "),
  );
  const visitorWords = new Set(visitorText.split(" "));

  const unsupported = evidence.filter((e) => !quoteIsFromVisitor(e.quote, visitorText, visitorWords));
  if (unsupported.length > 0) {
    return `these quotes aren't the visitor's own words: ${unsupported.map((e) => `"${e.quote}"`).join(", ")}`;
  }

  return null;
}

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
   * Context for a visitor returning after a "not yet" — null for any lead
   * that wasn't one, so memory never extends past that case.
   */
  buildReturningContext(lead: Lead): ReturningVisitorContext | null {
    if (!lead.notYetReadyWhen) return null;

    return {
      previousVisitDate: lead.createdAt.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      readyWhen: lead.notYetReadyWhen,
      earlierAnswers: summarizeAnswers(lead.answersJson),
    };
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

      // A QUALIFIED has to show its work. Unsupported evidence is handled
      // like any other bad reply — retried with a correction, then a
      // follow-up question — never a fail-open.
      if (decision === "QUALIFIED") {
        const problem = evidenceProblem(validated.evidence, input.history);
        if (problem) {
          logger.warn("aiConversationService: QUALIFIED without valid evidence", { attempt, problem });
          messages.push(
            { role: "assistant", content: raw },
            {
              role: "system",
              content: `Your last reply qualified the visitor, but ${problem}. Every must-have needs a short quote of the visitor's exact words. If a must-have hasn't actually been confirmed, ask about it instead (type "question").`,
            },
          );
          continue;
        }
      }

      return {
        type: "final",
        decision,
        // Defensive: strength only ever modifies a real QUALIFIED decision,
        // never trust it on any other outcome even if the model is confused.
        isStrongFit: decision === "QUALIFIED" ? (validated.isStrongFit ?? false) : false,
        // Same defensive shape: only a real REJECTED flagged not-yet, with
        // an actual phrase, ever carries one.
        readyWhen:
          decision === "REJECTED" && validated.notYet && validated.readyWhen?.trim()
            ? validated.readyWhen.trim()
            : null,
        ...(decision === "QUALIFIED" ? { evidence: validated.evidence } : {}),
        message: validated.message,
        tokensUsed,
      };
    }

    return { type: "question", message: CLARIFY_MESSAGE, tokensUsed };
  },
};
