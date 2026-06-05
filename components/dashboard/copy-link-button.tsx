"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

function writeToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  return new Promise((resolve, reject) => {
    const el = document.createElement("textarea");
    el.value = text;
    el.style.cssText = "position:fixed;top:0;left:0;opacity:0;";
    document.body.appendChild(el);
    el.focus();
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    ok ? resolve() : reject(new Error("copy failed"));
  });
}

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await writeToClipboard(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex h-10 items-center justify-center rounded-full border border-warm-border-soft px-4 text-[13px] text-ink transition hover:border-ink-soft"
    >
      {copied ? (
        <Check className="mr-2 size-4 text-green-500" />
      ) : (
        <Copy className="mr-2 size-4" />
      )}
      {copied ? "Copied!" : "Copy link"}
    </button>
  );
}
