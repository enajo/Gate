export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Initialise Sentry before the env validation so uncaught startup errors
    // are reported even if the env check itself throws.
    await import("./sentry.server.config");
    // Importing env triggers the Zod validation — if any required var is
    // missing the server throws immediately with a clear message instead of
    // failing silently on the first request that needs the missing value.
    await import("@/lib/env");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Automatically captures unhandled server-side request errors in Next.js 15+.
export const onRequestError = async (
  ...args: Parameters<typeof import("@sentry/nextjs").captureRequestError>
) => {
  const { captureRequestError } = await import("@sentry/nextjs");
  captureRequestError(...args);
};
