-- Increase default token balance to 10,000 and reset all existing accounts
ALTER TABLE "professionals" ALTER COLUMN "token_balance" SET DEFAULT 10000;
UPDATE "professionals" SET "token_balance" = 10000;
