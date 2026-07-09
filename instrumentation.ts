export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Runs once at server startup on the Node.js runtime.
    // Importing env triggers the Zod validation — if any required var is
    // missing the server throws immediately with a clear message instead of
    // failing silently on the first request that needs the missing value.
    await import("@/lib/env");
  }
}
