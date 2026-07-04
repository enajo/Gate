"use client";

import * as React from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Edit3,
  Loader2,
  Send,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Types ─────────────────────────────────────────────────────────────────────

export type GateSetupAnswers = {
  q1: string;
  q2: string;
  q3: string;
  q4: string;
  extra: string;
};

type SampleMessage = {
  role: "assistant" | "visitor";
  content: string;
};

type CompileResult = {
  compiledPrompt: string;
  sampleConversation: SampleMessage[];
};

type ChatMessage = {
  id: string;
  role: "ai" | "user";
  content: string;
};

export type GateSetupProps = {
  serviceId: string;
  serviceName?: string;
  initialAnswers?: Partial<GateSetupAnswers>;
  initialPrompt?: string | null;
  onSave: (compiledPrompt: string, answers: GateSetupAnswers) => Promise<void>;
  onCancel?: () => void;
  /** Extra context passed to compile API when service may not be in DB yet (control room drafts). */
  serviceTitle?: string;
  /** Start directly in the edit phase — used when the gate is already configured. */
  initialPhase?: "chat" | "edit";
};

// ── Questions ─────────────────────────────────────────────────────────────────

const QUESTIONS = [
  "What do people usually come to you for? What do you help them fix or achieve, and what does success look like when the work is done?",
  "What was happening in your clients' world before they contacted you? What wasn't working, or what made them decide they needed help right then?",
  "Think about your last two or three favourite clients. What did they have in common — their business, team size, goals, mindset, or budget?",
  "Who are the people who reach out but turn out to be the wrong fit? What patterns have you noticed — things that look right on the surface but never work out?",
  "Is there anything else we should know — deal-breakers, how you prefer to work, or what makes someone a perfect fit? You can skip this one.",
];

const ANSWER_KEYS: (keyof GateSetupAnswers)[] = ["q1", "q2", "q3", "q4", "extra"];

let _id = 0;
function uid() {
  return String(++_id);
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GateSetup({
  serviceId,
  serviceName,
  serviceTitle,
  initialAnswers,
  initialPrompt,
  onSave,
  onCancel,
  initialPhase = "chat",
}: GateSetupProps) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const [currentStep, setCurrentStep] = React.useState(-1);
  const [answers, setAnswers] = React.useState<GateSetupAnswers>({
    q1: initialAnswers?.q1 ?? "",
    q2: initialAnswers?.q2 ?? "",
    q3: initialAnswers?.q3 ?? "",
    q4: initialAnswers?.q4 ?? "",
    extra: initialAnswers?.extra ?? "",
  });
  const [phase, setPhase] = React.useState<"chat" | "compiling" | "preview" | "edit">(
    initialPhase === "edit" ? "edit" : "chat",
  );
  const [result, setResult] = React.useState<CompileResult | null>(null);
  const [editedPrompt, setEditedPrompt] = React.useState(initialPrompt ?? "");
  const [compileError, setCompileError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const initialized = React.useRef(false);

  // Auto-scroll to bottom whenever messages or typing state changes
  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isTyping]);

  // Boot: intro message → first question (skipped when starting in edit mode)
  React.useEffect(() => {
    if (initialized.current || initialPhase === "edit") return;
    initialized.current = true;

    setIsTyping(true);
    const t = setTimeout(() => {
      setIsTyping(false);
      const intro = serviceName
        ? `Let's build the qualification gate for your "${serviceName}" service. I'll ask you 4 quick questions, then compile your custom screening criteria.`
        : "Let's build your qualification gate. I'll ask you 4 questions, then compile your custom screening criteria.";
      setMessages([{ id: uid(), role: "ai", content: intro }]);
      setCurrentStep(0);
    }, 900);

    return () => {
      clearTimeout(t);
      // Reset so React StrictMode's double-invoke doesn't leave the typing
      // indicator stuck with no messages.
      setIsTyping(false);
      initialized.current = false;
    };
  }, [serviceName, initialPhase]);

  // Ask each question after step advances
  React.useEffect(() => {
    if (currentStep < 0 || currentStep > 4 || initialPhase === "edit") return;

    setIsTyping(true);
    const delay = currentStep === 0 ? 700 : 600;
    const t = setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: "ai", content: QUESTIONS[currentStep] ?? "" },
      ]);

      const key = ANSWER_KEYS[currentStep];
      if (key && initialAnswers?.[key]) {
        setInputValue(initialAnswers[key] ?? "");
      } else {
        setInputValue("");
      }

      setTimeout(() => inputRef.current?.focus(), 60);
    }, delay);

    return () => {
      clearTimeout(t);
      setIsTyping(false);
    };
  }, [currentStep]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSend(skip = false) {
    if (currentStep < 0 || currentStep > 4 || isTyping) return;

    const key = ANSWER_KEYS[currentStep];
    const value = skip ? "" : inputValue.trim();

    if (!skip && value.length < 10) return;

    if (key) setAnswers((prev) => ({ ...prev, [key]: value }));

    setMessages((prev) => [
      ...prev,
      { id: uid(), role: "user", content: skip ? "Skip" : value },
    ]);
    setInputValue("");
    // Reset textarea height after sending
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    if (currentStep < 4) {
      setCurrentStep((s) => s + 1);
    } else {
      setCurrentStep(5);
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: "ai",
            content:
              "Perfect — I have everything I need. Hit the button below and I'll compile your gate.",
          },
        ]);
      }, 700);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInputValue(e.target.value);
    // Auto-resize: reset to auto so shrinking works, then expand to content
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  }

  async function handleCompile() {
    setPhase("compiling");
    setCompileError(null);

    try {
      const res = await fetch(`/api/app/services/${serviceId}/gate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q1: answers.q1,
          q2: answers.q2,
          q3: answers.q3,
          q4: answers.q4,
          extra: answers.extra || undefined,
          serviceTitle: serviceTitle || undefined,
        }),
      });

      const data = (await res.json()) as {
        compiledPrompt?: string;
        sampleConversation?: SampleMessage[];
        error?: string;
      };

      if (!res.ok || !data.compiledPrompt) {
        setCompileError(data.error ?? "Failed to compile. Please try again.");
        setPhase("chat");
        return;
      }

      setResult({
        compiledPrompt: data.compiledPrompt,
        sampleConversation: data.sampleConversation ?? [],
      });
      setEditedPrompt(data.compiledPrompt);
      setPhase("preview");
    } catch {
      setCompileError("Network error. Please check your connection.");
      setPhase("chat");
    }
  }

  async function handleSaveGate(prompt: string) {
    setIsSaving(true);
    try {
      await onSave(prompt, answers);
    } finally {
      setIsSaving(false);
    }
  }

  const isDone = currentStep >= 5;
  const canSend = inputValue.trim().length >= 10 && !isTyping;

  // ── Compiling ──────────────────────────────────────────────────────────────

  if (phase === "compiling") {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-ink text-white">
          <Sparkles className="size-6 animate-pulse text-brand-amber" />
        </div>
        <h3 className="text-[18px] font-medium tracking-tight">Building your gate…</h3>
        <p className="max-w-xs text-[13px] text-slate-500">
          Analysing your answers and compiling your qualification criteria. This takes a few seconds.
        </p>
      </div>
    );
  }

  // ── Preview ────────────────────────────────────────────────────────────────

  if (phase === "preview" && result) {
    return (
      <div className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-widest text-brand-amber">Gate Preview</p>
          <h3 className="mt-1 text-[18px] font-medium tracking-tight">
            Your gate is ready
          </h3>
          <p className="mt-1 text-[13px] text-slate-500">
            Review the compiled prompt below — this is exactly what the AI reads before every screening conversation. Approve to activate, or edit if you want to tweak it.
          </p>
        </div>

        {/* Compiled prompt — always visible */}
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              Compiled gate prompt
            </p>
          </div>
          <div className="max-h-52 overflow-y-auto px-4 py-3">
            <pre className="whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-slate-700">
              {result.compiledPrompt}
            </pre>
          </div>
        </div>

        {/* Sample conversation */}
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-[13px] font-medium text-slate-600 hover:text-slate-900">
            <span className="inline-block transition-transform group-open:rotate-90">▶</span>
            Preview how the AI screens a visitor
          </summary>
          <div className="mt-3 max-h-64 space-y-3 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-4">
            {result.sampleConversation.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2.5 ${msg.role === "visitor" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    msg.role === "assistant"
                      ? "bg-ink text-white"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {msg.role === "assistant" ? "G" : "V"}
                </div>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${
                    msg.role === "assistant"
                      ? "border border-slate-200 bg-white text-slate-800"
                      : "bg-ink text-white"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
        </details>

        <div className="flex flex-wrap gap-2.5">
          <Button
            type="button"
            disabled={isSaving}
            onClick={() => void handleSaveGate(result.compiledPrompt)}
            className="flex-1"
          >
            {isSaving ? (
              <><Loader2 className="size-4 animate-spin" />Saving…</>
            ) : (
              <><CheckCircle2 className="size-4" />Approve &amp; activate</>
            )}
          </Button>

          <Button type="button" variant="outline" onClick={() => setPhase("edit")}>
            <Edit3 className="size-4" />
            Edit prompt
          </Button>
        </div>
      </div>
    );
  }

  // ── Edit ───────────────────────────────────────────────────────────────────

  if (phase === "edit") {
    return (
      <div className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-brand-amber">Edit Prompt</p>
          <h3 className="mt-1 text-[18px] font-medium tracking-tight">
            Refine your qualification criteria
          </h3>
          <p className="mt-1 text-[13px] text-slate-500">
            This is exactly what the AI reads before every screening conversation.
          </p>
        </div>

        <textarea
          rows={14}
          value={editedPrompt}
          onChange={(e) => setEditedPrompt(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-[12px] leading-relaxed outline-none focus:border-slate-400"
        />

        <div className="flex gap-2.5">
          <Button
            type="button"
            disabled={isSaving || editedPrompt.trim().length < 20}
            onClick={() => void handleSaveGate(editedPrompt)}
            className="flex-1"
          >
            {isSaving ? (
              <><Loader2 className="size-4 animate-spin" />Saving…</>
            ) : (
              <><CheckCircle2 className="size-4" />Save gate</>
            )}
          </Button>

          {result ? (
            <Button type="button" variant="outline" onClick={() => setPhase("preview")}>
              <ArrowLeft className="size-4" />
              Back
            </Button>
          ) : onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  // ── Chat interface ─────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-3">
      {/* Message thread — grows with content up to a cap, then scrolls */}
      <div
        ref={scrollRef}
        className="min-h-[160px] max-h-[420px] space-y-3 overflow-y-auto pb-1 pr-0.5"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-end gap-2.5 ${
              msg.role === "user" ? "flex-row-reverse" : ""
            }`}
          >
            {msg.role === "ai" && (
              <div className="mb-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-ink">
                <Sparkles className="size-4 text-brand-amber" />
              </div>
            )}

            <div
              className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed ${
                msg.role === "ai"
                  ? "border border-slate-200 bg-white text-slate-800"
                  : "bg-ink text-white"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-end gap-2.5">
            <div className="mb-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-ink">
              <Sparkles className="size-4 text-brand-amber" />
            </div>
            <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <span className="size-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
              <span className="size-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
              <span className="size-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-slate-200 pt-3">
        {!isDone ? (
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={
                currentStep === 4
                  ? "Type your answer or skip… (Enter to send)"
                  : "Type your answer… (Enter to send, Shift+Enter for new line)"
              }
              disabled={isTyping || currentStep < 0}
              rows={2}
              style={{ minHeight: "44px", maxHeight: "200px" }}
              className="flex-1 resize-none overflow-y-auto rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[14px] leading-relaxed outline-none transition focus:border-slate-400 disabled:opacity-40"
            />

            {currentStep === 4 && (
              <button
                type="button"
                onClick={() => handleSend(true)}
                disabled={isTyping}
                className="h-10 rounded-full border border-slate-200 px-4 text-[13px] text-slate-500 transition hover:border-slate-400 hover:text-slate-700 disabled:opacity-40"
              >
                Skip
              </button>
            )}

            <button
              type="button"
              disabled={!canSend}
              onClick={() => handleSend()}
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-white transition hover:bg-ink-soft disabled:opacity-40"
            >
              <Send className="size-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {compileError && (
              <p className="rounded-xl bg-red-50 px-4 py-2 text-[13px] text-red-600">
                {compileError}
              </p>
            )}

            <Button
              type="button"
              onClick={() => void handleCompile()}
              className="w-full"
            >
              <Sparkles className="size-4" />
              Build my gate
            </Button>

            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="w-full py-2 text-[13px] text-slate-400 transition hover:text-slate-600"
              >
                Cancel
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
