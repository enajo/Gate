import type { Metadata } from "next";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

export const metadata: Metadata = { title: "Privacy Policy" };

// NOTE: written to accurately describe what Gate actually does today, for a
// small beta. Have a lawyer review this before a public launch — and before
// onboarding any professional in a regulated field (law, medicine, etc.),
// since that likely requires additional disclosures this doesn't cover.

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <SiteHeader />

      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
          Legal
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-slate-500">Last updated: [date]</p>

        <div className="mt-10 space-y-8 text-[15px] leading-7 text-slate-700">
          <section>
            <p>
              Gate is a booking platform that screens visitors with an AI
              conversation before they can book time with a professional.
              This page explains what we collect, why, and what you can do
              about it.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              What we collect
            </h2>
            <p className="mt-2 font-medium text-slate-900">
              If you&apos;re a professional using Gate:
            </p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>Your name, email, and profile details (bio, title, services you offer)</li>
              <li>
                Access to your Google Calendar, if you connect one — used to
                check for scheduling conflicts and create events when a
                booking is confirmed. We only request the access needed for
                that.
              </li>
              <li>The leads and bookings your gate produces</li>
            </ul>

            <p className="mt-4 font-medium text-slate-900">
              If you&apos;re a visitor going through someone&apos;s gate:
            </p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>Your name and email</li>
              <li>
                The full conversation you have with the AI screening
                assistant — this is stored so the professional can review it,
                and is what powers the qualification decision
              </li>
              <li>Which page referred you here, if any (for the professional&apos;s own reporting)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              Who else sees it
            </h2>
            <p className="mt-2">We share data with the services that make Gate work, and nowhere else:</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li><strong>OpenAI</strong> — conversation content is sent to power the AI screening and the professional&apos;s pattern reports.</li>
              <li><strong>Google</strong> — if a professional connects a calendar, for conflict-checking and event creation.</li>
              <li><strong>Resend</strong> — to deliver booking, correction, and outcome-related emails.</li>
              <li><strong>Sentry</strong> — for error monitoring, so we can find and fix bugs. This can include technical details about what went wrong, not conversation content.</li>
            </ul>
            <p className="mt-3">
              We do not sell data, and we do not use third-party advertising
              or analytics trackers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              How long we keep it
            </h2>
            <p className="mt-2">
              We keep data for as long as the related account is active. If
              you&apos;d like your data deleted, contact us at{" "}
              <a href="mailto:[support-email]" className="text-slate-900 underline">
                [support-email]
              </a>{" "}
              — this is currently a manual process, since Gate is in an early
              beta.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">
              Your choices
            </h2>
            <p className="mt-2">
              You can ask us what data we have about you, ask us to correct
              it, or ask us to delete it, by emailing{" "}
              <a href="mailto:[support-email]" className="text-slate-900 underline">
                [support-email]
              </a>
              . Professionals can disconnect their Google Calendar at any
              time from their dashboard.
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
