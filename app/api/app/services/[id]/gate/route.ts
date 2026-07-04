import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import OpenAI from "openai";

import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { serviceCatalogService } from "@/server/services/service-catalog.service";
import { profileRepository } from "@/server/repositories/profile.repository";

// ── Types ─────────────────────────────────────────────────────────────────────

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

// ── Validation ────────────────────────────────────────────────────────────────

const compileRequestSchema = z.object({
  q1: z.string().trim().min(10, "Please describe what you do and what success looks like.").max(2000),
  q2: z.string().trim().min(10, "Please describe the situation clients are in before reaching you.").max(2000),
  q3: z.string().trim().min(10, "Please describe your best clients.").max(2000),
  q4: z.string().trim().min(10, "Please describe who is the wrong fit.").max(2000),
  extra: z.string().trim().max(2000).optional(),
  serviceTitle: z.string().trim().max(200).optional(),
});

// ── OpenAI client ─────────────────────────────────────────────────────────────

const openai = env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: env.OPENAI_API_KEY })
  : null;

// ── Prompt compiler ───────────────────────────────────────────────────────────

function buildCompilerPrompt(
  input: z.infer<typeof compileRequestSchema>,
  serviceTitle: string,
  professionalName: string,
  industry: string | null,
): string {
  const industryLine = industry ? `Industry context: ${industry}` : "";
  const extraLine = input.extra ? `\nAdditional context from expert:\n${input.extra}` : "";

  return `You are building a qualification gate for an expert booking system. Your job is to synthesize an expert's answers into two outputs:

1. A "compiledPrompt" — a structured qualification brief that an AI screening assistant will use to evaluate every visitor before they can book time with this expert. This must be precise, actionable, and written so an AI can make clear QUALIFIED vs PENDING_REVIEW decisions.

2. A "sampleConversation" — 4 realistic back-and-forth exchanges showing how the AI assistant would actually screen a visitor for THIS specific service. Make it feel natural and professional, not scripted. The AI speaks first, the visitor responds. End with a qualification decision message.

EXPERT DETAILS:
Name: ${professionalName}
Service: ${serviceTitle}
${industryLine}

EXPERT'S ANSWERS:
Q1 — What they do and what success looks like:
${input.q1}

Q2 — What clients' situation looks like before reaching them (the trigger):
${input.q2}

Q3 — What their best clients had in common:
${input.q3}

Q4 — Who looks right but is the wrong fit (red flags):
${input.q4}
${extraLine}

OUTPUT FORMAT — return ONLY valid JSON, no markdown, no code fences:
{
  "compiledPrompt": "...",
  "sampleConversation": [
    { "role": "assistant", "content": "..." },
    { "role": "visitor", "content": "..." },
    { "role": "assistant", "content": "..." },
    { "role": "visitor", "content": "..." },
    { "role": "assistant", "content": "..." },
    { "role": "visitor", "content": "..." },
    { "role": "assistant", "content": "... [qualification decision — warm close if qualified, honest and dignified if not]" }
  ]
}

COMPILED PROMPT STRUCTURE — the compiledPrompt must include these clearly labeled sections:
- WHAT THIS EXPERT DOES & THE OUTCOME THEY DELIVER
- THE TRIGGER — situation the ideal client is in right now
- POSITIVE SIGNALS (visitor must show most of these)
- RED FLAGS — reject or hold for review if any of these appear
- KEY QUESTION — the single most important thing to probe

Keep the compiledPrompt between 200-400 words. Be specific. Use the expert's own language where possible.
The sampleConversation should feel like a real screening call, not a checklist. Each assistant message is one focused question or statement only.`;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawParams = await context.params;
    const serviceId = (rawParams as { id: string }).id;

    if (!serviceId) {
      return NextResponse.json({ error: "Service ID required." }, { status: 400 });
    }

    const json = await request.json();
    const input = compileRequestSchema.parse(json);

    if (!openai) {
      return NextResponse.json(
        { error: "AI compilation is not available. Check your OpenAI API key." },
        { status: 503 },
      );
    }

    // Fetch professional for context. Service lookup is best-effort —
    // draft services in the control room may not be persisted to DB yet.
    const [service, professional] = await Promise.all([
      serviceCatalogService.getServiceById(session.user.id, serviceId),
      profileRepository.findByUserId(session.user.id),
    ]);

    const resolvedTitle = service?.title ?? input.serviceTitle ?? "this service";
    const industry = professional?.industry ?? null;

    const systemPrompt = buildCompilerPrompt(input, resolvedTitle, professional?.fullName ?? "the expert", industry);

    const completion = await openai.chat.completions.create(
      {
        model: "gpt-4o",
        temperature: 0.3,
        max_tokens: 1800,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: systemPrompt }],
      },
      { timeout: 30_000 },
    );

    const raw = completion.choices[0]?.message?.content ?? "";

    let parsed: { compiledPrompt: string; sampleConversation: Array<{ role: string; content: string }> };
    try {
      parsed = JSON.parse(raw) as typeof parsed;
    } catch {
      logger.error("gate/compile: model returned non-JSON", { raw });
      return NextResponse.json({ error: "Failed to compile gate. Please try again." }, { status: 500 });
    }

    if (!parsed.compiledPrompt || !Array.isArray(parsed.sampleConversation)) {
      return NextResponse.json({ error: "Unexpected response format. Please try again." }, { status: 500 });
    }

    return NextResponse.json({
      compiledPrompt: parsed.compiledPrompt,
      sampleConversation: parsed.sampleConversation,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.flatten() },
        { status: 422 },
      );
    }

    logger.error("gate/compile: unexpected error", { error });
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
