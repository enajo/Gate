import "server-only";

import type { Prisma, QualificationConversation } from "@prisma/client";

import { db } from "@/lib/db";

export const qualificationConversationRepository = {
  async create(data: {
    professionalId: string;
    serviceId: string;
  }): Promise<QualificationConversation> {
    return db.qualificationConversation.create({ data });
  },

  async findById(id: string): Promise<QualificationConversation | null> {
    return db.qualificationConversation.findUnique({ where: { id } });
  },

  /**
   * Claims the next AI call on a conversation: records the visitor's new
   * messages and bumps aiCalls, but only if nobody else advanced it since it
   * was read (aiCalls still equals `expectedAiCalls`) and it hasn't ended.
   * false means a concurrent request won — the caller must not call the AI.
   */
  async claimTurn(params: {
    id: string;
    expectedAiCalls: number;
    messages: Prisma.InputJsonValue;
  }): Promise<boolean> {
    const { count } = await db.qualificationConversation.updateMany({
      where: { id: params.id, aiCalls: params.expectedAiCalls, endedAt: null },
      data: { messages: params.messages, aiCalls: { increment: 1 } },
    });
    return count > 0;
  },

  async recordReply(params: {
    id: string;
    messages: Prisma.InputJsonValue;
    endedAt?: Date;
    leadId?: string;
  }): Promise<void> {
    await db.qualificationConversation.update({
      where: { id: params.id },
      data: {
        messages: params.messages,
        endedAt: params.endedAt,
        leadId: params.leadId,
      },
    });
  },

  async end(id: string): Promise<void> {
    await db.qualificationConversation.updateMany({
      where: { id, endedAt: null },
      data: { endedAt: new Date() },
    });
  },
};
