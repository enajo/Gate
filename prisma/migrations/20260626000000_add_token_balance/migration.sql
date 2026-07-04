-- Migration: add_token_balance
-- Adds an AI token balance counter to the professionals table.
-- Each professional starts with 1000 tokens. The conversational
-- qualification gate deducts tokens per API call. When the balance
-- hits zero the gate fails open (auto-qualifies) so no visitor is
-- ever blocked due to an exhausted budget.

ALTER TABLE "professionals"
  ADD COLUMN "token_balance" INTEGER NOT NULL DEFAULT 1000;
