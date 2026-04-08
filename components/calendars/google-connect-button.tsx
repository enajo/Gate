"use client";

import * as React from "react";
import { CalendarDays, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export interface GoogleConnectButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  returnTo?: string;
  nonce?: string;
  onConnectedUrl?: (url: string) => void;
  onError?: (message: string) => void;
}

export function GoogleConnectButton({
  returnTo = "/app/calendars",
  nonce,
  onConnectedUrl,
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          returnTo,
          nonce,
        }),
      });

      const data = (await response.json()) as
        | { authorizationUrl?: string; error?: string }
        | undefined;

      if (!response.ok || !data?.authorizationUrl) {
        throw new Error(data?.error || "Failed to start Google connection.");
      }

      onConnectedUrl?.(data.authorizationUrl);
      window.location.href = data.authorizationUrl;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to start Google connection.";

      onError?.(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button
      type="button"
      onClick={handleConnect}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Connecting...
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