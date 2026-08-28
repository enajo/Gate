import type { Metadata } from "next";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

export const metadata: Metadata = { title: "Terms of Use" };

// NOTE: minimal terms sized for a small, trusted beta — not a substitute
// for a lawyer-drafted agreement before a public launch.

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <SiteHeader />

      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
          Legal
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Terms of Use
        </h1>
        <p className="mt-2 text-sm text-slate-500">Last updated: [date]</p>

        <div className="mt-10 space-y-8 text-[15px] leading-7 text-slate-700">
          <section>
            <p>
              Gate is currently in an early beta. By using it, you&apos;re
              agreeing to these terms — short on purpose, since this is a
              small, invite-based test, not a finished product.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              What this is
            </h2>
            <p className="mt-2">
              Gate lets a professional publish a booking page guarded by an
              AI screening conversation, and lets visitors go through that
              conversation to book time. It&apos;s under active development —
              features may change, and you may run into rough edges.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              It&apos;s a beta — please read this part
            </h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>Gate is provided as-is, with no uptime or accuracy guarantee.</li>
              <li>
                The AI screening decision is a tool to help a professional,
                not a guarantee of who is or isn&apos;t a good fit — professionals
                should use their own judgment, especially early on.
              </li>
              <li>
                Don&apos;t rely on Gate for anything where a bug or downtime
                would cause serious harm.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              Your responsibilities
            </h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>Give accurate information when you sign up or book.</li>
              <li>Don&apos;t use Gate to harass, deceive, or spam anyone.</li>
              <li>
                If you&apos;re a professional, you&apos;re responsible for
                what you tell your visitors and how you follow up with them —
                Gate screens and schedules, it doesn&apos;t manage the
                relationship after that.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              Ending your use
            </h2>
            <p className="mt-2">
              You can stop using Gate at any time. We may suspend an account
              that misuses the platform or disrupts it for others.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              Changes
            </h2>
            <p className="mt-2">
              Because this is a beta, these terms may change as the product
              does. We&apos;ll let active testers know if anything material
              changes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              Questions
            </h2>
            <p className="mt-2">
              Reach us at{" "}
              <a href="mailto:[support-email]" className="text-slate-900 underline">
                [support-email]
              </a>
              .
            </p>
          </section>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
