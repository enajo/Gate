"use client";

import * as React from "react";
import { ArrowRight, Sparkles } from "lucide-react";

// ── Scripted content ─────────────────────────────────────────────────────────
// Deliberately not the real qualification API — this is a public, anonymous
// marketing page, and a live AI call here would be a cost/abuse surface for
// zero benefit. The real thing lives inside every gate.
//
// Deliberately only the opening exchange, not the full conversation — the
// How It Works section (components/marketing/how-it-works-section.tsx)
// picks up this exact same conversation from here through to the decision,
// so the two don't tell two different stories with two different visitors.

type ScriptMessage = {
  role: "gate" | "visitor";
  content: string;
};

const SCRIPT: ScriptMessage[] = [
  { role: "gate", content: "What are you hoping to get out of a session with Josef?" },
  { role: "visitor", content: "I have a final-round PM interview in 9 days and keep failing the case study." },
];

const TYPING_DELAY_MS = 900;
const MESSAGE_GAP_MS = 1400;
const REVEAL_DELAY_MS = 1100;
const RESTART_DELAY_MS = 4500;

// ── Component ─────────────────────────────────────────────────────────────────

export function HeroQualificationTeaser() {
  const [visibleCount, setVisibleCount] = React.useState(0);
  const [isTyping, setIsTyping] = React.useState(false);
  const [reducedMotion, setReducedMotion] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);
  }, []);

  React.useEffect(() => {
    if (reducedMotion) {
      // Skip the whole staged sequence — show the finished exchange
      // immediately, no timers, no motion.
      setVisibleCount(SCRIPT.length);
      return;
    }

    let cancelled = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    function playSequence() {
      setVisibleCount(0);
      setIsTyping(false);

      SCRIPT.forEach((_, index) => {
        const arriveAt = index * MESSAGE_GAP_MS;

        timeouts.push(
          setTimeout(() => {
            if (cancelled) return;
            setIsTyping(true);
          }, arriveAt),
        );

        timeouts.push(
          setTimeout(() => {
            if (cancelled) return;
            setIsTyping(false);
            setVisibleCount(index + 1);
          }, arriveAt + TYPING_DELAY_MS),
        );
      });

      const lastArrival = (SCRIPT.length - 1) * MESSAGE_GAP_MS + TYPING_DELAY_MS;

      // A trailing typing indicator, with no reply ever shown — the
      // conversation keeps going, it just continues in the How It Works
      // section below rather than finishing here.
      timeouts.push(
        setTimeout(() => {
          if (!cancelled) setIsTyping(true);
        }, lastArrival + REVEAL_DELAY_MS),
      );

      timeouts.push(
        setTimeout(() => {
          if (!cancelled) playSequence();
        }, lastArrival + REVEAL_DELAY_MS + RESTART_DELAY_MS),
      );
    }

    playSequence();

    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
    };
  }, [reducedMotion]);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [visibleCount, isTyping]);

  return (
    <div className="mx-auto w-full max-w-md overflow-hidden rounded-[1.75rem] border border-warm-border/80 bg-white/70 shadow-warm-lg backdrop-blur">
      <div className="flex items-center gap-2.5 border-b border-warm-border/70 px-5 py-4">
        <span className="flex size-7 items-center justify-center rounded-full bg-ink">
          <Sparkles className="size-3.5 text-[#8C2A47]" />
        </span>
        <div>
          <p className="text-[13px] font-medium text-ink">Josef&apos;s Gate</p>
          <p className="text-[11px] text-gray-400">Screening before booking</p>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="h-[260px] space-y-3 overflow-y-auto px-5 py-5"
      >
        {SCRIPT.slice(0, visibleCount).map((message, index) => (
          <div
            key={index}
            className={`teaser-message-in flex ${
              message.role === "visitor" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={
                message.role === "visitor"
                  ? "max-w-[82%] rounded-[1.1rem] rounded-tr-sm bg-ink px-4 py-2.5 text-[13px] leading-6 text-white"
                  : "max-w-[82%] rounded-[1.1rem] rounded-tl-sm border border-warm-border-soft bg-white px-4 py-2.5 text-[13px] leading-6 text-ink"
              }
            >
              {message.content}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-[1.1rem] rounded-tl-sm border border-warm-border-soft bg-white px-4 py-3">
              <span className="size-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:0ms]" />
              <span className="size-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:150ms]" />
              <span className="size-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:300ms]" />
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-warm-border/70 px-5 py-4">
        {/* Plain <a>, not next/link — a same-page hash anchor, and
            next/link's App Router click handler routes even a bare "#id"
            href through a full navigation dispatch instead of a reliable
            native hash-scroll. */}
        <a
          href="#how-it-works"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-soft transition hover:text-ink"
        >
          See how this works
          <ArrowRight className="size-3.5" />
        </a>
      </div>
    </div>
  );
}
