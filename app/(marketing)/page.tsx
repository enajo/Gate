import Link from "next/link";
import {
  CalendarCheck,
  Check,
  ChevronRight,
  CircleCheck,
  LockKeyhole,
  QrCode,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const footerColumns = [
  {
    title: "Product",
    links: ["Gatekeeper", "Expert Pages", "Access Codes", "Bookings"],
  },
  {
    title: "For Professionals",
    links: ["Consultants", "Mentors", "Fractional CXOs", "Coaches"],
  },
  {
    title: "Resources",
    links: ["How it works", "Demo", "Pricing", "Support"],
  },
  {
    title: "Company",
    links: ["About", "Contact", "Privacy", "Terms"],
  },
];

const cards = [
  {
    title: "The Gatekeeper",
    subtitle: "Only qualified leads unlock your calendar.",
    body: "Ask the right questions up front and automatically qualify every visitor before they can book.",
    icon: ShieldCheck,
    mockup: "qualification",
  },
  {
    title: "Trust Engine",
    subtitle: "Show proof before the client decides.",
    body: "Share testimonials, client results, and authority signals that help serious buyers move faster.",
    icon: Sparkles,
    mockup: "trust",
  },
  {
    title: "Access Codes",
    subtitle: "Control who gets through during beta.",
    body: "Invite the right people with private access codes and manage entry with precision.",
    icon: LockKeyhole,
    mockup: "code",
  },
  {
    title: "Branded QR Links",
    subtitle: "Turn offline attention into qualified bookings.",
    body: "Share your branded QR link anywhere. Every scan goes through your Gatekeeper.",
    icon: QrCode,
    mockup: "qr",
  },
];

const pricingTiers = [
  {
    name: "Solo Expert",
    label: "Start here",
    price: "$0",
    suffix: "/mo",
    fee: "5% transaction fee",
    description:
      "For independent experts who want to stop noisy, low-fit calls without a monthly commitment.",
    features: [
      "Unlimited Gatekeeper forms",
      "Standard expert page",
      "Lead qualification rules",
    ],
    highlighted: false,
  },
  {
    name: "Fractional Pro",
    label: "Sweet spot",
    price: "$49",
    suffix: "/mo",
    fee: "1% transaction fee",
    description:
      "For premium consultants and fractional leaders who want revenue control, status, and trust.",
    features: [
      "Custom domain",
      "No Gate branding",
      "Escrow and refund logic",
      "Priority booking workflows",
    ],
    highlighted: true,
  },
  {
    name: "Elite Agency",
    label: "White glove",
    price: "Custom",
    suffix: "",
    fee: "Starting at volume pricing",
    description:
      "For teams and multi-mentor businesses managing high-value demand at scale.",
    features: ["Multi-mentor dashboards", "CRM/API access", "Priority support"],
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

function HeroVisual() {
  return (
    <div className="relative mx-auto -mt-4 flex w-full max-w-7xl items-center justify-center overflow-visible">
      <img
        src="/hero-image.png"
        alt="Expert Gatekeeper dashboard preview"
        className="w-full max-w-[1150px] object-contain"
      />
    </div>
  );
}

function GatekeeperVisual() {
  return (
    <div className="mx-auto mt-20 w-full max-w-5xl rounded-[2.25rem] border border-warm-border/80 bg-white/60 p-5 shadow-warm-lg backdrop-blur">
      <div className="flex h-8 items-center gap-2 border-b border-warm-border px-2">
        <span className="size-3 rounded-full bg-brand-amber/50" />
        <span className="size-3 rounded-full bg-warm-gray/35" />
        <span className="size-3 rounded-full bg-slate-300" />
      </div>

      <div className="grid gap-5 p-6 md:grid-cols-3">
        <div className="card-glass p-7 text-left">
          <p className="text-sm font-medium text-ink">
            Qualification Form
          </p>

          <p className="mt-5 text-[13px] leading-5 text-gray-500">
            What is your primary goal for this engagement?
          </p>

          <div className="mt-5 space-y-3">
            {[
              "Strategy & advisory",
              "Operational improvement",
              "Fundraising",
              "Other",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-xl border border-warm-stone px-4 py-3 text-[12px] text-gray-500"
              >
                <span className="size-3 rounded-full border border-warm-gray" />
                {item}
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl bg-ink-soft py-3 text-center text-[13px] text-white">
            Submit
          </div>
        </div>

        <div className="card-glass p-7 text-center">
          <p className="text-sm font-medium text-ink">
            Qualification Score
          </p>

          <p className="mt-8 text-[64px] font-normal leading-none text-success">
            92
          </p>

          <p className="mt-2 text-[20px] text-success">Qualified</p>

          <div className="mt-7 space-y-2 text-left text-[12px] text-gray-500">
            {[
              "Company size",
              "Budget range",
              "Project scope",
              "Decision authority",
            ].map((item) => (
              <p key={item} className="flex items-center gap-2">
                <CircleCheck className="size-3 text-success" />
                {item}
              </p>
            ))}
          </div>
        </div>

        <div className="card-glass p-7 text-left">
          <p className="text-sm font-medium text-ink">Calendar Access</p>
          <p className="mt-5 text-[13px] text-gray-500">Select a time</p>

          <div className="mt-5 rounded-2xl border border-warm-stone p-4">
            <div className="flex items-center justify-between text-[12px] text-ink">
              <span>May 2026</span>
              <span>›</span>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-2 text-center text-[11px] text-gray-500">
              {[
                "S",
                "M",
                "T",
                "W",
                "T",
                "F",
                "S",
                ...Array.from({ length: 31 }, (_, i) => String(i + 1)),
              ].map((day, index) => (
                <span
                  key={`${day}-${index}`}
                  className={
                    day === "14"
                      ? "rounded-lg bg-brand-amber py-1 text-ink"
                      : "py-1"
                  }
                >
                  {day}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureMockup({ type }: { type: string }) {
  if (type === "qr") {
    return (
      <div className="mx-auto mt-16 flex h-56 max-w-sm items-center justify-center rounded-card bg-white/75 shadow-warm-lg">
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 25 }, (_, i) => (
            <span
              key={i}
              className={`size-5 ${
                i % 3 === 0 || i % 7 === 0 ? "bg-ink" : "bg-warm-stone"
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  if (type === "code") {
    return (
      <div className="mx-auto mt-16 max-w-sm rounded-card bg-white/75 p-8 text-left text-ink shadow-warm-lg">
        <p className="text-[13px] text-gray-500">Access Code</p>

        <div className="mt-4 rounded-xl border border-warm-stone px-4 py-3 font-mono tracking-[0.35em]">
          GATE2026
        </div>

        <p className="mt-7 text-[13px] text-gray-500">Usage</p>

        <div className="mt-3 h-2 rounded-full bg-warm-stone">
          <div className="h-2 w-1/2 rounded-full bg-brand-amber" />
        </div>

        <p className="mt-3 text-[13px] text-gray-500">48 / 100</p>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-16 h-56 max-w-sm rounded-card bg-white/75 shadow-warm-lg" />
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
            <Link href="#gatekeeper">Gatekeeper</Link>
            <Link href="#features">Features</Link>
            <Link href="#pricing">Pricing</Link>
            <Link href="/demo">Demo</Link>
            <Link href="/login">Login</Link>
            <Link href="/register">Register</Link>
          </div>
        </nav>
      </header>

      <section className="relative overflow-hidden text-center">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(223,167,103,0.18),transparent_34%),radial-gradient(circle_at_70%_35%,rgba(71,85,105,0.10),transparent_32%),linear-gradient(180deg,rgba(249,250,251,0.86)_0%,rgba(246,242,234,0.58)_58%,rgba(243,237,226,0.68)_100%)]" />

        <div className="relative mx-auto min-h-[650px] max-w-7xl px-4 pt-12">
          <h1 className="text-[42px] font-semibold leading-none tracking-[-0.045em] sm:text-[58px]">
            Expert Gatekeeper
          </h1>

          <p className="mt-3 text-[20px] font-normal leading-tight tracking-[-0.03em]">
            Your Time is a High-Value Asset. Treat it like one.
          </p>

          <div className="mt-6 flex justify-center gap-4">
            <AuraButton href="/register" variant="primary">
              Learn more
            </AuraButton>
            <AuraButton href="/demo" variant="secondary">
              See demo
            </AuraButton>
          </div>

          <HeroVisual />
        </div>
      </section>

      <section id="gatekeeper" className="relative overflow-hidden text-center">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(223,167,103,0.15),transparent_30%),radial-gradient(circle_at_80%_45%,rgba(71,85,105,0.09),transparent_30%),linear-gradient(180deg,rgba(243,237,226,0.76)_0%,rgba(249,250,251,0.52)_48%,rgba(243,237,226,0.72)_100%)]" />

        <div className="relative mx-auto min-h-[820px] max-w-7xl px-4 pt-24">
          <h2 className="text-[54px] font-semibold leading-none tracking-[-0.045em] sm:text-[68px]">
            The Gatekeeper
          </h2>

          <p className="mt-4 text-[27px] font-normal leading-tight tracking-[-0.03em]">
            Qualification before calendar access.
          </p>

          <div className="mt-7 flex justify-center gap-4">
            <AuraButton href="/register" variant="primary">
              Learn more
            </AuraButton>
            <AuraButton href="/john-carter" variant="secondary">
              See how it works
            </AuraButton>
          </div>

          <GatekeeperVisual />
        </div>
      </section>

      <section
        id="features"
        className="grid gap-3 bg-transparent p-3 md:grid-cols-2"
      >
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.title}
              className="min-h-[620px] overflow-hidden rounded-card bg-[linear-gradient(145deg,rgba(255,255,255,0.54),rgba(243,237,226,0.76))] p-12 text-ink shadow-warm-sm"
            >
              <Icon className="size-10 text-brand-amber" />

              <h3 className="mt-7 max-w-md text-[34px] font-semibold leading-tight tracking-[-0.04em]">
                {card.title}
              </h3>

              <p className="mt-4 max-w-md text-[21px] font-normal leading-7">
                {card.subtitle}
              </p>

              <p className="mt-5 max-w-sm text-[15px] leading-6 text-gray-500">
                {card.body}
              </p>

              <Link
                href="/register"
                className="mt-6 inline-flex items-center text-[15px] font-normal text-ink-soft hover:underline"
              >
                Learn more <ChevronRight className="size-4" />
              </Link>

              <FeatureMockup type={card.mockup} />
            </div>
          );
        })}
      </section>

      <section id="pricing" className="relative overflow-hidden bg-transparent px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs uppercase tracking-[0.26em] text-brand-amber">
              Pricing
            </p>

            <h2 className="mt-4 text-[34px] font-semibold leading-tight tracking-[-0.045em] sm:text-[42px]">
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
              const isElite = tier.name === "Elite Agency";

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
                      {isElite ? (
                        <AuraButton href="/demo" variant="text">
                          Talk to sales <ChevronRight className="size-4" />
                        </AuraButton>
                      ) : isPro ? (
                        <AuraButton href="/register" variant="gold">
                          Upgrade to Pro
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

          <div className="mx-auto mt-14 grid max-w-5xl gap-6 lg:grid-cols-[1.35fr_0.9fr]">
            <div className="relative overflow-hidden rounded-section bg-[radial-gradient(circle_at_bottom_right,rgba(223,167,103,0.16),transparent_32%),linear-gradient(145deg,#1B1B1B_0%,#252525_45%,#171717_100%)] px-8 py-8 text-warm-cream shadow-[0_18px_50px_rgba(0,0,0,0.16)]">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.04),transparent_42%)]" />

              <div className="relative">
                <p className="text-xs uppercase tracking-[0.22em] text-brand-amber">
                  Savings calculator
                </p>

                <h3 className="mt-4 max-w-xl text-[22px] font-semibold leading-tight tracking-[-0.04em]">
                  If 8 of 10 discovery calls are unqualified, GATE protects 4
                  hours every week.
                </h3>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
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

                <p className="mt-5 text-[13px] leading-6 text-warm-border-soft">
                  What is one protected hour of your attention worth?
                </p>
              </div>
            </div>

            <div className="space-y-5">
              {faqs.map((faq) => (
                <div
                  key={faq.question}
                  className="border-b border-warm-border-soft pb-5"
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

          <div className="mx-auto mt-14 flex max-w-5xl flex-col items-start justify-between gap-5 border-t border-warm-border-soft pt-8 md:flex-row md:items-center">
            <div>
              <h3 className="text-[24px] font-semibold tracking-[-0.04em]">
                Want concierge setup?
              </h3>

              <p className="mt-2 max-w-xl text-[14px] leading-[1.7] text-gray-500">
                For high-traffic experts and teams, request a short setup call
                and we’ll map your Gatekeeper flow.
              </p>
            </div>

            <AuraButton href="/demo" variant="secondary">
              Request demo
            </AuraButton>
          </div>
        </div>
      </section>

      <footer className="bg-transparent px-4 pb-8 pt-12 text-[12px] text-gray-500">
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
                    <li key={link}>
                      <Link
                        href="#"
                        className="hover:text-ink-soft hover:underline"
                      >
                        {link}
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
              <Link href="#">Privacy Policy</Link>
              <span>|</span>
              <Link href="#">Terms of Use</Link>
              <span>|</span>
              <Link href="#">Legal</Link>
              <span>|</span>
              <Link href="#">Site Map</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}