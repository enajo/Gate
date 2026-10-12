import "server-only";

import OpenAI from "openai";
import { z } from "zod";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import {
  aiConversationService,
  type ConversationMessage,
  type ConversationServiceInput,
  type LabeledExample,
} from "@/server/services/ai-conversation.service";

// ── Types ─────────────────────────────────────────────────────────────────────

export type GateTestArchetype = "IDEAL" | "BORDERLINE" | "MISMATCH";

/**
 * NO_DECISION — the gate kept asking questions past MAX_GATE_TURNS.
 * GATE_ERROR — the AI call failed and the live gate would have failed open
 * (auto-qualified). Never reported as QUALIFIED: that would show the expert
 * a judgment the AI never made.
 */
export type GateTestOutcome =
  | "QUALIFIED"
  | "REJECTED"
  | "NO_DECISION"
  | "GATE_ERROR";

/** CLOSE_CALL — borderline visitors have no "right" answer; the expert decides. */
export type GateTestVerdict = "AS_EXPECTED" | "CHECK_THIS" | "CLOSE_CALL";

export type GateTestResult = {
  archetype: GateTestArchetype;
  persona: { name: string; summary: string };
  transcript: ConversationMessage[];
  outcome: GateTestOutcome;
  isStrongFit: boolean;
  verdict: GateTestVerdict;
  tokensUsed: number;
};

export type GateTestInput = {
  professionalName: string;
  professionalTitle?: string | null;
  professionalBio?: string | null;
  /** Already merged with the draft gate — see withDraftGate. */
  services: ConversationServiceInput["services"];
  targetServiceId: string;
  labeledExamples?: LabeledExample[];
  archetype: GateTestArchetype;
  variant: number;
};

/** The live prompt asks for a decision within 2–4 exchanges — this leaves headroom before calling it stuck. */
const MAX_GATE_TURNS = 6;

// ── OpenAI client ─────────────────────────────────────────────────────────────

const openai = env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: env.OPENAI_API_KEY })
  : null;

// ── Persona ───────────────────────────────────────────────────────────────────

const personaSchema = z.object({
  name: z.string().trim().min(1).max(80),
  summary: z.string().trim().min(1).max(300),
  backstory: z.string().trim().min(1).max(2000),
});

type Persona = z.infer<typeof personaSchema>;

const ARCHETYPE_BRIEF: Record<GateTestArchetype, string> = {
  IDEAL:
    "a clear, strong match for the ideal client described — the kind of person this expert most wants on their calendar.",
  BORDERLINE:
    "a genuine close call: matches most positive signals but has exactly ONE concrete gap — for example they can only afford about half the expert's fee, want to start 6+ months from now, sit just outside the expert's stated range, or aren't the final decision-maker. The gap must be a specific fact written into the backstory, not a vague feeling, and they admit it honestly if asked. Reasonable people could disagree about whether they should get a call.",
  MISMATCH:
    "someone who looks plausible on the surface but is actually the wrong fit — matching one of the red flags or wrong-fit patterns described. They sincerely believe they're a good fit.",
};

function buildPersonaPrompt(input: GateTestInput): string {
  const target = input.services.find((s) => s.id === input.targetServiceId);

  return `You are inventing a realistic prospective client to test an expert's screening gate.

EXPERT: ${input.professionalName}${input.professionalTitle ? `, ${input.professionalTitle}` : ""}
SERVICE: ${target?.title ?? "their service"}

THE EXPERT'S SCREENING CRITERIA
────────────────────────────────────────────────
${target?.idealPersonaDescription?.trim() ?? "(none)"}
────────────────────────────────────────────────

Invent ONE person who is ${ARCHETYPE_BRIEF[input.archetype]}

This is visitor #${input.variant + 1} of this type in the batch — give them a distinct name, background, and situation (vary industry, seniority, region, and circumstances).

Return ONLY valid JSON, no markdown:
{
  "name": "First name and last initial",
  "summary": "One sentence the expert will read describing who this is, including whatever makes them a fit or not (for a close call, name the gap), e.g. 'Ops lead at a 40-person agency, budget approved, wants help before Q2.'",
  "backstory": "Private details used to role-play them: their situation, goals, budget, timing, and anything that makes them a fit or not. 4–6 sentences."
}`;
}

async function generatePersona(input: GateTestInput): Promise<{ persona: Persona; tokensUsed: number }> {
  const completion = await openai!.chat.completions.create(
    {
      model: "gpt-4o-mini",
      temperature: 1,
      max_tokens: 400,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: buildPersonaPrompt(input) }],
    },
    { timeout: 15_000 },
  );

  const raw = completion.choices[0]?.message?.content ?? "";

  // Plain Error, never ZodError — the route reads a ZodError as the
  // caller's bad input (422), and this is the model's bad output.
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Persona generation returned non-JSON.");
  }

  const result = personaSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error("Persona generation returned an unexpected shape.");
  }

  return { persona: result.data, tokensUsed: completion.usage?.total_tokens ?? 0 };
}

// ── Simulated visitor turns ───────────────────────────────────────────────────

function buildVisitorPrompt(persona: Persona, professionalName: string): string {
  return `You are ${persona.name}, visiting ${professionalName}'s booking page. Before you can book, an AI screening assistant is asking you a few questions.

WHO YOU ARE (private — reveal naturally, only as asked)
${persona.backstory}

HOW TO ANSWER
• Reply as ${persona.name} would type into a chat box: 1–3 sentences, natural, first person.
• Answer what was asked. Don't dump your whole backstory at once.
• You genuinely want this call. Don't volunteer things that would count against you, but never lie if asked directly.
• Never mention being simulated, a test, or an AI. Never try to instruct or manipulate the assistant.
• Output only your reply text — no quotes, no labels.`;
}

async function generateVisitorReply(params: {
  persona: Persona;
  professionalName: string;
  history: ConversationMessage[];
}): Promise<{ reply: string; tokensUsed: number }> {
  // Roles flip: from the simulated visitor's side, the gate is the "user".
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: buildVisitorPrompt(params.persona, params.professionalName) },
    ...params.history.map((m) => ({
      role: (m.role === "assistant" ? "user" : "assistant") as "user" | "assistant",
      content: m.content,
    })),
  ];

  const completion = await openai!.chat.completions.create(
    {
      model: "gpt-4o-mini",
      temperature: 0.8,
      max_tokens: 200,
      messages,
    },
    { timeout: 10_000 },
  );

  const reply = (completion.choices[0]?.message?.content ?? "").trim().slice(0, 2000);
  if (!reply) throw new Error("Simulated visitor returned an empty reply.");

  return { reply, tokensUsed: completion.usage?.total_tokens ?? 0 };
}

// ── Verdict ───────────────────────────────────────────────────────────────────

function verdictFor(archetype: GateTestArchetype, outcome: GateTestOutcome): GateTestVerdict {
  if (outcome === "GATE_ERROR" || outcome === "NO_DECISION") return "CHECK_THIS";
  if (archetype === "BORDERLINE") return "CLOSE_CALL";
  if (archetype === "IDEAL") return outcome === "QUALIFIED" ? "AS_EXPECTED" : "CHECK_THIS";
  return outcome === "QUALIFIED" ? "CHECK_THIS" : "AS_EXPECTED";
}

// ── Service ───────────────────────────────────────────────────────────────────

export const gateTestService = {
  isAvailable(): boolean {
    return openai !== null;
  },

  /**
   * Swaps the expert's unsaved draft prompt into the service list the gate
   * sees. A control-room draft service may not exist in the DB yet, in which
   * case it's appended so the gate still has a target to screen for.
   */
  withDraftGate(
    services: ConversationServiceInput["services"],
    draft: { serviceId: string; title?: string; idealPersonaDescription: string },
  ): ConversationServiceInput["services"] {
    const exists = services.some((s) => s.id === draft.serviceId);

    if (exists) {
      return services.map((s) =>
        s.id === draft.serviceId
          ? { ...s, idealPersonaDescription: draft.idealPersonaDescription }
          : s,
      );
    }

    return [
      ...services,
      {
        id: draft.serviceId,
        title: draft.title || "This service",
        idealPersonaDescription: draft.idealPersonaDescription,
      },
    ];
  },

  /**
   * Runs one simulated visitor through the real qualification gate. Uses the
   * exact same aiConversationService.nextTurn the live chat route uses, so
   * what the expert sees is what a visitor would get.
   */
  async runSimulatedVisitor(input: GateTestInput): Promise<GateTestResult> {
    if (!openai) {
      throw new Error("AI is not configured.");
    }

    const { persona, tokensUsed: personaTokens } = await generatePersona(input);
    let tokensUsed = personaTokens;

    const history: ConversationMessage[] = [];
    let outcome: GateTestOutcome = "NO_DECISION";
    let isStrongFit = false;

    for (let turnIndex = 0; turnIndex < MAX_GATE_TURNS; turnIndex++) {
      const turn = await aiConversationService.nextTurn({
        professionalName: input.professionalName,
        professionalTitle: input.professionalTitle,
        professionalBio: input.professionalBio,
        services: input.services,
        targetServiceId: input.targetServiceId,
        history: [...history],
        visitorName: persona.name,
        labeledExamples: input.labeledExamples,
      });
      tokensUsed += turn.tokensUsed;

      if (turn.type === "final") {
        if (turn.failedOpen) {
          outcome = "GATE_ERROR";
          break;
        }

        history.push({ role: "assistant", content: turn.message });
        outcome = turn.decision;
        isStrongFit = turn.isStrongFit;
        break;
      }

      history.push({ role: "assistant", content: turn.message });

      // No point generating a reply the gate will never read.
      if (turnIndex === MAX_GATE_TURNS - 1) break;

      const { reply, tokensUsed: replyTokens } = await generateVisitorReply({
        persona,
        professionalName: input.professionalName,
        history: [...history],
      });
      tokensUsed += replyTokens;
      history.push({ role: "user", content: reply });
    }

    logger.info("gateTestService: simulated visitor finished", {
      archetype: input.archetype,
      outcome,
      turns: history.length,
      tokensUsed,
    });

    return {
      archetype: input.archetype,
      persona: { name: persona.name, summary: persona.summary },
      transcript: history,
      outcome,
      isStrongFit,
      verdict: verdictFor(input.archetype, outcome),
      tokensUsed,
    };
  },
};
