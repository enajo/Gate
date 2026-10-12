-- Meter AI screening by conversations, not tokens. Renamed rather than
-- dropped so existing rows keep their reset date.
ALTER TABLE "professionals" RENAME COLUMN "token_balance" TO "conversation_balance";
ALTER TABLE "professionals" RENAME COLUMN "token_balance_reset_at" TO "conversation_balance_reset_at";
ALTER TABLE "professionals" ALTER COLUMN "conversation_balance" SET DEFAULT 10;
ALTER TABLE "professionals" ADD COLUMN "allowance_exhausted_notified_at" TIMESTAMP(3);

-- Old values were token counts; start everyone on their tier's monthly
-- conversation allowance (BUSINESS is unlimited, so its value is ignored).
UPDATE "professionals" SET "conversation_balance" = CASE "plan_tier"
  WHEN 'PRO' THEN 100
  WHEN 'BUSINESS' THEN 0
  ELSE 10
END;

-- CreateTable
CREATE TABLE "qualification_conversations" (
    "id" TEXT NOT NULL,
    "professional_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "messages" JSONB NOT NULL DEFAULT '[]',
    "ai_calls" INTEGER NOT NULL DEFAULT 0,
    "ended_at" TIMESTAMP(3),
    "lead_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qualification_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limit_counters" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "reset_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limit_counters_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "qualification_conversations_lead_id_key" ON "qualification_conversations"("lead_id");
CREATE INDEX "qualification_conversations_professional_id_created_at_idx" ON "qualification_conversations"("professional_id", "created_at");
CREATE INDEX "rate_limit_counters_reset_at_idx" ON "rate_limit_counters"("reset_at");

-- AddForeignKey
ALTER TABLE "qualification_conversations" ADD CONSTRAINT "qualification_conversations_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
