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
  // Rectangular, double-bordered (a solid border plus a separate offset
  // outline — a stamp/medallion edge, not a modern ring), pressed-paper
  // shadow instead of a floating drop shadow. No pill radius, no gradient.
  const styles = {
    primary:
      "border-[#7B1E3A] bg-[#7B1E3A] outline-[#7B1E3A] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-1px_0_rgba(0,0,0,0.18)] hover:brightness-110",
    secondary:
      "border-[#7B1E3A] bg-transparent outline-[#7B1E3A] text-[#7B1E3A] shadow-[inset_0_1px_0_rgba(255,255,255,0.6),inset_0_-1px_0_rgba(123,30,58,0.08)] hover:bg-[#7B1E3A]/[0.06]",
    gold:
      "border-[#a84a66] bg-[#7B1E3A] outline-[#a84a66]/60 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-1px_0_rgba(0,0,0,0.25)] hover:brightness-110",
    text: "border-transparent bg-transparent px-0 text-ink-soft hover:text-ink",
  };

  const textShadow =
    variant === "primary" || variant === "gold"
      ? { textShadow: "0 1px 0 rgba(0,0,0,0.2)" }
      : undefined;

  const combinedClassName = `inline-flex h-11 items-center justify-center rounded-[3px] border-[1.5px] outline outline-[1px] outline-offset-[3px] px-6 text-[14px] font-medium uppercase tracking-[0.06em] transition duration-150 ease-out active:translate-y-px ${styles[variant]} ${className}`;
  const combinedStyle = { fontFamily: "var(--font-display)", ...textShadow };

  // A same-page hash anchor gets a plain <a> — see the comment by the nav
  // links above on why next/link doesn't reliably land on these.
  if (href.startsWith("#")) {
    return (
      <a href={href} style={combinedStyle} className={combinedClassName}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} style={combinedStyle} className={combinedClassName}>
      {children}
    </Link>
  );
}

/** A single hand-wobbled line marking the seam between two sections, instead of a plain border. */
function SectionDivider() {
  return (
    <div className="flex justify-center py-2" aria-hidden="true">
      <svg viewBox="0 0 160 20" className="h-4 w-40 opacity-40">
        <path
          d="M4,10 C30,4 40,16 64,9 C88,3 96,15 120,8 C136,4 148,12 156,9"
          fill="none"
          stroke="#8C2A47"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export default function MarketingHomePage() {
  return (
    <main className="min-h-screen bg-white text-ink">
      <header className="sticky top-0 z-50 border-b border-[#8C2A47]/25 bg-white/70 backdrop-blur-xl">
        <nav className="mx-auto flex h-12 max-w-6xl items-center justify-between px-4 text-[12px] text-ink">
          <Link href="/" className="font-medium tracking-wide">
            GATE
          </Link>

          <div className="hidden items-center gap-8 text-gray-700 md:flex">
            {/* Plain <a> tags, not next/link — these are same-page hash
                anchors, and next/link's App Router click handler always
                calls preventDefault() and routes the click through a full
                client-side navigation dispatch even for a bare "#id" href,
                which doesn't reliably land on (or scroll to) the target. A
                native anchor lets the browser's own, reliable hash-scroll
                (which does respect scroll-mt-*) handle it instead. */}
            <a href="#how-it-works">How it works</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
            <Link href="/login">Login</Link>
            <Link href="/register">Register</Link>
          </div>
        </nav>
      </header>

      <section className="relative overflow-hidden bg-white text-center">
        {/* topographic contour lines — confined to the margins via a mask */}
        <svg
          className="pointer-events-none absolute inset-x-0 top-[460px] h-[300px] w-full [mask-image:linear-gradient(to_right,black_0%,transparent_22%,transparent_78%,black_100%)]"
          viewBox="0 0 640 300"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M-10,210 C80,185 150,225 240,195 C320,170 380,205 460,185 C530,168 580,195 650,175" fill="none" stroke="#A98A91" strokeWidth="1.3" opacity="0.4" />
          <path d="M-10,245 C70,222 160,255 250,230 C330,208 400,238 480,222 C550,208 600,230 650,215" fill="none" stroke="#A98A91" strokeWidth="1.3" opacity="0.3" />
          <path d="M-10,278 C90,258 170,285 260,265 C340,247 410,270 490,258 C560,247 610,264 650,253" fill="none" stroke="#A98A91" strokeWidth="1.3" opacity="0.22" />
        </svg>

        {/* brick-coursing motif — the geometric counterpoint to the organic
            contour lines below, mirrored at both margins, sitting just
            above where the contour "waves" begin (top-[460px]) the way a
            mason's wall sits above a hillside */}
        <svg
          className="pointer-events-none absolute left-0 top-[364px] h-24 w-32 opacity-[0.22]"
          viewBox="0 0 130 96"
          aria-hidden="true"
        >
          <g fill="none" stroke="#8a6a46" strokeWidth="1.1">
            <rect x="-12" y="2" width="38" height="16" opacity="0.5" />
            <rect x="28" y="2" width="38" height="16" opacity="0.5" />
            <rect x="68" y="2" width="38" height="16" opacity="0.5" />
            <rect x="108" y="2" width="38" height="16" opacity="0.5" />

            <rect x="8" y="22" width="38" height="16" opacity="0.4" />
            <rect x="48" y="22" width="38" height="16" opacity="0.4" />
            <rect x="88" y="22" width="38" height="16" opacity="0.4" />

            <rect x="-12" y="42" width="38" height="16" opacity="0.3" />
            <rect x="28" y="42" width="38" height="16" opacity="0.3" />
            <rect x="68" y="42" width="38" height="16" opacity="0.3" />
            <rect x="108" y="42" width="38" height="16" opacity="0.3" />

            <rect x="8" y="62" width="38" height="16" opacity="0.2" />
            <rect x="48" y="62" width="38" height="16" opacity="0.2" />
            <rect x="88" y="62" width="38" height="16" opacity="0.2" />
          </g>
        </svg>
        <svg
          className="pointer-events-none absolute right-0 top-[364px] h-24 w-32 scale-x-[-1] opacity-[0.22]"
          viewBox="0 0 130 96"
          aria-hidden="true"
        >
          <g fill="none" stroke="#8a6a46" strokeWidth="1.1">
            <rect x="-12" y="2" width="38" height="16" opacity="0.5" />
            <rect x="28" y="2" width="38" height="16" opacity="0.5" />
            <rect x="68" y="2" width="38" height="16" opacity="0.5" />
            <rect x="108" y="2" width="38" height="16" opacity="0.5" />

            <rect x="8" y="22" width="38" height="16" opacity="0.4" />
            <rect x="48" y="22" width="38" height="16" opacity="0.4" />
            <rect x="88" y="22" width="38" height="16" opacity="0.4" />

            <rect x="-12" y="42" width="38" height="16" opacity="0.3" />
            <rect x="28" y="42" width="38" height="16" opacity="0.3" />
            <rect x="68" y="42" width="38" height="16" opacity="0.3" />
            <rect x="108" y="42" width="38" height="16" opacity="0.3" />

            <rect x="8" y="62" width="38" height="16" opacity="0.2" />
            <rect x="48" y="62" width="38" height="16" opacity="0.2" />
            <rect x="88" y="62" width="38" height="16" opacity="0.2" />
          </g>
        </svg>

        <div className="relative mx-auto max-w-4xl px-4 pb-20 pt-16">
          {/* graph-paper zone — just the eyebrow, headline, and subhead.
              The mask is a handful of irregular, unevenly-sized blobs, not a
              softened rectangle, so the grid's edge is genuinely uneven. */}
          <div
            className="mx-auto max-w-2xl rounded-sm px-3 py-4 sm:px-6"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, rgba(123,30,58,0.15) 0px, rgba(123,30,58,0.15) 1px, transparent 1px, transparent 25px), repeating-linear-gradient(90deg, rgba(123,30,58,0.15) 0px, rgba(123,30,58,0.15) 1px, transparent 1px, transparent 25px)",
              WebkitMaskImage:
                "radial-gradient(ellipse 55% 65% at 22% 28%, black 25%, transparent 72%), radial-gradient(ellipse 70% 40% at 65% 15%, black 20%, transparent 68%), radial-gradient(ellipse 40% 70% at 85% 60%, black 22%, transparent 70%), radial-gradient(ellipse 65% 50% at 30% 80%, black 25%, transparent 72%), radial-gradient(ellipse 50% 55% at 75% 85%, black 20%, transparent 68%), radial-gradient(ellipse 60% 60% at 50% 50%, black 15%, transparent 60%)",
              maskImage:
                "radial-gradient(ellipse 55% 65% at 22% 28%, black 25%, transparent 72%), radial-gradient(ellipse 70% 40% at 65% 15%, black 20%, transparent 68%), radial-gradient(ellipse 40% 70% at 85% 60%, black 22%, transparent 70%), radial-gradient(ellipse 65% 50% at 30% 80%, black 25%, transparent 72%), radial-gradient(ellipse 50% 55% at 75% 85%, black 20%, transparent 68%), radial-gradient(ellipse 60% 60% at 50% 50%, black 15%, transparent 60%)",
            }}
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-[#7B1E3A]">
              Screening before scheduling
            </p>

            <h1
              style={{ fontFamily: "var(--font-display)" }}
              className="mx-auto mt-5 max-w-3xl text-[44px] font-medium leading-[1.05] tracking-[-0.02em] sm:text-[64px]"
            >
              Stop letting{" "}
              <span className="relative z-0 inline-block">
                anyone
                <svg
                  viewBox="0 0 220 100"
                  preserveAspectRatio="none"
                  className="pointer-events-none absolute -left-[9%] -top-[30%] -z-10 h-[170%] w-[118%]"
                  aria-hidden="true"
                >
                  <path
                    d="M72,10 C32,16 9,40 10,60 C11,82 44,97 102,98 C162,99 206,85 211,59 C215,37 192,13 142,8 C122,6 96,7 79,10 C76,11 74,12 72,13"
                    fill="none"
                    stroke="#f7c331"
                    strokeWidth="3"
                    strokeLinecap="round"
                    opacity="0.9"
                  />
                </svg>
              </span>{" "}
              book your time.
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-[18px] leading-[1.6] text-gray-500">
              Screen every lead with a conversation before showing open
              slots, so your calendar fills with meetings worth having.
            </p>
          </div>

          <div className="mt-8 flex justify-center gap-4">
            <AuraButton href="/register" variant="primary">
              Start free
            </AuraButton>
            <AuraButton href="#how-it-works" variant="secondary">
              See how it works
            </AuraButton>
          </div>

          <div className="mt-10">
            <HeroQualificationTeaser />
          </div>
        </div>
      </section>

      <SectionDivider />

      <section className="relative overflow-hidden px-4 py-16 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="relative overflow-hidden rounded-section bg-[radial-gradient(circle_at_bottom_right,rgba(123,30,58,0.16),transparent_32%),linear-gradient(145deg,#1B1B1B_0%,#252525_45%,#171717_100%)] px-8 py-10 text-warm-cream shadow-[0_18px_50px_rgba(0,0,0,0.16)]">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.04),transparent_42%)]" />

            <div className="relative">
              <p className="text-xs uppercase tracking-[0.22em] text-white">
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

      <SectionDivider />

      <HowItWorksSection />

      <SectionDivider />

      <section id="pricing" className="relative scroll-mt-20 overflow-hidden bg-transparent px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs uppercase tracking-[0.26em] text-[#7B1E3A]">
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
                      ? "relative overflow-hidden rounded-section bg-[radial-gradient(circle_at_top_left,rgba(123,30,58,0.15),transparent_34%),linear-gradient(145deg,#171717_0%,#282828_48%,#1B1B1B_100%)] px-7 py-8 text-warm-cream shadow-[0_18px_50px_rgba(0,0,0,0.18)] transition duration-500 ease-out hover:brightness-[1.03]"
                      : "relative overflow-hidden rounded-section border border-warm-border/80 bg-[linear-gradient(145deg,#f0f0ef_0%,#f0f0ef_54%,#fcfcfb_100%)] px-7 py-8 shadow-[0_12px_34px_rgba(120,100,80,0.07)] transition duration-500 ease-out hover:brightness-[1.015]"
                  }
                >
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.04),transparent_42%)]" />

                  <div className="relative">
                    <p
                      className={
                        isPro
                          ? "text-[11px] text-white"
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
                          ? "mt-1 text-xs text-white"
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
                          <Check
                            className={
                              isPro
                                ? "mt-0.5 size-3.5 shrink-0 text-white"
                                : "mt-0.5 size-3.5 shrink-0 text-[#7B1E3A]"
                            }
                          />
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

      <SectionDivider />

      <section id="faq" className="relative scroll-mt-20 overflow-hidden bg-transparent px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs uppercase tracking-[0.26em] text-[#7B1E3A]">
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

      <SectionDivider />

      <section className="relative overflow-hidden px-4 pb-24">
        <div className="mx-auto max-w-5xl rounded-section border border-warm-border/80 bg-[linear-gradient(145deg,#f0f0ef_0%,#f0f0ef_54%,#fcfcfb_100%)] px-8 py-12 text-center shadow-[0_12px_34px_rgba(120,100,80,0.07)]">
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

      <SectionDivider />

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
                      {link.href.includes("#") ? (
                        <a
                          href={link.href}
                          className="hover:text-ink-soft hover:underline"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="hover:text-ink-soft hover:underline"
                        >
                          {link.label}
                        </Link>
                      )}
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
