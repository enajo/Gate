import "server-only";

import type { EmailLoginCode, User } from "@prisma/client";
import { db } from "@/lib/db";

export const emailLoginCodeRepository = {
  async findByEmail(email: string): Promise<EmailLoginCode | null> {
    return db.emailLoginCode.findUnique({ where: { email } });
  },

  /** Replaces any previous code for this email, so only the newest one works. */
  async upsertForEmail(data: {
    email: string;
    codeHash: string;
    expiresAt: Date;
  }): Promise<EmailLoginCode> {
    return db.emailLoginCode.upsert({
      where: { email: data.email },
      create: data,
      update: {
        codeHash: data.codeHash,
        expiresAt: data.expiresAt,
        attempts: 0,
        createdAt: new Date(),
      },
    });
  },

  /** Counts a wrong guess, but only while the code is still under the cap. */
  async recordFailedAttempt(id: string, maxAttempts: number): Promise<void> {
    await db.emailLoginCode.updateMany({
      where: { id, attempts: { lt: maxAttempts } },
      data: { attempts: { increment: 1 } },
    });
  },

  /**
   * Single-use: deletes the row only if it still holds this exact hash.
   * Returns false if another request already used (or replaced) it.
   */
  async consume(id: string, codeHash: string): Promise<boolean> {
    const result = await db.emailLoginCode.deleteMany({ where: { id, codeHash } });
    return result.count === 1;
  },

  async deleteById(id: string): Promise<void> {
    await db.emailLoginCode.deleteMany({ where: { id } });
  },

  /** Owning the inbox proves the address, so a successful code verifies it. */
  async upsertVerifiedUser(email: string): Promise<User> {
    return db.user.upsert({
      where: { email },
      update: { emailVerified: new Date() },
      create: { email, name: email.split("@")[0], emailVerified: new Date() },
    });
  },
};
