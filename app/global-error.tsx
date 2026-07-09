"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

// global-error.tsx wraps the root layout — it must supply <html> and <body>.
export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-center text-foreground">
        <h2 className="text-xl font-semibold">Something went wrong</h2>
        <p className="text-sm text-muted-foreground">
          An unexpected error occurred. The team has been notified.
        </p>
        <button
          onClick={reset}
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
