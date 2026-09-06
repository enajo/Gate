"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";

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

const POSITIONS = [
  { value: "bottom-right", label: "Bottom right" },
  { value: "bottom-left", label: "Bottom left" },
] as const;

const EMBED_TYPES = [
  { value: "button", label: "Floating button" },
  { value: "inline", label: "Inline on page" },
] as const;

export function EmbedSnippetBuilder({
  slug,
  baseUrl,
}: {
  slug: string;
  baseUrl: string;
}) {
  const [embedType, setEmbedType] = React.useState<(typeof EMBED_TYPES)[number]["value"]>(
    "button",
  );
  const [buttonText, setButtonText] = React.useState("Book a call");
  const [accentColor, setAccentColor] = React.useState("#dfa767");
  const [position, setPosition] = React.useState<(typeof POSITIONS)[number]["value"]>(
    "bottom-right",
  );
  const [copied, setCopied] = React.useState(false);

  const isInline = embedType === "inline";

  const snippet = React.useMemo(() => {
    const attrs = isInline
      ? [
          `data-gate-slug="${slug}"`,
          `data-gate-color="${accentColor}"`,
          `data-gate-mode="inline"`,
        ]
      : [
          `data-gate-slug="${slug}"`,
          `data-gate-text="${buttonText.replace(/"/g, "&quot;")}"`,
          `data-gate-color="${accentColor}"`,
          `data-gate-position="${position}"`,
        ];

    return `<script async src="${baseUrl}/embed.js"\n  ${attrs.join("\n  ")}></script>`;
  }, [slug, buttonText, accentColor, position, baseUrl, isInline]);

  const inlineDivSnippet = "<div data-gate-inline></div>";

  const [divCopied, setDivCopied] = React.useState(false);

  async function handleCopy() {
    try {
      await writeToClipboard(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  async function handleCopyDiv() {
    try {
      await writeToClipboard(inlineDivSnippet);
      setDivCopied(true);
      setTimeout(() => setDivCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div>
      <div>
        <label className="text-[12px] font-medium text-gray-600">
          Embed type
        </label>
        <div className="mt-1.5 flex gap-2">
          {EMBED_TYPES.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setEmbedType(opt.value)}
              className={`inline-flex h-9 items-center rounded-full border px-4 text-[13px] font-medium transition ${
                embedType === opt.value
                  ? "border-ink bg-ink text-white"
                  : "border-warm-border-soft bg-white text-gray-600 hover:border-ink/40"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        {!isInline && (
          <div>
            <label className="text-[12px] font-medium text-gray-600">
              Button text
            </label>
            <input
              value={buttonText}
              onChange={(e) => setButtonText(e.target.value.slice(0, 40))}
              className="mt-1.5 w-full rounded-full border border-warm-border-soft bg-white px-4 py-2 text-[13px] outline-none focus:border-ink/40"
            />
          </div>
        )}

        <div>
          <label className="text-[12px] font-medium text-gray-600">
            Accent color
          </label>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="h-9 w-11 shrink-0 cursor-pointer rounded-full border border-warm-border-soft bg-white p-1"
            />
            <input
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="w-full rounded-full border border-warm-border-soft bg-white px-4 py-2 text-[13px] outline-none focus:border-ink/40"
            />
          </div>
        </div>

        {!isInline && (
          <div className="sm:col-span-2">
            <label className="text-[12px] font-medium text-gray-600">
              Button position
            </label>
            <div className="mt-1.5 flex gap-2">
              {POSITIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPosition(opt.value)}
                  className={`inline-flex h-9 items-center rounded-full border px-4 text-[13px] font-medium transition ${
                    position === opt.value
                      ? "border-ink bg-ink text-white"
                      : "border-warm-border-soft bg-white text-gray-600 hover:border-ink/40"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <label className="text-[12px] font-medium text-gray-600">
            Paste this before your page&apos;s closing &lt;/body&gt; tag
          </label>
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="inline-flex h-8 items-center rounded-full border border-warm-border-soft px-3 text-[12px] font-medium text-ink transition hover:border-ink-soft"
          >
            {copied ? (
              <Check className="mr-1.5 size-3.5 text-green-500" />
            ) : (
              <Copy className="mr-1.5 size-3.5" />
            )}
            {copied ? "Copied!" : "Copy snippet"}
          </button>
        </div>
        <pre className="mt-2 overflow-x-auto rounded-[1rem] border border-warm-border-soft bg-ink px-4 py-3.5 text-[12.5px] leading-6 text-white/90">
          <code>{snippet}</code>
        </pre>
      </div>

      {isInline && (
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <label className="text-[12px] font-medium text-gray-600">
              Then place this wherever you want the widget to appear
            </label>
            <button
              type="button"
              onClick={() => void handleCopyDiv()}
              className="inline-flex h-8 items-center rounded-full border border-warm-border-soft px-3 text-[12px] font-medium text-ink transition hover:border-ink-soft"
            >
              {divCopied ? (
                <Check className="mr-1.5 size-3.5 text-green-500" />
              ) : (
                <Copy className="mr-1.5 size-3.5" />
              )}
              {divCopied ? "Copied!" : "Copy snippet"}
            </button>
          </div>
          <pre className="mt-2 overflow-x-auto rounded-[1rem] border border-warm-border-soft bg-ink px-4 py-3.5 text-[12.5px] leading-6 text-white/90">
            <code>{inlineDivSnippet}</code>
          </pre>
        </div>
      )}

      <p className="mt-4 text-[12px] leading-6 text-gray-400">
        {isInline ? (
          <>
            Embedding more than one professional on the same page? Give each
            div its own slug:{" "}
            <code className="rounded bg-warm-border-soft px-1.5 py-0.5">
              data-gate-inline=&quot;other-professional-slug&quot;
            </code>
            .
          </>
        ) : (
          <>
            Prefer to trigger it from your own button instead of the floating
            one? Add{" "}
            <code className="rounded bg-warm-border-soft px-1.5 py-0.5">
              data-gate-mode=&quot;manual&quot;
            </code>{" "}
            to the script tag, then put{" "}
            <code className="rounded bg-warm-border-soft px-1.5 py-0.5">
              data-gate-open=&quot;{slug}&quot;
            </code>{" "}
            on any element on your page — clicking it opens the same widget.
          </>
        )}
      </p>
    </div>
  );
}
