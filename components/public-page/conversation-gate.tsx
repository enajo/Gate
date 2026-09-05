"use client";

import * as React from "react";
import { ArrowRight, CheckCircle2, Mic, Send } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type ChatMessage = { role: "assistant" | "user"; content: string };

// ── Voice input (browser-native, no server cost) ─────────────────────────────
// Uses the Web Speech API's SpeechRecognition when the browser exposes it —
// transcription happens in the browser/OS, not through our OpenAI usage, so
// this adds zero token cost and no new server-side surface. Unsupported
// browsers (Firefox) simply never see the mic button; typing still works.

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  [index: number]: { transcript: string };
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface MinimalSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => MinimalSpeechRecognition;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

type ChatApiResponse = {
  type: "question" | "final";
  message: string;
  decision?: "QUALIFIED" | "REDIRECT" | "REJECTED";
  redirectService?: {
    id: string;
    title: string;
    directPurchaseUrl: string;
  } | null;
  leadId?: string;
  tokensUsed: number;
  tokenBalance: number;
  lowBalance: boolean;
};

type Phase = "identity" | "chatting" | "rejected" | "redirect" | "qualified";

export interface ConversationGateProps {
  professionalId: string;
  serviceId: string;
  professionalName: string;
  accentColor: string;
  accentTextColor: string;
  /** Referrer + UTM params captured server-side on page load, for lead attribution. */
  visitorSource?: {
    referrer?: string | null;
    utmSource?: string | null;
    utmMedium?: string | null;
    utmCampaign?: string | null;
  };
  onQualified: (params: { leadId: string; name: string; email: string }) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ConversationGate({
  professionalId,
  serviceId,
  professionalName,
  accentColor,
  accentTextColor,
  visitorSource,
  onQualified,
}: ConversationGateProps) {
  // Identity form
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [nameError, setNameError] = React.useState("");
  const [emailError, setEmailError] = React.useState("");

  // Conversation
  const [phase, setPhase] = React.useState<Phase>("identity");
  const [history, setHistory] = React.useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);

  // Outcome
  const [rejectedLeadId, setRejectedLeadId] = React.useState<string | null>(null);
  const [redirectData, setRedirectData] = React.useState<{
    service: { id: string; title: string; directPurchaseUrl: string };
    message: string;
  } | null>(null);

  // Voice input
  const [isListening, setIsListening] = React.useState(false);
  const [speechSupported, setSpeechSupported] = React.useState(false);
  const [micError, setMicError] = React.useState<string | null>(null);
  const recognitionRef = React.useRef<MinimalSpeechRecognition | null>(null);
  const baseTranscriptRef = React.useRef("");

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom whenever history grows
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, isLoading]);

  // Detect Web Speech API support once, client-side only (avoids SSR mismatch)
  React.useEffect(() => {
    setSpeechSupported(getSpeechRecognitionConstructor() !== null);
  }, []);

  // Auto-grow the textarea for both typed and voice-transcribed text
  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  // Stop any in-progress recognition if the conversation moves past chatting
  // (qualified/rejected/redirect) or the component unmounts.
  React.useEffect(() => {
    if (phase !== "chatting") {
      recognitionRef.current?.stop();
    }
  }, [phase]);

  React.useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  // Focus the input when chatting starts
  React.useEffect(() => {
    if (phase === "chatting") {
      inputRef.current?.focus();
    }
  }, [phase]);

  // Auto-advance after showing QUALIFIED message
  React.useEffect(() => {
    if (phase === "qualified" && history.length > 0) {
      const timer = window.setTimeout(() => {
        const lastMsg = history[history.length - 1];
        if (lastMsg) {
          onQualified({
            leadId: rejectedLeadId ?? "",
            name,
            email,
          });
        }
      }, 1200);
      return () => window.clearTimeout(timer);
    }
  }, [phase, history, rejectedLeadId, name, email, onQualified]);

  // ── API call ──────────────────────────────────────────────────────────────

  async function callChat(currentHistory: ChatMessage[]) {
    setIsLoading(true);
    setApiError(null);

    try {
      const res = await fetch("/api/public/qualification/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professionalId,
          serviceId,
          name: name.trim(),
          email: email.trim(),
          history: currentHistory,
          referrer: visitorSource?.referrer ?? undefined,
          utmSource: visitorSource?.utmSource ?? undefined,
          utmMedium: visitorSource?.utmMedium ?? undefined,
          utmCampaign: visitorSource?.utmCampaign ?? undefined,
        }),
      });

      if (!res.ok) {
        const errData = (await res.json()) as { error?: string };
        throw new Error(errData.error ?? "Something went wrong.");
      }

      const data = (await res.json()) as ChatApiResponse;

      const aiMessage: ChatMessage = { role: "assistant", content: data.message };
      const nextHistory = [...currentHistory, aiMessage];
      setHistory(nextHistory);

      if (data.type === "final") {
        const leadId = data.leadId ?? null;

        if (data.decision === "QUALIFIED") {
          setRejectedLeadId(leadId); // reuse field for leadId storage
          setPhase("qualified");
        } else if (data.decision === "REDIRECT" && data.redirectService) {
          setRedirectData({
            service: data.redirectService,
            message: data.message,
          });
          setPhase("redirect");
        } else {
          setRejectedLeadId(leadId);
          setPhase("rejected");
        }
      }
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  // ── Identity submit ───────────────────────────────────────────────────────

  function handleIdentitySubmit(e: React.FormEvent) {
    e.preventDefault();

    let valid = true;

    if (!name.trim()) {
      setNameError("Please enter your name.");
      valid = false;
    } else {
      setNameError("");
    }

    if (!email.trim()) {
      setEmailError("Please enter your email.");
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(email.trim())) {
      setEmailError("Please enter a valid email address.");
      valid = false;
    } else {
      setEmailError("");
    }

    if (!valid) return;

    setPhase("chatting");
    // First call — empty history, AI opens the conversation
    void callChat([]);
  }

  // ── Message send ──────────────────────────────────────────────────────────

  function handleSend() {
    const text = inputValue.trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = { role: "user", content: text };
    const nextHistory = [...history, userMessage];
    setHistory(nextHistory);
    setInputValue("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    void callChat(nextHistory);
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // ── Voice input ───────────────────────────────────────────────────────────

  function handleMicClick() {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognitionCtor = getSpeechRecognitionConstructor();
    if (!SpeechRecognitionCtor) return;

    setMicError(null);
    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    baseTranscriptRef.current = inputValue ? `${inputValue} ` : "";

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        if (result.isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      if (final) baseTranscriptRef.current += final;
      setInputValue(baseTranscriptRef.current + interim);
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      setMicError(
        event.error === "not-allowed"
          ? "Microphone access was denied — you can still type your reply."
          : "Voice input stopped working — you can still type your reply.",
      );
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  // ── Identity phase ────────────────────────────────────────────────────────

  if (phase === "identity") {
    return (
      <div>
        <p
          className="text-xs uppercase tracking-[0.24em]"
          style={{ color: accentColor }}
        >
          Qualification
        </p>

        <h2 className="mt-4 text-[28px] font-semibold tracking-[-0.045em]">
          Let&apos;s see if we&apos;re a fit.
        </h2>

        <p
          className="mt-3 text-[14px] leading-7"
          style={{ color: "var(--text-secondary)" }}
        >
          Answer a few questions in a quick conversation —{" "}
          {professionalName} only works with the right clients.
        </p>

        <form className="mt-8 space-y-4" onSubmit={handleIdentitySubmit}>
          <div className="space-y-1.5">
            <label className="block text-[14px] font-medium">Your name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
              className="h-12 w-full rounded-full border bg-white/80 px-4 text-[14px] text-ink-deep outline-none transition focus:border-ink-deep"
              style={{ borderColor: "var(--border)" }}
            />
            {nameError && (
              <p className="text-[12px] text-red-500">{nameError}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-[14px] font-medium">Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@company.com"
              className="h-12 w-full rounded-full border bg-white/80 px-4 text-[14px] text-ink-deep outline-none transition focus:border-ink-deep"
              style={{ borderColor: "var(--border)" }}
            />
            {emailError && (
              <p className="text-[12px] text-red-500">{emailError}</p>
            )}
          </div>

          <button
            type="submit"
            className="mt-2 inline-flex h-11 items-center justify-center rounded-full border px-6 text-[15px] font-medium transition hover:brightness-[1.04]"
            style={{
              backgroundColor: accentColor,
              borderColor: accentColor,
              color: accentTextColor,
            }}
          >
            Start conversation
            <ArrowRight className="ml-2 size-4" />
          </button>
        </form>
      </div>
    );
  }

  // ── Chatting / outcome phases ─────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col">
      <p
        className="mb-5 text-xs uppercase tracking-[0.24em]"
        style={{ color: accentColor }}
      >
        Qualification
      </p>

      {/* Message list */}
      <div
        role="log"
        aria-live="polite"
        aria-label="Qualification conversation"
        className="flex-1 space-y-4 overflow-y-auto pr-1"
        style={{ maxHeight: "340px", minHeight: "200px" }}
      >
        {history.map((msg, i) => (
          <div
            key={i}
            className={
              msg.role === "user" ? "flex justify-end" : "flex justify-start"
            }
          >
            <div
              className={
                msg.role === "user"
                  ? "max-w-[78%] rounded-[1.1rem] rounded-tr-sm px-4 py-3 text-[14px] leading-6"
                  : "max-w-[85%] rounded-[1.1rem] rounded-tl-sm px-4 py-3 text-[14px] leading-6"
              }
              style={
                msg.role === "user"
                  ? {
                      backgroundColor: accentColor,
                      color: accentTextColor,
                    }
                  : {
                      backgroundColor: "var(--card-bg, rgba(255,255,255,0.74))",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border)",
                    }
              }
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div
              className="flex items-center gap-1 rounded-[1.1rem] rounded-tl-sm px-4 py-3"
              style={{
                backgroundColor: "var(--card-bg, rgba(255,255,255,0.74))",
                border: "1px solid var(--border)",
              }}
            >
              <span className="typing-dot" />
              <span className="typing-dot" style={{ animationDelay: "0.15s" }} />
              <span className="typing-dot" style={{ animationDelay: "0.3s" }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* QUALIFIED outcome */}
      {phase === "qualified" && (
        <div className="mt-5 flex items-center gap-3 rounded-[1rem] border px-4 py-3 text-[14px]"
          style={{ borderColor: accentColor, backgroundColor: `${accentColor}18` }}
        >
          <CheckCircle2 className="size-5 shrink-0" style={{ color: accentColor }} />
          <span style={{ color: "var(--text-primary)" }}>
            Opening up the calendar…
          </span>
        </div>
      )}

      {/* REDIRECT outcome */}
      {phase === "redirect" && redirectData && (
        <a
          href={redirectData.service.directPurchaseUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 flex items-center justify-between rounded-[1.25rem] border px-5 py-4 transition hover:brightness-[1.04]"
          style={{
            borderColor: accentColor,
            backgroundColor: `${accentColor}14`,
          }}
        >
          <span className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
            {redirectData.service.title}
          </span>
          <span
            className="flex items-center gap-2 text-[13px] font-medium"
            style={{ color: accentColor }}
          >
            Get access
            <ArrowRight className="size-4" />
          </span>
        </a>
      )}

      {/* REJECTED outcome */}
      {phase === "rejected" && (
        <div
          className="mt-5 rounded-[1rem] border px-4 py-3 text-[13px] leading-6"
          style={{
            borderColor: "var(--border)",
            color: "var(--text-secondary)",
          }}
        >
          We&apos;ve saved your details. {professionalName} will reach out if
          something comes up that&apos;s a fit.
        </div>
      )}

      {/* API error */}
      {apiError && (
        <p className="mt-3 text-[13px] text-red-500">{apiError}</p>
      )}

      {/* Input — only shown while chatting */}
      {phase === "chatting" && (
        <>
          <div
            className="mt-4 flex items-end gap-2 rounded-[1.1rem] border bg-white/80 px-3 py-2"
            style={{ borderColor: "var(--border)" }}
          >
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleInputKeyDown}
              rows={1}
              placeholder="Type your reply…"
              aria-label="Your reply"
              className="flex-1 resize-none overflow-y-auto bg-transparent text-[14px] leading-6 text-ink-deep outline-none"
              style={{ maxHeight: "120px" }}
              disabled={isLoading}
            />

            {speechSupported && (
              <button
                type="button"
                onClick={handleMicClick}
                disabled={isLoading}
                aria-pressed={isListening}
                aria-label={isListening ? "Stop voice input" : "Start voice input"}
                className="flex size-8 shrink-0 items-center justify-center rounded-full border transition disabled:opacity-40"
                style={
                  isListening
                    ? {
                        backgroundColor: accentColor,
                        borderColor: accentColor,
                        color: accentTextColor,
                      }
                    : {
                        backgroundColor: "transparent",
                        borderColor: "var(--border)",
                        color: "var(--text-secondary)",
                      }
                }
              >
                <Mic className="size-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              aria-label="Send message"
              className="flex size-8 shrink-0 items-center justify-center rounded-full transition disabled:opacity-40"
              style={{
                backgroundColor: accentColor,
                color: accentTextColor,
              }}
            >
              <Send className="size-3.5" />
            </button>
          </div>

          <span className="sr-only" aria-live="polite">
            {isListening ? "Listening…" : ""}
          </span>

          {micError && (
            <p className="mt-2 text-[12px] text-red-500">{micError}</p>
          )}
        </>
      )}
    </div>
  );
}
