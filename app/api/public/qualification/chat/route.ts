import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { logger } from "@/lib/logger";
import { getClientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { qualificationConversationService } from "@/server/services/qualification-conversation.service";

const VISITOR_COOKIE = "gate_visitor_id";

// ── Input schema ──────────────────────────────────────────────────────────────

const chatSchema = z
  .object({
    professionalId: z.string().trim().min(1),
    serviceId: z.string().trim().min(1),
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(320),
    /** Returned by the first turn; absent when starting a conversation. */
    conversationId: z.string().trim().min(1).max(64).nullish(),
    /** The visitor's next message — the server holds the rest of the transcript. */
    message: z.string().max(2000).nullish(),
    /** Passive source attribution, captured server-side on page load. */
    referrer: z.string().trim().max(500).nullish(),
    utmSource: z.string().trim().max(200).nullish(),
    utmMedium: z.string().trim().max(200).nullish(),
    utmCampaign: z.string().trim().max(200).nullish(),
  })
  .strict();

// ── Route ─────────────────────────────────────────────────────────────────────

// 20 messages per 5 minutes per IP — generous for a real conversation,
// tight enough to block bots burning your OpenAI credits
const CHAT_LIMIT  = 20;
const CHAT_WINDOW = 5 * 60 * 1000;

export async function POST(request: Request) {
  const ip     = getClientIp(request);
  const result = await rateLimit(`qualification:chat:${ip}`, CHAT_LIMIT, CHAT_WINDOW);
  if (!result.allowed) return tooManyRequests(result.resetAt);

  try {
    const input = chatSchema.parse(await request.json());
    const visitorId = (await cookies()).get(VISITOR_COOKIE)?.value ?? null;

    const turn = await qualificationConversationService.handleTurn({
      ...input,
      ip,
      visitorId,
    });

    if (turn.kind === "error") {
      if (turn.status === 429 && turn.resetAt) {
        return NextResponse.json(
          { error: turn.error },
          { status: 429, headers: { "Retry-After": String(Math.ceil((turn.resetAt - Date.now()) / 1000)) } },
        );
      }
      return NextResponse.json({ error: turn.error }, { status: turn.status });
    }

    if (turn.kind === "question") {
      return NextResponse.json({
        type: "question",
        conversationId: turn.conversationId,
        message: turn.message,
      });
    }

    return NextResponse.json({
      type: "final",
      conversationId: turn.conversationId,
      decision: turn.decision,
      // REDIRECT is paused — kept in the response shape for the client.
      redirectService: null,
      isStrongFit: turn.isStrongFit,
      message: turn.message,
      leadId: turn.leadId,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.flatten() },
        { status: 422 },
      );
    }

    logger.error("Unexpected error in POST /api/public/qualification/chat", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
