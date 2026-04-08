import { expireHoldsJob } from "@/server/jobs/expire-holds.job";

async function main() {
  console.log("🧹 Cleaning expired booking holds...");

  const result = await expireHoldsJob();

  console.log("✅ Expired holds cleanup complete");
  console.log({
    expiredCount: result.expiredCount,
    expiredHoldIds: result.expiredHoldIds,
    startedAt: result.startedAt,
    finishedAt: result.finishedAt,
  });
}

main().catch((error) => {
  console.error("❌ Failed to clean expired holds");
  console.error(error);
  process.exit(1);
});