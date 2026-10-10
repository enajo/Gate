"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getProviders, signIn } from "next-auth/react";
import { ArrowRight, Mail } from "lucide-react";

type AuthMode = "login" | "register";

type AuthCardProps = {
  mode: AuthMode;
};

// OAuth providers — each is only rendered once the server reports it's
// actually configured (e.g. Google needs AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET),
// so nobody clicks through to a NextAuth error page.
const oauthProviders = [
  { id: "google", name: "Google" },
  // { id: "azure-ad", name: "Microsoft" },   // configure AUTH_AZURE_* to enable
  // { id: "linkedin", name: "LinkedIn" },     // configure AUTH_LINKEDIN_* to enable
];

const EMPTY_CODE = ["", "", "", "", "", ""];

export function AuthCard({ mode }: AuthCardProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState(EMPTY_CODE);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [configuredProviders, setConfiguredProviders] = useState<string[]>([]);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const isRegister = mode === "register";
  const joinedCode = code.join("");

  useEffect(() => {
    let cancelled = false;
    void getProviders().then((providers) => {
      if (!cancelled) setConfiguredProviders(Object.keys(providers ?? {}));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleOauthProviders = oauthProviders.filter((provider) =>
    configuredProviders.includes(provider.id),
  );

  async function requestCode(): Promise<boolean> {
    const response = await fetch("/api/public/login-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Couldn't send a code. Please try again.");
      return false;
    }

    return true;
  }

  async function handleEmailSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    const sent = await requestCode();
    setLoading(false);
    if (!sent) return;

    setCodeSent(true);
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 120);
  }

  async function handleResend() {
    setError(null);
    setNotice(null);
    setCode(EMPTY_CODE);
    if (await requestCode()) {
      setNotice("A new code is on its way. Only the newest code works.");
      inputRefs.current[0]?.focus();
    }
  }

  async function handleCodeSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    const result = await signIn("email-code", {
      email,
      code: joinedCode,
      redirect: false,
      callbackUrl: "/app",
    });

    if (result?.ok && !result.error) {
      // Full navigation so the new session cookie is picked up everywhere.
      window.location.href = result.url ?? "/app";
      return;
    }

    setLoading(false);
    setCode(EMPTY_CODE);
    setError("That code is wrong or has expired. Check the latest email, or send a new code.");
    inputRefs.current[0]?.focus();
  }

  function handleCodePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const digits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (digits.length < 2) return; // a single digit: let the normal input handle it
    event.preventDefault();
    const nextCode = [...EMPTY_CODE];
    digits.split("").forEach((digit, i) => {
      nextCode[i] = digit;
    });
    setCode(nextCode);
    inputRefs.current[Math.min(digits.length, 5)]?.focus();
  }

  function handleCodeChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);

    const nextCode = [...code];
    nextCode[index] = digit;
    setCode(nextCode);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  return (
    <div className="relative w-full max-w-md overflow-hidden card-warm p-7 shadow-warm-xl backdrop-blur">
      <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-brand-amber/20 blur-3xl" />

      <div className="relative">
        <p className="text-xs uppercase tracking-[0.26em] text-brand-amber">
          {isRegister ? "Create account" : "Welcome back"}
        </p>

        <h1 className="mt-4 text-[30px] font-medium leading-tight tracking-[-0.045em] text-ink">
          {isRegister ? "Create your GATE account." : "Sign in to GATE."}
        </h1>

        <p className="mt-3 text-[14px] leading-[1.7] text-gray-500">
          {isRegister
            ? "Start protecting your calendar with a premium qualification flow."
            : "Access your expert dashboard and control room."}
        </p>

        <div className="mt-7 space-y-3">
          {visibleOauthProviders.map((provider) => (
            <button
              key={provider.id}
              type="button"
              onClick={() => signIn(provider.id, { callbackUrl: "/app" })}
              className="flex h-11 w-full items-center justify-center rounded-full border border-warm-border-soft bg-white/45 px-5 text-[14px] text-ink transition duration-500 ease-out hover:border-ink-soft hover:bg-white/70"
            >
              Continue with {provider.name}
            </button>
          ))}
        </div>

        {visibleOauthProviders.length > 0 ? (
          <div className="my-7 flex items-center gap-4">
            <div className="h-px flex-1 bg-warm-border-soft" />
            <span className="text-xs text-gray-500">
              or sign in with a code
            </span>
            <div className="h-px flex-1 bg-warm-border-soft" />
          </div>
        ) : null}

        <div className="relative min-h-[172px]">
          {!codeSent ? (
            <form
              onSubmit={handleEmailSubmit}
              className="animate-[fadeIn_450ms_ease-out] space-y-4"
            >
              <label className="block">
                <span className="text-[13px] font-medium text-ink">
                  Email address
                </span>

                <div className="mt-2 flex h-11 items-center gap-3 rounded-full border border-warm-border-soft bg-white/55 px-4">
                  <Mail className="size-4 text-gray-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-warm-gray"
                  />
                </div>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-11 w-full items-center justify-center rounded-full border border-ink-soft bg-ink-soft px-5 text-[14px] text-white transition duration-500 ease-out hover:bg-ink-slate disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Sending code…" : "Continue with email"}
                {!loading && <ArrowRight className="ml-2 size-4" />}
              </button>
            </form>
          ) : (
            <form
              onSubmit={handleCodeSubmit}
              className="animate-[fadeIn_450ms_ease-out] space-y-4"
            >
              <div>
                <p className="text-[13px] font-medium text-ink">
                  Enter your 6-digit code
                </p>
                <p className="mt-1 text-[12px] leading-5 text-gray-500">
                  We sent a secure code to {email}.
                </p>
              </div>

              <div className="grid grid-cols-6 gap-2">
                {code.map((digit, index) => (
                  <input
                    key={index}
                    ref={(element) => {
                      inputRefs.current[index] = element;
                    }}
                    inputMode="numeric"
                    maxLength={1}
                    required
                    value={digit}
                    onChange={(event) =>
                      handleCodeChange(index, event.target.value)
                    }
                    onKeyDown={(event) => handleKeyDown(index, event)}
                    onPaste={handleCodePaste}
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    className="h-12 rounded-2xl border border-warm-border-soft bg-white/55 text-center text-[18px] font-medium text-ink outline-none transition focus:border-ink-soft"
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={joinedCode.length !== 6 || loading}
                className="inline-flex h-11 w-full items-center justify-center rounded-full border border-ink-soft bg-ink-soft px-5 text-[14px] text-white transition duration-500 ease-out hover:bg-ink-slate disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Checking…" : "Continue"}
                {!loading && <ArrowRight className="ml-2 size-4" />}
              </button>

              <div className="flex justify-center gap-5 text-[13px] text-gray-500">
                <button type="button" onClick={() => void handleResend()} className="hover:text-ink">
                  Send a new code
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCodeSent(false);
                    setCode(EMPTY_CODE);
                    setError(null);
                    setNotice(null);
                  }}
                  className="hover:text-ink"
                >
                  Use a different email
                </button>
              </div>
            </form>
          )}
        </div>

        {error ? (
          <p role="alert" className="mt-4 text-center text-[13px] text-red-500">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="mt-4 text-center text-[13px] text-gray-500">{notice}</p>
        ) : null}

        <p className="mt-7 text-center text-[13px] text-gray-500">
          {isRegister ? "Already have an account?" : "New to GATE?"}{" "}
          <Link
            href={isRegister ? "/login" : "/register"}
            className="text-ink-soft underline"
          >
            {isRegister ? "Sign in" : "Create account"}
          </Link>
        </p>
      </div>
    </div>
  );
}