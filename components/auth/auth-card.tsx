"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { ArrowRight, Mail } from "lucide-react";

type AuthMode = "login" | "register";

type AuthCardProps = {
  mode: AuthMode;
};

// OAuth providers — only rendered when the relevant provider is configured.
// Google is always shown (NextAuth will show an error if credentials are missing,
// which signals to the developer to set AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET).
const oauthProviders = [
  { id: "google", name: "Google" },
  // { id: "azure-ad", name: "Microsoft" },   // configure AUTH_AZURE_* to enable
  // { id: "linkedin", name: "LinkedIn" },     // configure AUTH_LINKEDIN_* to enable
];

export function AuthCard({ mode }: AuthCardProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const isRegister = mode === "register";
  const joinedCode = code.join("");

  async function handleEmailSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    // Dev: sign in directly with the dev-email credentials provider.
    // TODO: swap for a real email OTP flow (Resend + VerificationToken) before prod.
    await signIn("dev-email", {
      email,
      callbackUrl: "/app",
    });

    // If signIn redirects, execution stops here. If it returns (e.g. error),
    // fall back to showing the OTP UI as a visual affordance.
    setLoading(false);
    setCodeSent(true);
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 120);
  }

  function handleCodeSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // TODO: verify OTP against /api/auth/email/verify-code
    console.log({ email, code: joinedCode });
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
          {oauthProviders.map((provider) => (
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

        <div className="my-7 flex items-center gap-4">
          <div className="h-px flex-1 bg-warm-border-soft" />
          <span className="text-xs text-gray-500">
            or sign in with a code
          </span>
          <div className="h-px flex-1 bg-warm-border-soft" />
        </div>

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
                {loading ? "Signing in…" : "Continue with email"}
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
                    className="h-12 rounded-2xl border border-warm-border-soft bg-white/55 text-center text-[18px] font-medium text-ink outline-none transition focus:border-ink-soft"
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={joinedCode.length !== 6}
                className="inline-flex h-11 w-full items-center justify-center rounded-full border border-ink-soft bg-ink-soft px-5 text-[14px] text-white transition duration-500 ease-out hover:bg-ink-slate disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue
                <ArrowRight className="ml-2 size-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setCodeSent(false);
                  setCode(["", "", "", "", "", ""]);
                }}
                className="w-full text-center text-[13px] text-gray-500 hover:text-ink"
              >
                Use a different email
              </button>
            </form>
          )}
        </div>

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