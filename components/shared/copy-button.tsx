"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";

export interface CopyButtonProps extends Omit<ButtonProps, "onClick"> {
  value: string;
  copiedLabel?: string;
  idleLabel?: string;
  resetAfterMs?: number;
  onCopied?: (value: string) => void;
  onError?: (error: Error) => void;
}

export function CopyButton({
  value,
  copiedLabel = "Copied",
  idleLabel = "Copy",
  resetAfterMs = 2000,
  onCopied,
  onError,
  variant = "outline",
  size = "sm",
  disabled,
  children,
  ...props
}: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false);
  const timeoutRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  async function handleCopy() {
    if (!value || disabled) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);

      setCopied(true);
      onCopied?.(value);

      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        setCopied(false);
      }, resetAfterMs);
    } catch (error) {
      onError?.(
        error instanceof Error ? error : new Error("Failed to copy value."),
      );
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleCopy}
      disabled={disabled}
      {...props}
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {children ?? (copied ? copiedLabel : idleLabel)}
    </Button>
  );
}