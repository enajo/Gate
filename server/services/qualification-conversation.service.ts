import "server-only";

import type { Prisma, QualificationMode } from "@prisma/client";

import {
  MAX_AI_CALLS_PER_CONVERSATION,
  MAX_CONVERSATIONS_PER_VISITOR_PER_DAY,
  PLAN_TIER_LIMITS,
} from "@/lib/constants";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";
import { bookingRepository } from "@/server/repositories/booking.repository";
import { profileRepository } from "@/server/repositories/profile.repository";
import { qualificationConversationRepository } from "@/server/repositories/qualification-conversation.repository";
import { serviceRepository } from "@/server/repositories/service.repository";
import { visitRepository } from "@/server/repositories/visit.repository";
import {
  aiConversationService,
  type ConversationMessage,
} from "@/server/services/ai-conversation.service";
import { emailService } from "@/server/services/email.service";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ChatTurnInput = {
  professionalId: string;
  serviceId: string;
  name: string;
  email: string;
  /** Absent on the first turn — the server starts a new conversation. */
  conversationId?: string | null;
  /** The visitor's next message. Absent on the first turn (the AI opens). */
  message?: string | null;
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  /** Caller's IP — keys the per-visitor conversation cap. */
  ip: string;
  /** gate_visitor_id cookie, for visit stitching. */
  visitorId?: string | null;
};

export type ChatTurnResult =
  | { kind: "question"; conversationId: string; message: string }
  | {
      kind: "final";
      conversationId: string | null;
      decision: "QUALIFIED" | "REJECTED";
      isStrongFit: boolean;
      message: string;
      leadId: string;
    }
  | { kind: "error"; status: number; error: string; resetAt?: number };

// The fail-open message a visitor sees when the gate can't screen them.
const AUTO_QUALIFY_MESSAGE = "Sounds like a great fit — let me pull up some available times.";

const DAY_MS = 24 * 60 * 60 * 1000;

// ── Helpers ───────────────────────────────────────────────────────────────────

function readMessages(json: Prisma.JsonValue): ConversationMessage[] {
  if (!Array.isArray(json)) return [];

  return json.flatMap((m) => {
    if (!m || typeof m !== "object" || Array.isArray(m)) return [];
    const { role, content } = m as { role?: unknown; content?: unknown };
    if ((role !== "assistant" && role !== "user") || typeof content !== "string") return [];
    return [{ role, content }];
  });
}

/** Best-effort — a visitor without the cookie just doesn't get stitched. */
async function linkVisits(professionalId: string, visitorId: string | null | undefined, leadId: string) {
  if (!visitorId) return;

  try {
    await visitRepository.linkVisitsToLead({ professionalId, visitorId, leadId });
  } catch (error) {
    logger.error("qualificationConversation: failed to link visits to lead", {
      error: error instanceof Error ? error.message : String(error),
      professionalId,
      leadId,
    });
  }
}

/** Once per reset period; never blocks or fails the visitor's request. */
async function notifyAllowanceExhausted(professionalId: string, monthlyConversations: number) {
  try {
    const claimed = await profileRepository.claimAllowanceExhaustedNotice(professionalId);
    if (!claimed) return;

    const professional = await profileRepository.findByIdWithUser(professionalId);
    if (!professional?.user.email) return;

    await emailService.sendConversationAllowanceExhaustedProfessional({
      to: professional.user.email,
      professionalName: professional.fullName,
      monthlyConversations,
      settingsUrl: `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/app/settings`,
    });
  } catch (error) {
    logger.error("qualificationConversation: allowance-exhausted notice failed", {
      error: error instanceof Error ? error.message : String(error),
      professionalId,
    });
  }
}

async function createLead(
  input: ChatTurnInput,
  data: {
    answersJson: Record<string, unknown>;
    qualificationResult: "QUALIFIED" | "REJECTED";
    isStrongFit: boolean;
  },
) {
  const lead = await bookingRepository.createLeadForProfessional(input.professionalId, {
    serviceId: input.serviceId,
    name: input.name,
    email: input.email,
    answersJson: data.answersJson as Prisma.InputJsonValue,
    qualificationResult: data.qualificationResult,
    isStrongFit: data.isStrongFit,
    referrer: input.referrer ?? null,
    utmSource: input.utmSource ?? null,
    utmMedium: input.utmMedium ?? null,
    utmCampaign: input.utmCampaign ?? null,
  });

  await linkVisits(input.professionalId, input.visitorId, lead.id);
  return lead;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const qualificationConversationService = {
  /**
   * One turn of a visitor's screening conversation. The server owns the
   * transcript: the client only sends its next message, so history can't be
   * forged (fake assistant turns) or padded to inflate AI cost. The first
   * turn uses one conversation from the expert's monthly allowance; when
   * that's exhausted the gate fails open (the visitor books unscreened) and
   * the expert is emailed once.
   */
  async handleTurn(input: ChatTurnInput): Promise<ChatTurnResult> {
    const professional = await profileRepository.findById(input.professionalId);
    if (!professional) {
      return { kind: "error", status: 404, error: "Professional profile not found." };
    }

    const service = await serviceRepository.findByIdForProfessional(
      input.serviceId,
      input.professionalId,
    );
    if (!service) {
      return { kind: "error", status: 404, error: "Service not found." };
    }

    const mode: QualificationMode = service.qualificationMode;

    // ── Load or start the conversation ──────────────────────────────────────

    let conversationId: string;
    let history: ConversationMessage[];
    let expectedAiCalls: number;

    if (!input.conversationId) {
      // Per visitor, per expert, per day — bounds anyone deliberately
      // burning a FREE expert's allowance from one connection.
      const visitorCap = await rateLimit(
        `conversation-start:${input.professionalId}:${input.ip}`,
        MAX_CONVERSATIONS_PER_VISITOR_PER_DAY,
        DAY_MS,
      );
      if (!visitorCap.allowed) {
        return {
          kind: "error",
          status: 429,
          error: "You've started several conversations today — please try again tomorrow.",
          resetAt: visitorCap.resetAt,
        };
      }

      const monthlyConversations = PLAN_TIER_LIMITS[professional.planTier].monthlyConversations;
      if (monthlyConversations !== null) {
        const claimed = await profileRepository.claimConversation(input.professionalId);

        if (!claimed) {
          logger.warn("qualificationConversation: allowance exhausted — auto-qualifying", {
            professionalId: input.professionalId,
          });
          void notifyAllowanceExhausted(input.professionalId, monthlyConversations);

          const lead = await createLead(input, {
            answersJson: { autoQualified: true, reason: "conversation_allowance_exhausted" },
            qualificationResult: "QUALIFIED",
            // Fail-open path, not a real AI judgment — must never grant
            // slot priority.
            isStrongFit: false,
          });

          return {
            kind: "final",
            conversationId: null,
            decision: "QUALIFIED",
            isStrongFit: false,
            message: AUTO_QUALIFY_MESSAGE,
            leadId: lead.id,
          };
        }
      }

      const conversation = await qualificationConversationRepository.create({
        professionalId: input.professionalId,
        serviceId: input.serviceId,
      });

      conversationId = conversation.id;
      history = [];
      expectedAiCalls = 0;
    } else {
      const conversation = await qualificationConversationRepository.findById(input.conversationId);

      if (
        !conversation ||
        conversation.professionalId !== input.professionalId ||
        conversation.serviceId !== input.serviceId
      ) {
        return { kind: "error", status: 404, error: "Conversation not found." };
      }

      if (conversation.endedAt) {
        return { kind: "error", status: 409, error: "This conversation has already ended." };
      }

      const text = input.message?.trim();
      if (!text) {
        return { kind: "error", status: 422, error: "Please type a reply." };
      }

      if (conversation.aiCalls >= MAX_AI_CALLS_PER_CONVERSATION) {
        await qualificationConversationRepository.end(conversation.id);
        return {
          kind: "error",
          status: 409,
          error: "This conversation has gone on too long to reach a decision. Please start again.",
        };
      }

      conversationId = conversation.id;
      history = [...readMessages(conversation.messages), { role: "user", content: text }];
      expectedAiCalls = conversation.aiCalls;
    }

    // ── Claim the turn, then ask the gate ───────────────────────────────────

    const claimed = await qualificationConversationRepository.claimTurn({
      id: conversationId,
      expectedAiCalls,
      messages: history as unknown as Prisma.InputJsonValue,
    });
    if (!claimed) {
      return {
        kind: "error",
        status: 409,
        error: "This conversation was updated in another tab. Please refresh and try again.",
      };
    }

    const [allServices, labeledLeads] = await Promise.all([
      serviceRepository.findActiveByProfessionalId(input.professionalId),
      bookingRepository.findRecentLabeledLeadsForService(input.serviceId),
    ]);

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
      history,
      visitorName: input.name,
      labeledExamples: aiConversationService.buildLabeledExamples(labeledLeads),
    });

    const withReply: ConversationMessage[] = [...history, { role: "assistant", content: turn.message }];

    if (turn.type === "question") {
      await qualificationConversationRepository.recordReply({
        id: conversationId,
        messages: withReply as unknown as Prisma.InputJsonValue,
      });
      return { kind: "question", conversationId, message: turn.message };
    }

    const lead = await createLead(input, {
      answersJson: {
        conversationHistory: history,
        aiDecision: turn.decision,
        aiMessage: turn.message,
        ...(turn.failedOpen ? { autoQualified: true, reason: "ai_unavailable" } : {}),
      },
      qualificationResult: turn.decision,
      // Already guaranteed false for anything but a real QUALIFIED
      // judgment by aiConversationService's own guards.
      isStrongFit: turn.isStrongFit,
    });

    await qualificationConversationRepository.recordReply({
      id: conversationId,
      messages: withReply as unknown as Prisma.InputJsonValue,
      endedAt: new Date(),
      leadId: lead.id,
    });

    return {
      kind: "final",
      conversationId,
      decision: turn.decision,
      isStrongFit: turn.isStrongFit,
      // The real verdict stays on the Lead (aiMessage) for the professional.
      message: aiConversationService.visitorFacingMessage(turn, mode),
      leadId: lead.id,
    };
  },
};
