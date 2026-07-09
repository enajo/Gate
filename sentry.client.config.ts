import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Capture 10% of traces in production; adjust per traffic volume.
  tracesSampleRate: 0.1,

  // Session replay: capture all replays on error, 10% of normal sessions.
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,

  integrations: [Sentry.replayIntegration()],

  // Silence noisy console output in dev.
  debug: false,
});
