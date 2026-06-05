import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,rgba(223,167,103,0.18),transparent_30%),radial-gradient(circle_at_85%_22%,rgba(71,85,105,0.10),transparent_26%),linear-gradient(180deg,#F9FAFB_0%,#F6F2EA_45%,#F3EDE2_100%)] text-ink">
      <header className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 text-[13px]">
        <Link href="/" className="font-medium tracking-wide">
          GATE
        </Link>

        <Link href="/register" className="text-gray-500 hover:text-ink">
          Create account
        </Link>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-56px)] max-w-6xl items-center gap-12 px-4 py-12 lg:grid-cols-[1fr_0.9fr]">
        <div className="max-w-xl">
          <p className="text-xs uppercase tracking-[0.26em] text-brand-amber">
            Welcome back
          </p>

          <h2 className="mt-5 text-[44px] font-semibold leading-none tracking-[-0.055em] text-ink sm:text-[64px]">
            Return to your private command center.
          </h2>

          <p className="mt-6 max-w-lg text-[17px] leading-[1.8] text-gray-500">
            Review qualified requests, manage access, and keep your calendar
            protected from noise.
          </p>

          <div className="mt-8 grid max-w-md gap-3 text-[14px] text-gray-500">
            <div className="border-l border-brand-amber pl-4">
              Continue with Google, Microsoft, LinkedIn, or a secure email code.
            </div>
            <div className="border-l border-warm-border-soft pl-4">
              No passwords to remember. Your account stays controlled by your
              trusted identity provider.
            </div>
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <AuthCard mode="login" />
        </div>
      </section>
    </main>
  );
}