import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  profileRepository: {
    findById: vi.fn(),
    findByIdWithUser: vi.fn(),
    claimConversation: vi.fn(),
    claimAllowanceExhaustedNotice: vi.fn(),
  },
  serviceRepository: {
    findByIdForProfessional: vi.fn(),
    findActiveByProfessionalId: vi.fn(),
  },
  bookingRepository: {
    createLeadForProfessional: vi.fn(),
    findRecentLabeledLeadsForService: vi.fn(),
  },
  conversationRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    claimTurn: vi.fn(),
    recordReply: vi.fn(),
    end: vi.fn(),
  },
  visitRepository: { linkVisitsToLead: vi.fn() },
  aiConversationService: {
    nextTurn: vi.fn(),
    buildLabeledExamples: vi.fn(() => []),
    visitorFacingMessage: vi.fn((turn: { message: string }) => turn.message),
  },
  emailService: { sendConversationAllowanceExhaustedProfessional: vi.fn() },
  rateLimit: vi.fn(),
}));

vi.mock("@/server/repositories/profile.repository", () => ({ profileRepository: mocks.profileRepository }));
vi.mock("@/server/repositories/service.repository", () => ({ serviceRepository: mocks.serviceRepository }));
vi.mock("@/server/repositories/booking.repository", () => ({ bookingRepository: mocks.bookingRepository }));
vi.mock("@/server/repositories/qualification-conversation.repository", () => ({
  qualificationConversationRepository: mocks.conversationRepository,
}));
vi.mock("@/server/repositories/visit.repository", () => ({ visitRepository: mocks.visitRepository }));
vi.mock("@/server/services/ai-conversation.service", () => ({ aiConversationService: mocks.aiConversationService }));
vi.mock("@/server/services/email.service", () => ({ emailService: mocks.emailService }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: mocks.rateLimit }));

import { MAX_AI_CALLS_PER_CONVERSATION } from "@/lib/constants";
import { qualificationConversationService } from "@/server/services/qualification-conversation.service";

const PRO_ID = "pro_1";
const SERVICE_ID = "svc_1";

const BASE_INPUT = {
  professionalId: PRO_ID,
  serviceId: SERVICE_ID,
  name: "Sam",
  email: "sam@example.com",
  ip: "203.0.113.7",
  visitorId: "visitor_1",
};

function professional(planTier: "FREE" | "PRO" | "BUSINESS" = "FREE") {
  return { id: PRO_ID, fullName: "Jordan Rivera", title: "Coach", bio: null, planTier };
}

function question(message = "What brings you here?") {
  return { type: "question", message, tokensUsed: 50 };
}

function final(decision: "QUALIFIED" | "REJECTED", extra: Record<string, unknown> = {}) {
  return { type: "final", decision, isStrongFit: false, message: "Decision message.", tokensUsed: 60, ...extra };
}

describe("qualificationConversationService.handleTurn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.profileRepository.findById.mockResolvedValue(professional());
    mocks.serviceRepository.findByIdForProfessional.mockResolvedValue({
      id: SERVICE_ID,
      qualificationMode: "GATEKEEPER",
    });
    mocks.serviceRepository.findActiveByProfessionalId.mockResolvedValue([]);
    mocks.bookingRepository.findRecentLabeledLeadsForService.mockResolvedValue([]);
    mocks.bookingRepository.createLeadForProfessional.mockResolvedValue({ id: "lead_1" });
    mocks.rateLimit.mockResolvedValue({ allowed: true, remaining: 4, resetAt: Date.now() + 1000 });
    mocks.profileRepository.claimConversation.mockResolvedValue(true);
    mocks.conversationRepository.create.mockResolvedValue({ id: "conv_1" });
    mocks.conversationRepository.claimTurn.mockResolvedValue(true);
  });

  describe("starting a conversation", () => {
    it("uses one conversation from the allowance and lets the AI open", async () => {
      mocks.aiConversationService.nextTurn.mockResolvedValue(question("Hi Sam!"));

      const result = await qualificationConversationService.handleTurn(BASE_INPUT);

      expect(mocks.profileRepository.claimConversation).toHaveBeenCalledWith(PRO_ID);
      expect(mocks.aiConversationService.nextTurn).toHaveBeenCalledWith(
        expect.objectContaining({ history: [], visitorName: "Sam" }),
      );
      expect(mocks.conversationRepository.recordReply).toHaveBeenCalledWith({
        id: "conv_1",
        messages: [{ role: "assistant", content: "Hi Sam!" }],
      });
      expect(result).toEqual({ kind: "question", conversationId: "conv_1", message: "Hi Sam!" });
    });

    it("never touches the allowance on an unlimited plan", async () => {
      mocks.profileRepository.findById.mockResolvedValue(professional("BUSINESS"));
      mocks.aiConversationService.nextTurn.mockResolvedValue(question());

      const result = await qualificationConversationService.handleTurn(BASE_INPUT);

      expect(mocks.profileRepository.claimConversation).not.toHaveBeenCalled();
      expect(result.kind).toBe("question");
    });

    it("fails open when the allowance is used up: books unscreened, no AI call, expert emailed once", async () => {
      mocks.profileRepository.claimConversation.mockResolvedValue(false);
      mocks.profileRepository.claimAllowanceExhaustedNotice.mockResolvedValue(true);
      mocks.profileRepository.findByIdWithUser.mockResolvedValue({
        ...professional(),
        user: { email: "jordan@example.com" },
      });

      const result = await qualificationConversationService.handleTurn(BASE_INPUT);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mocks.aiConversationService.nextTurn).not.toHaveBeenCalled();
      expect(mocks.conversationRepository.create).not.toHaveBeenCalled();
      expect(mocks.bookingRepository.createLeadForProfessional).toHaveBeenCalledWith(
        PRO_ID,
        expect.objectContaining({ qualificationResult: "QUALIFIED", isStrongFit: false }),
      );
      expect(mocks.emailService.sendConversationAllowanceExhaustedProfessional).toHaveBeenCalledWith(
        expect.objectContaining({ to: "jordan@example.com", monthlyConversations: 10 }),
      );
      expect(result).toMatchObject({ kind: "final", decision: "QUALIFIED", leadId: "lead_1" });
    });

    it("doesn't email again once this period's notice was already sent", async () => {
      mocks.profileRepository.claimConversation.mockResolvedValue(false);
      mocks.profileRepository.claimAllowanceExhaustedNotice.mockResolvedValue(false);

      await qualificationConversationService.handleTurn(BASE_INPUT);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mocks.emailService.sendConversationAllowanceExhaustedProfessional).not.toHaveBeenCalled();
    });

    it("caps new conversations per visitor before using any allowance", async () => {
      mocks.rateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 1000 });

      const result = await qualificationConversationService.handleTurn(BASE_INPUT);

      expect(mocks.rateLimit).toHaveBeenCalledWith(
        `conversation-start:${PRO_ID}:${BASE_INPUT.ip}`,
        expect.any(Number),
        expect.any(Number),
      );
      expect(mocks.profileRepository.claimConversation).not.toHaveBeenCalled();
      expect(result).toMatchObject({ kind: "error", status: 429 });
    });
  });

  describe("continuing a conversation", () => {
    const STORED = [{ role: "assistant", content: "What brings you here?" }];

    beforeEach(() => {
      mocks.conversationRepository.findById.mockResolvedValue({
        id: "conv_1",
        professionalId: PRO_ID,
        serviceId: SERVICE_ID,
        messages: STORED,
        aiCalls: 1,
        endedAt: null,
      });
    });

    it("builds the gate's history from the server's transcript plus only the new message", async () => {
      mocks.aiConversationService.nextTurn.mockResolvedValue(question("Follow-up?"));

      await qualificationConversationService.handleTurn({
        ...BASE_INPUT,
        conversationId: "conv_1",
        message: "We just raised a seed round.",
      });

      const expected = [...STORED, { role: "user", content: "We just raised a seed round." }];
      expect(mocks.conversationRepository.claimTurn).toHaveBeenCalledWith({
        id: "conv_1",
        expectedAiCalls: 1,
        messages: expected,
      });
      expect(mocks.aiConversationService.nextTurn).toHaveBeenCalledWith(
        expect.objectContaining({ history: expected }),
      );
      // A continuing turn never uses more allowance.
      expect(mocks.profileRepository.claimConversation).not.toHaveBeenCalled();
    });

    it("creates the Lead from the server's transcript and ends the conversation on a decision", async () => {
      mocks.aiConversationService.nextTurn.mockResolvedValue(final("REJECTED"));

      const result = await qualificationConversationService.handleTurn({
        ...BASE_INPUT,
        conversationId: "conv_1",
        message: "We haven't raised yet.",
      });

      expect(mocks.bookingRepository.createLeadForProfessional).toHaveBeenCalledWith(
        PRO_ID,
        expect.objectContaining({
          qualificationResult: "REJECTED",
          answersJson: expect.objectContaining({
            conversationHistory: [...STORED, { role: "user", content: "We haven't raised yet." }],
          }),
        }),
      );
      expect(mocks.conversationRepository.recordReply).toHaveBeenCalledWith(
        expect.objectContaining({ id: "conv_1", leadId: "lead_1", endedAt: expect.any(Date) }),
      );
      expect(mocks.visitRepository.linkVisitsToLead).toHaveBeenCalledWith({
        professionalId: PRO_ID,
        visitorId: "visitor_1",
        leadId: "lead_1",
      });
      expect(result).toMatchObject({ kind: "final", decision: "REJECTED", leadId: "lead_1" });
    });

    it("marks a fail-open decision on the Lead so the expert can tell", async () => {
      mocks.aiConversationService.nextTurn.mockResolvedValue(final("QUALIFIED", { failedOpen: true }));

      await qualificationConversationService.handleTurn({ ...BASE_INPUT, conversationId: "conv_1", message: "Hi" });

      expect(mocks.bookingRepository.createLeadForProfessional).toHaveBeenCalledWith(
        PRO_ID,
        expect.objectContaining({
          answersJson: expect.objectContaining({ autoQualified: true, reason: "ai_unavailable" }),
        }),
      );
    });

    it("refuses a turn another request already claimed, without calling the AI", async () => {
      mocks.conversationRepository.claimTurn.mockResolvedValue(false);

      const result = await qualificationConversationService.handleTurn({
        ...BASE_INPUT,
        conversationId: "conv_1",
        message: "Hello",
      });

      expect(mocks.aiConversationService.nextTurn).not.toHaveBeenCalled();
      expect(result).toMatchObject({ kind: "error", status: 409 });
    });

    it("ends a conversation that hits the AI-call cap instead of continuing it", async () => {
      mocks.conversationRepository.findById.mockResolvedValue({
        id: "conv_1",
        professionalId: PRO_ID,
        serviceId: SERVICE_ID,
        messages: STORED,
        aiCalls: MAX_AI_CALLS_PER_CONVERSATION,
        endedAt: null,
      });

      const result = await qualificationConversationService.handleTurn({
        ...BASE_INPUT,
        conversationId: "conv_1",
        message: "Still going",
      });

      expect(mocks.conversationRepository.end).toHaveBeenCalledWith("conv_1");
      expect(mocks.aiConversationService.nextTurn).not.toHaveBeenCalled();
      expect(mocks.bookingRepository.createLeadForProfessional).not.toHaveBeenCalled();
      expect(result).toMatchObject({ kind: "error", status: 409 });
    });

    it("rejects a conversation that belongs to another professional", async () => {
      const result = await qualificationConversationService.handleTurn({
        ...BASE_INPUT,
        professionalId: "someone_else",
        conversationId: "conv_1",
        message: "Hi",
      });

      expect(result).toMatchObject({ kind: "error", status: 404 });
    });

    it("rejects a conversation that already ended", async () => {
      mocks.conversationRepository.findById.mockResolvedValue({
        id: "conv_1",
        professionalId: PRO_ID,
        serviceId: SERVICE_ID,
        messages: STORED,
        aiCalls: 2,
        endedAt: new Date(),
      });

      const result = await qualificationConversationService.handleTurn({
        ...BASE_INPUT,
        conversationId: "conv_1",
        message: "One more thing",
      });

      expect(result).toMatchObject({ kind: "error", status: 409 });
    });
  });
});
