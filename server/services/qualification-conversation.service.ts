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
  MIN_LABELED_EXAMPLES,
  type ConversationMessage,
  type ReturningVisitorContext,
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

// A not-yet visitor is remembered for this long; after that they start cold.
const NOT_YET_MEMORY_DAYS = 365;

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

/**
 * The earlier "not yet" Lead this browser is coming back from, if any.
 * Deliberately narrow — this is the only cross-visit memory the gate has:
 * recognized by the gate_visitor_id cookie only (never a typed email, which
 * anyone could enter to see someone else's earlier answers); only when that
 * browser's most recent lead with this expert was a not-yet for the same
 * service; only within NOT_YET_MEMORY_DAYS.
 */
async function findReturningNotYetLead(input: ChatTurnInput) {
  if (!input.visitorId) return null;

  try {
    const lead = await visitRepository.findMostRecentLinkedLead({
      professionalId: input.professionalId,
      visitorId: input.visitorId,
    });

    if (
      !lead ||
      !lead.notYetReadyWhen ||
      lead.serviceId !== input.serviceId ||
      Date.now() - lead.createdAt.getTime() > NOT_YET_MEMORY_DAYS * DAY_MS
    ) {
      return null;
    }

    return lead;
  } catch (error) {
    // Memory is a nicety — never fail a visitor's conversation over it.
    logger.error("qualificationConversation: returning-visitor lookup failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function loadReturningContext(leadId: string | null): Promise<ReturningVisitorContext | null> {
  if (!leadId) return null;

  try {
    const lead = await bookingRepository.findLeadById(leadId);
    return lead ? aiConversationService.buildReturningContext(lead) : null;
  } catch (error) {
    logger.error("qualificationConversation: returning context unavailable", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function createLead(
  input: ChatTurnInput,
  data: {
    answersJson: Record<string, unknown>;
    qualificationResult: "QUALIFIED" | "REJECTED";
    isStrongFit: boolean;
    notYetReadyWhen?: string | null;
  },
) {
  const lead = await bookingRepository.createLeadForProfessional(input.professionalId, {
    serviceId: input.serviceId,
    name: input.name,
    email: input.email,
    answersJson: data.answersJson as Prisma.InputJsonValue,
    qualificationResult: data.qualificationResult,
    isStrongFit: data.isStrongFit,
    notYetReadyWhen: data.notYetReadyWhen ?? null,
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
   * forged (fake assistant turns) or padded to inflate AI cost. A
   * conversation is used from the expert's monthly allowance only when the
   * gate reaches a decision; when the allowance is already exhausted at the
   * start, the gate fails open (the visitor books unscreened) and the
   * expert is emailed once.
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
    let returningVisitor: ReturningVisitorContext | null = null;
    let returningFromLeadId: string | null = null;

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

      // Only checked here — a conversation is used when it reaches a
      // decision (see recordDecision below), so abandoned chats are free.
      const monthlyConversations = PLAN_TIER_LIMITS[professional.planTier].monthlyConversations;
      if (monthlyConversations !== null) {
        if (professional.conversationBalance <= 0) {
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

      const returningLead = await findReturningNotYetLead(input);
      if (returningLead) {
        returningFromLeadId = returningLead.id;
        returningVisitor = aiConversationService.buildReturningContext(returningLead);
        // Shows the expert this not-yet visitor came back.
        await bookingRepository.updateLeadById(returningLead.id, { notYetReturnedAt: new Date() });
      }

      const conversation = await qualificationConversationRepository.create({
        professionalId: input.professionalId,
        serviceId: input.serviceId,
        returningFromLeadId,
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
      returningFromLeadId = conversation.returningFromLeadId;
      returningVisitor = await loadReturningContext(conversation.returningFromLeadId);
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

    const labeledExamples = aiConversationService.buildLabeledExamples(labeledLeads);

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
      labeledExamples,
      returningVisitor,
    });

    const withReply: ConversationMessage[] = [...history, { role: "assistant", content: turn.message }];

    if (turn.type === "question") {
      await qualificationConversationRepository.recordReply({
        id: conversationId,
        messages: withReply as unknown as Prisma.InputJsonValue,
      });
      return { kind: "question", conversationId, message: turn.message };
    }

    // A conversation counts once the gate actually decides. Not when it
    // failed open (the AI never judged them), and not on unlimited plans.
    // If the last one was used by a parallel chat in the meantime, this
    // decision goes uncounted rather than cutting the visitor off.
    if (!turn.failedOpen && PLAN_TIER_LIMITS[professional.planTier].monthlyConversations !== null) {
      await profileRepository.claimConversation(input.professionalId);
    }

    const lead = await createLead(input, {
      answersJson: {
        conversationHistory: history,
        aiDecision: turn.decision,
        aiMessage: turn.message,
        ...(turn.failedOpen ? { autoQualified: true, reason: "ai_unavailable" } : {}),
        ...(returningFromLeadId ? { returningFromLeadId } : {}),
        ...(turn.evidence?.length ? { qualificationEvidence: turn.evidence } : {}),
        ...(turn.reasons ? { rejectionReasons: turn.reasons } : {}),
        ...(turn.strongFitReason ? { strongFitReason: turn.strongFitReason } : {}),
        // What this decision was judged against — the expert can edit the
        // gate later, so the lead keeps its own copy.
        gateCriteria:
          allServices.find((s) => s.id === input.serviceId)?.idealPersonaDescription ?? null,
        calibrationReviewsUsed:
          labeledExamples.length >= MIN_LABELED_EXAMPLES ? labeledExamples.length : 0,
      },
      qualificationResult: turn.decision,
      notYetReadyWhen: turn.readyWhen ?? null,
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
