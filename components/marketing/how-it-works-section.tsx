"use client";

import * as React from "react";
import { CircleCheck } from "lucide-react";

// ── Scroll-linked steps, not autoplay or scroll-jacked ───────────────────────
// Each step is a normal block in the document; an IntersectionObserver just
// watches which one is nearest the vertical center of the viewport and marks
// it active. Scroll speed is never touched, so it never fights the user.
// With JS or motion disabled, everything above still reads top-to-bottom as
// plain static content - step 0's visual is the server-rendered default.

type Step = {
  id: string;
  title: string;
  description: string;
};

const STEPS: Step[] = [
  {
    id: "lands",
    title: "A visitor asks to book",
    description:
      "They land on your gate page and request a time — no calendar shown yet.",
  },
  {
    id: "asks",
    title: "Gate asks your questions",
    description:
      "A real conversation, not a form. You set the questions once; Gate runs them for every visitor.",
  },
  {
    id: "decides",
    title: "Gate decides",
    description:
      "Qualified, redirected, or rejected — automatically, before your calendar is ever shown.",
  },
  {
    id: "books",
    title: "Only qualified visitors book",
    description:
      "Accepted visitors see your real availability and lock in a time themselves.",
  },
];

function LandsVisual() {
  return (
    <div className="mx-auto w-full max-w-sm overflow-hidden rounded-card border border-warm-border/80 bg-white/80 shadow-warm-lg">
      <div className="flex h-8 items-center gap-2 border-b border-warm-border px-4">
        <span className="size-2.5 rounded-full bg-brand-amber/50" />
        <span className="size-2.5 rounded-full bg-warm-gray/35" />
        <span className="size-2.5 rounded-full bg-slate-300" />
      </div>
      <div className="space-y-4 p-7">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-ink text-[13px] font-medium text-white">
            J
          </span>
          <div>
            <p className="text-[13px] font-medium text-ink">Josef Álvarez</p>
            <p className="text-[11px] text-gray-400">Fractional CTO</p>
          </div>
        </div>
        <div className="h-2 w-4/5 rounded-full bg-warm-stone" />
        <div className="h-2 w-3/5 rounded-full bg-warm-stone" />
        <div className="mt-2 rounded-xl bg-ink-soft py-2.5 text-center text-[13px] text-white">
          Request a time
        </div>
      </div>
    </div>
  );
}

function AsksVisual() {
  return (
    <div className="mx-auto w-full max-w-sm space-y-3 overflow-hidden rounded-card border border-warm-border/80 bg-white/80 p-7 shadow-warm-lg">
      <div className="flex justify-start">
        <div className="max-w-[85%] rounded-[1.1rem] rounded-tl-sm border border-warm-border-soft bg-white px-4 py-2.5 text-[13px] leading-6 text-ink">
          What are you hoping to get out of this session?
        </div>
      </div>
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-[1.1rem] rounded-tr-sm bg-ink px-4 py-2.5 text-[13px] leading-6 text-white">
          I need help fixing a broken hiring pipeline before Q3.
        </div>
      </div>
      <div className="flex justify-start">
        <div className="flex items-center gap-1 rounded-[1.1rem] rounded-tl-sm border border-warm-border-soft bg-white px-4 py-3">
          <span className="size-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:0ms]" />
          <span className="size-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:150ms]" />
          <span className="size-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

function DecidesVisual() {
  const outcomes = [
    { label: "Qualified", tone: "bg-success/10 text-success border-success/30" },
    { label: "Redirected", tone: "bg-brand-amber/10 text-brand-amber border-brand-amber/30" },
    { label: "Rejected", tone: "bg-gray-500/10 text-gray-500 border-gray-400/30" },
  ];

  return (
    <div className="mx-auto w-full max-w-sm rounded-card border border-warm-border/80 bg-white/80 p-8 text-left shadow-warm-lg">
      <p className="text-[13px] text-gray-500">Decision</p>

      <div className="mt-4 space-y-2.5">
        {outcomes.map((item) => (
          <div
            key={item.label}
            className={`inline-flex items-center rounded-full border px-4 py-1.5 text-[12px] font-medium ${item.tone}`}
          >
            {item.label}
          </div>
        ))}
      </div>

      <p className="mt-7 text-[13px] leading-6 text-gray-500">
        Every visitor gets exactly one of these outcomes — automatically.
      </p>
    </div>
  );
}

function BooksVisual() {
  return (
    <div className="mx-auto w-full max-w-sm rounded-card border border-warm-border/80 bg-white/80 p-7 text-left shadow-warm-lg">
      <p className="text-sm font-medium text-ink">Calendar Access</p>
      <p className="mt-4 text-[13px] text-gray-500">Select a time</p>

      <div className="mt-4 rounded-2xl border border-warm-stone p-4">
        <div className="flex items-center justify-between text-[12px] text-ink">
          <span>May 2026</span>
          <span>›</span>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-2 text-center text-[11px] text-gray-500">
          {[
            "S", "M", "T", "W", "T", "F", "S",
            ...Array.from({ length: 31 }, (_, i) => String(i + 1)),
          ].map((day, index) => (
            <span
              key={`${day}-${index}`}
              className={
                day === "14" ? "rounded-lg bg-brand-amber py-1 text-ink" : "py-1"
              }
            >
              {day}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-[12px] text-success">
        <CircleCheck className="size-3.5" />
        Access granted
      </div>
    </div>
  );
}

const VISUALS: Record<string, React.ComponentType> = {
  lands: LandsVisual,
  asks: AsksVisual,
  decides: DecidesVisual,
  books: BooksVisual,
};

export function HowItWorksSection() {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const stepRefs = React.useRef<Array<HTMLDivElement | null>>([]);

  React.useEffect(() => {
    // The observer is only a cheap "something moved, recompute" trigger — the
    // active step itself is decided by directly measuring which step's center
    // is nearest the viewport center. Relying on isIntersecting order instead
    // breaks under a fast scroll: a single batch can report several steps as
    // intersecting at once, and whichever happened to be last in that
    // (unordered) batch would win instead of the one actually centered.
    function pickClosestStep() {
      const viewportCenter = window.innerHeight / 2;
      let closestIndex = 0;
      let closestDistance = Infinity;

      stepRefs.current.forEach((el, index) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const distance = Math.abs(rect.top + rect.height / 2 - viewportCenter);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      setActiveIndex(closestIndex);
    }

    const observer = new IntersectionObserver(pickClosestStep, {
      threshold: [0, 0.25, 0.5, 0.75, 1],
    });

    for (const el of stepRefs.current) {
      if (el) observer.observe(el);
    }

    pickClosestStep();

    return () => observer.disconnect();
  }, []);

  const ActiveVisual = VISUALS[STEPS[activeIndex].id];

  return (
    <section id="how-it-works" className="relative px-4 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs uppercase tracking-[0.26em] text-brand-amber">
          How it works
        </p>

        <h2
          style={{ fontFamily: "var(--font-display)" }}
          className="mt-4 text-[32px] font-medium leading-tight tracking-[-0.01em] sm:text-[42px]"
        >
          What happens when someone tries to book you.
        </h2>
      </div>

      <div className="mx-auto mt-16 grid max-w-5xl gap-10 md:grid-cols-2">
        <div className="order-2 md:order-1">
          {STEPS.map((step, index) => (
            <div
              key={step.id}
              ref={(el) => {
                stepRefs.current[index] = el;
              }}
              className="flex min-h-[40vh] flex-col justify-center border-l-2 py-8 pl-6 transition-colors duration-300 md:min-h-[55vh]"
              style={{
                borderColor:
                  index === activeIndex
                    ? "var(--color-brand-amber)"
                    : "var(--color-warm-border-soft)",
              }}
            >
              <p
                className="font-mono text-[11px] uppercase tracking-[0.2em] transition-colors duration-300"
                style={{
                  color:
                    index === activeIndex
                      ? "var(--color-brand-amber)"
                      : "var(--color-text-subtle)",
                }}
              >
                Step {index + 1}
              </p>

              <h3
                className="mt-3 text-[24px] font-medium tracking-[-0.02em] transition-opacity duration-300"
                style={{
                  fontFamily: "var(--font-display)",
                  opacity: index === activeIndex ? 1 : 0.4,
                }}
              >
                {step.title}
              </h3>

              <p
                className="mt-3 max-w-sm text-[15px] leading-6 transition-opacity duration-300"
                style={{
                  color: "var(--color-text-muted)",
                  opacity: index === activeIndex ? 1 : 0.4,
                }}
              >
                {step.description}
              </p>
            </div>
          ))}
        </div>

        <div className="order-1 md:order-2">
          <div className="md:sticky md:top-28 md:flex md:min-h-[60vh] md:items-center md:justify-center">
            <ActiveVisual />
          </div>
        </div>
      </div>
    </section>
  );
}
