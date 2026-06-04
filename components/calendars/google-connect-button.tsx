"use client";

import * as React from "react";
import { CalendarDays, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export interface GoogleConnectButtonProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    "onClick" | "onError"
  > {
  returnTo?: string;
  nonce?: string;
  /** Called after the popup closes and OAuth completed (success or fail). */
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

function openAuthPopup(
  authorizationUrl: string,
  onDone: () => void,
): void {
  const w = 500;
  const h = 660;
  const left = Math.round(window.screenX + (window.outerWidth - w) / 2);
  const top = Math.round(window.screenY + (window.outerHeight - h) / 2);

  const popup = window.open(
    authorizationUrl,
    "google-oauth",
    `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes`,
  );

  if (!popup) {
    // Popup blocked — fall back to full redirect
    window.location.href = authorizationUrl;
    return;
  }

  // Primary: listen for postMessage from the popup page
  function handleMessage(event: MessageEvent) {
    if (
      event.origin === window.location.origin &&
      (event.data as { type?: string })?.type === "GOOGLE_AUTH_COMPLETE"
    ) {
      cleanup();
      onDone();
    }
  }

  // Fallback: poll for popup close (covers cases where postMessage isn't sent)
  const pollInterval = setInterval(() => {
    if (popup.closed) {
      cleanup();
      onDone();
    }
  }, 600);

  function cleanup() {
    clearInterval(pollInterval);
    window.removeEventListener("message", handleMessage);
  }

  window.addEventListener("message", handleMessage);
}

export function GoogleConnectButton({
  returnTo = "/app/oauth/close",
  nonce,
  onSuccess,
  onError,
  disabled,
  ...props
}: GoogleConnectButtonProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  async function handleConnect() {
    setIsLoading(true);

    try {
      const response = await fetch("/api/app/google/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnTo, nonce }),
      });

      const data = (await response.json()) as
        | { authorizationUrl?: string; error?: string }
        | undefined;

      if (!response.ok || !data?.authorizationUrl) {
        throw new Error(data?.error ?? "Failed to start Google connection.");
      }

      openAuthPopup(data.authorizationUrl, () => {
        setIsLoading(false);
        onSuccess?.();
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to start Google connection.";
      onError?.(message);
      setIsLoading(false);
    }
  }

  return (
    <Button
      type="button"
      onClick={() => void handleConnect()}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Connecting…
        </>
      ) : (
        <>
          <CalendarDays className="size-4" />
          Connect Google Calendar
        </>
      )}
    </Button>
  );
}
