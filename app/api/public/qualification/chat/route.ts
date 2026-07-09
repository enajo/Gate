import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z, ZodError } from "zod";

import { logger } from "@/lib/logger";
import { getClientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { bookingRepository } from "@/server/repositories/booking.repository";
import { profileRepository } from "@/server/repositories/profile.repository";
import { serviceRepository } from "@/server/repositories/service.repository";
import { aiConversationService } from "@/server/services/ai-conversation.service";

// ── Input schema ──────────────────────────────────────────────────────────────

const messageSchema = z.object({
  role: z.enum(["assistant", "user"]),
  content: z.string().min(1).max(2000),
});

const chatSchema = z
  .object({
    professionalId: z.string().trim().min(1),
    serviceId: z.string().trim().min(1),
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(320),
    /** Full conversation history so far — empty on the first call. */
    history: z.array(messageSchema).max(40),
  })
  .strict();

// ── Token thresholds ──────────────────────────────────────────────────────────

const LOW_BALANCE_THRESHOLD = 500;

// ── Error helper ──────────────────────────────────────────────────────────────

function errorResponse(error: unknown, status = 400) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Invalid request", details: error.flatten() },
      { status: 422 },
    );
  }

  const message =
    error instanceof Error ? error.message : "An unexpected error occurred.";

  if (
    message === "Professional profile not found." ||
    message === "Service not found."
  ) {
    return NextResponse.json({ error: message }, { status: 404 });
  }

  logger.error("Unexpected error in POST /api/public/qualification/chat", {
    error: message,
  });

  return NextResponse.json({ error: message }, { status });
}

// ── Route ─────────────────────────────────────────────────────────────────────

// 20 messages per 5 minutes per IP — generous for a real conversation,
// tight enough to block bots burning your OpenAI credits
const CHAT_LIMIT  = 20;
const CHAT_WINDOW = 5 * 60 * 1000;

export async function POST(request: Request) {
  const ip     = getClientIp(request);
  const result = rateLimit(`qualification:chat:${ip}`, CHAT_LIMIT, CHAT_WINDOW);
  if (!result.allowed) return tooManyRequests(result.resetAt);

  try {
    const json = (await request.json()) as Record<string, unknown>;
    const input = chatSchema.parse(json);

    // 1. Verify professional exists
    const professional = await profileRepository.findById(input.professionalId);
    if (!professional) {
      return NextResponse.json(
        { error: "Professional profile not found." },
        { status: 404 },
      );
    }

    // 2. Verify the requested service belongs to this professional
    const requestedService = await serviceRepository.findByIdForProfessional(
      input.serviceId,
      input.professionalId,
    );
    if (!requestedService) {
      return NextResponse.json(
        { error: "Service not found." },
        { status: 404 },
      );
    }

    // 3. Check token balance — if exhausted, fail open (auto-qualify)
    const currentBalance = professional.tokenBalance;
    if (currentBalance <= 0) {
      logger.warn("aiConversationService: token balance exhausted — auto-qualifying", {
        professionalId: input.professionalId,
      });

      const lead = await bookingRepository.createLeadForProfessional(
        input.professionalId,
        {
          serviceId: input.serviceId,
          name: input.name,
          email: input.email,
          answersJson: {
            autoQualified: true,
            reason: "token_balance_exhausted",
            history: input.history,
          } as Prisma.InputJsonValue,
          qualificationResult: "QUALIFIED",
        },
      );

      return NextResponse.json({
        type: "final",
        decision: "QUALIFIED",
        redirectService: null,
        message: "Sounds like a great fit — let me pull up some available times.",
        leadId: lead.id,
        tokensUsed: 0,
        tokenBalance: 0,
        lowBalance: true,
      });
    }

    // 4. Load all active services so the AI can suggest alternatives
    const allServices = await serviceRepository.findActiveByProfessionalId(
      input.professionalId,
    );

    // 5. Call the conversational AI
    const turn = await aiConversationService.nextTurn({
      professionalName: professional.fullName,
      professionalTitle: professional.title,
      professionalBio: professional.bio,
      services: allServices.map((s) => ({
        id: s.id,
        title: s.title,
        displayPrice: s.displayPrice,
        description: s.description,
        idealPersonaDescription: s.idealPersonaDescription,
        directPurchaseUrl: s.directPurchaseUrl,
      })),
      targetServiceId: input.serviceId,
      history: input.history,
      visitorName: input.name,
    });

    // 6. Deduct tokens — only when the AI actually called OpenAI
    let newBalance = currentBalance;
    if (turn.tokensUsed > 0) {
      const updated = await profileRepository.deductTokenBalance(
        input.professionalId,
        turn.tokensUsed,
      );
      newBalance = Math.max(0, updated.tokenBalance);
    }

    // 7. If the AI reached a final decision, create the Lead record now
    if (turn.type === "final") {
      // Resolve redirect service details if needed
      let redirectService: {
        id: string;
        title: string;
        directPurchaseUrl: string;
      } | null = null;

      if (turn.decision === "REDIRECT" && turn.redirectServiceId) {
        const match = allServices.find((s) => s.id === turn.redirectServiceId);
        if (match?.directPurchaseUrl) {
          redirectService = {
            id: match.id,
            title: match.title,
            directPurchaseUrl: match.directPurchaseUrl,
          };
        }
      }

      const qualificationResult =
        turn.decision === "QUALIFIED"
          ? "QUALIFIED"
          : turn.decision === "REDIRECT"
            ? "REDIRECTED"
            : "REJECTED";

      const lead = await bookingRepository.createLeadForProfessional(
        input.professionalId,
        {
          serviceId: input.serviceId,
          name: input.name,
          email: input.email,
          answersJson: {
            conversationHistory: input.history,
            aiDecision: turn.decision,
            aiMessage: turn.message,
            redirectServiceId: turn.redirectServiceId ?? null,
          } as Prisma.InputJsonValue,
          qualificationResult,
        },
      );

      return NextResponse.json({
        type: "final",
        decision: turn.decision,
        redirectService,
        message: turn.message,
        leadId: lead.id,
        tokensUsed: turn.tokensUsed,
        tokenBalance: newBalance,
        lowBalance: newBalance <= LOW_BALANCE_THRESHOLD,
      });
    }

    // 8. Still in conversation — return the next question
    return NextResponse.json({
      type: "question",
      message: turn.message,
      tokensUsed: turn.tokensUsed,
      tokenBalance: newBalance,
      lowBalance: newBalance <= LOW_BALANCE_THRESHOLD,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
