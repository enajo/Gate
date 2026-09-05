import Link from "next/link";
import { Check } from "lucide-react";

import { HeroQualificationTeaser } from "@/components/marketing/hero-qualification-teaser";
import { HowItWorksSection } from "@/components/marketing/how-it-works-section";

const footerColumns: Array<{
  title: string;
  links: Array<{ label: string; href: string }>;
}> = [
  {
    title: "Product",
    links: [
      { label: "Home", href: "/" },
      { label: "How it works", href: "/#how-it-works" },
      { label: "Pricing", href: "/#pricing" },
      { label: "FAQ", href: "/#faq" },
    ],
  },
  {
    title: "Resources",
    links: [{ label: "Support", href: "mailto:hello@expertgatekeeper.com" }],
  },
  {
    title: "Company",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Contact", href: "mailto:hello@expertgatekeeper.com" },
    ],
  },
];

const pricingTiers = [
  {
    name: "Free",
    label: "Start here",
    price: "$0",
    suffix: "/mo",
    fee: "1 active service · ~10 AI qualifications/mo",
    description:
      "For independent experts who want to try the AI gatekeeper before committing to anything.",
    features: [
      "1 active service",
      "Unlimited bookings",
      "~10 AI-qualified conversations/mo",
      "Google Calendar sync",
    ],
    highlighted: false,
  },
  {
    name: "Pro",
    label: "Sweet spot",
    price: "$29",
    suffix: "/mo",
    fee: "Unlimited services · ~100 AI qualifications/mo",
    description:
      "For consultants and fractional leaders running a real practice who need more room to screen prospects.",
    features: [
      "Unlimited services",
      "Unlimited bookings",
      "~100 AI-qualified conversations/mo",
      "Pre-call briefings",
      "AI pattern reports",
    ],
    highlighted: true,
  },
  {
    name: "Business",
    label: "High volume",
    price: "$79",
    suffix: "/mo",
    fee: "Unlimited services · ~500 AI qualifications/mo",
    description:
      "For busy practices with steady inbound who don't want to think about limits.",
    features: [
      "Everything in Pro",
      "~500 AI-qualified conversations/mo",
      "Priority support",
    ],
    highlighted: false,
  },
];

const faqs = [
  {
    question: "Can I sync my existing Google Calendar?",
    answer:
      "Yes. GATE sits in front of your existing calendar so only qualified prospects reach your availability.",
  },
  {
    question: "Can I start without charging clients?",
    answer:
      "Yes. Start with questions and access codes, then add payments when your offer is ready.",
  },
  {
    question: "Do I need a credit card to try GATE?",
    answer:
      "No. The Free plan is $0/mo with no payment method required, capped at roughly 10 AI qualifications a month.",
  },
  {
    question: "What happens if the AI can't reach a decision?",
    answer:
      "GATE fails open. If a qualification check ever errors out, a visitor is let through rather than blocked — you never lose a legitimate lead to a technical hiccup.",
  },
  {
    question: "What happens if I go over my monthly AI limit?",
    answer:
      "GATE keeps failing open: visitors are auto-qualified instead of turned away, and your allowance resets automatically at the start of the next month.",
  },
  {
    question: "Can I embed my gate on my own website?",
    answer:
      "Yes. A lightweight embeddable widget lets visitors qualify and book without ever leaving your site.",
  },
];

function AuraButton({
  href,
  children,
  variant = "primary",
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "gold" | "text";
  className?: string;
}) {
  const styles = {
    primary:
      "border-ink-soft bg-ink-soft text-white hover:bg-ink-slate hover:border-ink-slate",
    secondary:
      "border-warm-border-soft bg-transparent text-ink hover:border-ink-soft hover:bg-ink-soft hover:text-white",
    gold:
      "border-brand-amber bg-[linear-gradient(135deg,#DFA767,#E8BC82)] text-ink hover:brightness-[1.04]",
    text: "border-transparent bg-transparent px-0 text-ink-soft hover:text-ink",
  };

  return (
    <Link
      href={href}
      className={`inline-flex h-10 items-center justify-center rounded-full border px-5 text-[14px] font-normal leading-none transition duration-500 ease-out ${styles[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}

export default function MarketingHomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,rgba(223,167,103,0.16),transparent_28%),radial-gradient(circle_at_85%_22%,rgba(71,85,105,0.10),transparent_25%),linear-gradient(180deg,#F9FAFB_0%,#F6F2EA_28%,#F3EDE2_58%,#F8F5EF_100%)] text-ink">
      <header className="sticky top-0 z-50 bg-gray-50/70 backdrop-blur-xl">
        <nav className="mx-auto flex h-12 max-w-6xl items-center justify-between px-4 text-[12px] text-ink">
          <Link href="/" className="font-medium tracking-wide">
            GATE
          </Link>

          <div className="hidden items-center gap-8 text-gray-500 md:flex">
            <Link href="#how-it-works">How it works</Link>
            <Link href="#pricing">Pricing</Link>
            <Link href="#faq">FAQ</Link>
            <Link href="/login">Login</Link>
            <Link href="/register">Register</Link>
          </div>
        </nav>
      </header>

      <section className="relative overflow-hidden text-center">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(223,167,103,0.18),transparent_34%),radial-gradient(circle_at_70%_35%,rgba(71,85,105,0.10),transparent_32%),linear-gradient(180deg,rgba(249,250,251,0.86)_0%,rgba(246,242,234,0.58)_58%,rgba(243,237,226,0.68)_100%)]" />

        <div className="relative mx-auto max-w-4xl px-4 pb-20 pt-16">
          <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-brand-amber">
            A gate, not a calendar
          </p>

          <h1
            style={{ fontFamily: "var(--font-display)" }}
            className="mx-auto mt-5 max-w-3xl text-[44px] font-medium leading-[1.05] tracking-[-0.02em] sm:text-[64px]"
          >
            Your calendar isn&apos;t open to everyone.
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-[18px] leading-[1.6] text-gray-500">
            Gate screens every visitor with a real conversation before they
            ever see an open slot — so what reaches your calendar is already
            worth your time.
          </p>

          <div className="mt-8 flex justify-center gap-4">
            <AuraButton href="/register" variant="primary">
              Start free
            </AuraButton>
            <AuraButton href="#how-it-works" variant="secondary">
              See how it works
            </AuraButton>
          </div>

          <div className="mt-16">
            <HeroQualificationTeaser />
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden px-4 py-16 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="relative overflow-hidden rounded-section bg-[radial-gradient(circle_at_bottom_right,rgba(223,167,103,0.16),transparent_32%),linear-gradient(145deg,#1B1B1B_0%,#252525_45%,#171717_100%)] px-8 py-10 text-warm-cream shadow-[0_18px_50px_rgba(0,0,0,0.16)]">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.04),transparent_42%)]" />

            <div className="relative">
              <p className="text-xs uppercase tracking-[0.22em] text-brand-amber">
                The math
              </p>

              <h2
                style={{ fontFamily: "var(--font-display)" }}
                className="mx-auto mt-4 max-w-xl text-[26px] font-medium leading-tight tracking-[-0.02em] sm:text-[30px]"
              >
                Example: 8 of 10 discovery calls turn out unqualified, GATE
                protects 4 hours every week.
              </h2>

              <div className="mx-auto mt-7 grid max-w-md gap-3 sm:grid-cols-3">
                {[
                  ["10", "free calls/week"],
                  ["8", "unqualified"],
                  ["4h", "weekly time saved"],
                ].map(([value, label]) => (
                  <div
                    key={label}
                    className="rounded-[1rem] bg-[linear-gradient(145deg,rgba(255,255,255,0.14),rgba(255,255,255,0.07))] px-4 py-3"
                  >
                    <p className="text-[24px] font-semibold tracking-[-0.05em]">
                      {value}
                    </p>
                    <p className="mt-1 text-[11px] text-warm-border-soft">
                      {label}
                    </p>
                  </div>
                ))}
              </div>

              <p className="mt-6 text-[13px] leading-6 text-warm-border-soft">
                What is one protected hour of your attention worth?
              </p>
            </div>
          </div>
        </div>
      </section>

      <HowItWorksSection />

      <section id="pricing" className="relative overflow-hidden bg-transparent px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs uppercase tracking-[0.26em] text-brand-amber">
              Pricing
            </p>

            <h2
              style={{ fontFamily: "var(--font-display)" }}
              className="mt-4 text-[32px] font-medium leading-tight tracking-[-0.01em] sm:text-[42px]"
            >
              A private front desk for high-value professionals.
            </h2>

            <p className="mx-auto mt-4 max-w-lg text-[15px] leading-[1.7] text-gray-500">
              Simple tiers for protecting your calendar, qualifying prospects,
              and routing the right clients.
            </p>
          </div>

          <div className="mx-auto mt-14 grid max-w-5xl gap-5 lg:grid-cols-[0.95fr_1.1fr_0.95fr]">
            {pricingTiers.map((tier) => {
              const isPro = tier.highlighted;
              const isBusiness = tier.name === "Business";

              return (
                <div
                  key={tier.name}
                  className={
                    isPro
                      ? "relative overflow-hidden rounded-section bg-[radial-gradient(circle_at_top_left,rgba(223,167,103,0.18),transparent_34%),linear-gradient(145deg,#171717_0%,#282828_48%,#1B1B1B_100%)] px-7 py-8 text-warm-cream shadow-[0_18px_50px_rgba(0,0,0,0.18)] transition duration-500 ease-out hover:brightness-[1.03]"
                      : "relative overflow-hidden rounded-section border border-warm-border/80 bg-[linear-gradient(145deg,#F6F0E6_0%,#F3EDE2_54%,#FBF9F4_100%)] px-7 py-8 shadow-[0_12px_34px_rgba(120,100,80,0.07)] transition duration-500 ease-out hover:brightness-[1.015]"
                  }
                >
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.04),transparent_42%)]" />

                  <div className="relative">
                    <p
                      className={
                        isPro
                          ? "text-[11px] text-brand-amber"
                          : "text-[11px] text-gray-500"
                      }
                    >
                      {tier.label}
                    </p>

                    <h3 className="mt-5 text-[24px] font-semibold tracking-[-0.04em]">
                      {tier.name}
                    </h3>

                    <p
                      className={
                        isPro
                          ? "mt-3 text-[13px] leading-[1.65] text-warm-border-soft"
                          : "mt-3 text-[13px] leading-[1.65] text-gray-500"
                      }
                    >
                      {tier.description}
                    </p>

                    <div className="mt-7 flex items-end gap-1">
                      <span className="text-[38px] font-semibold tracking-[-0.055em]">
                        {tier.price}
                      </span>
                      <span
                        className={
                          isPro
                            ? "mb-2 text-sm text-warm-border-soft"
                            : "mb-2 text-sm text-gray-500"
                        }
                      >
                        {tier.suffix}
                      </span>
                    </div>

                    <p
                      className={
                        isPro
                          ? "mt-1 text-xs text-brand-amber"
                          : "mt-1 text-xs text-gray-500"
                      }
                    >
                      {tier.fee}
                    </p>

                    <div className="mt-7">
                      {isPro ? (
                        <AuraButton href="/register" variant="gold">
                          Upgrade to Pro
                        </AuraButton>
                      ) : isBusiness ? (
                        <AuraButton href="/register" variant="secondary">
                          Upgrade to Business
                        </AuraButton>
                      ) : (
                        <AuraButton href="/register" variant="secondary">
                          Start free
                        </AuraButton>
                      )}
                    </div>

                    <ul className="mt-7 space-y-2">
                      {tier.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex gap-2 text-[13px] leading-5"
                        >
                          <Check className="mt-0.5 size-3.5 shrink-0 text-brand-amber" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mx-auto mt-16 max-w-2xl text-center">
            <p className="text-[20px] font-normal leading-[1.45] tracking-[-0.035em]">
              Protecting your calendar is not about scarcity.
            </p>
            <p className="mt-1 text-[14px] leading-[1.7] text-gray-500">
              It is about preserving focus for the right people.
            </p>
          </div>
        </div>
      </section>

      <section id="faq" className="relative overflow-hidden bg-transparent px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs uppercase tracking-[0.26em] text-brand-amber">
              FAQ
            </p>

            <h2
              style={{ fontFamily: "var(--font-display)" }}
              className="mt-4 text-[32px] font-medium leading-tight tracking-[-0.01em] sm:text-[42px]"
            >
              Frequently asked questions
            </h2>
          </div>

          <div className="mx-auto mt-14 grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {faqs.map((faq) => (
              <div
                key={faq.question}
                className="border-b border-warm-border-soft pb-6"
              >
                <h4 className="text-[16px] font-semibold tracking-[-0.03em]">
                  {faq.question}
                </h4>
                <p className="mt-2 text-[13px] leading-[1.65] text-gray-500">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden px-4 pb-24">
        <div className="mx-auto max-w-5xl rounded-section border border-warm-border/80 bg-[linear-gradient(145deg,#F6F0E6_0%,#F3EDE2_54%,#FBF9F4_100%)] px-8 py-12 text-center shadow-[0_12px_34px_rgba(120,100,80,0.07)]">
          <h3
            style={{ fontFamily: "var(--font-display)" }}
            className="text-[28px] font-medium tracking-[-0.02em] sm:text-[36px]"
          >
            Ready to protect your calendar?
          </h3>

          <p className="mx-auto mt-3 max-w-md text-[15px] leading-[1.7] text-gray-500">
            Start free in a few minutes, or request a short setup call and
            we&apos;ll map your Gatekeeper flow with you.
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-4">
            <AuraButton href="/register" variant="primary">
              Start free
            </AuraButton>
            <AuraButton
              href="mailto:hello@expertgatekeeper.com"
              variant="secondary"
            >
              Request setup call
            </AuraButton>
          </div>
        </div>
      </section>

      <footer className="bg-transparent px-4 pb-8 pt-4 text-[12px] text-gray-500">
        <div className="mx-auto max-w-6xl">
          <div className="space-y-3 border-b border-warm-border-soft pb-7 leading-5">
            <p>
              GATE is built for consultants, coaches, mentors, and service
              providers who treat time as a premium asset.
            </p>
            <p>
              Features are continuously improved. Access codes, payment
              collection, calendar sync, and routing are available in phases.
            </p>
            <p>
              Questions? Contact us at{" "}
              <Link
                href="mailto:hello@expertgatekeeper.com"
                className="text-ink-soft underline"
              >
                hello@expertgatekeeper.com
              </Link>
              .
            </p>
          </div>

          <div className="grid gap-8 border-b border-warm-border-soft py-8 sm:grid-cols-2 md:grid-cols-4">
            {footerColumns.map((column) => (
              <div key={column.title}>
                <h4 className="font-semibold text-ink">
                  {column.title}
                </h4>
                <ul className="mt-3 space-y-2">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="hover:text-ink-soft hover:underline"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex flex-col justify-between gap-4 pt-6 md:flex-row">
            <p>© 2026 GATE. All rights reserved.</p>

            <div className="flex flex-wrap gap-3">
              <Link href="/privacy">Privacy Policy</Link>
              <span>|</span>
              <Link href="/terms">Terms of Use</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
