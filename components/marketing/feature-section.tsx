import {
  BadgeCheck,
  CreditCard,
  LayoutTemplate,
  QrCode,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    title: "The Gatekeeper",
    description:
      "Require leads to qualify before they ever see the calendar. Filter out bad-fit requests and protect expert time.",
    icon: ShieldCheck,
    badge: "Flagship feature",
  },
  {
    title: "Trust Engine",
    description:
      "Use testimonials, credibility signals, and premium positioning to turn qualified visitors into paying bookings.",
    icon: Sparkles,
    badge: "Conversion layer",
  },
  {
    title: "The Toll Booth",
    description:
      "Turn access into a paid asset with access codes, paid entry, and controlled booking flow.",
    icon: CreditCard,
    badge: "Monetization",
  },
  {
    title: "Productized Service Tiles",
    description:
      "Sell outcomes, not generic time slots. Present strategy sessions, audits, and mentoring offers like premium products.",
    icon: LayoutTemplate,
    badge: "Storefront",
  },
  {
    title: "Social Proof + Verified Signals",
    description:
      "Show testimonials, experience highlights, and authority markers right where a client decides whether to book.",
    icon: BadgeCheck,
    badge: "Trust builder",
  },
  {
    title: "Branded QR Distribution",
    description:
      "Turn offline attention into instant bookings with premium QR links for banners, cards, decks, and events.",
    icon: QrCode,
    badge: "Unfair advantage",
  },
];

export function FeatureSection() {
  return (
    <section className="border-b border-slate-200 bg-slate-50/50">
      <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="secondary">Core product features</Badge>

          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Built to filter, convert, and monetize expert time
          </h2>

          <p className="mt-4 text-lg leading-8 text-slate-600">
            This is not a scheduler. It is a conversion system for mentors,
            consultants, and solo experts who want qualified leads only.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <Card
                key={feature.title}
                className="rounded-2xl border-slate-200 bg-white shadow-sm transition-transform hover:-translate-y-0.5"
              >
                <CardHeader className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-slate-900 text-white">
                      <Icon className="size-5" />
                    </div>

                    <Badge variant="outline">{feature.badge}</Badge>
                  </div>

                  <div className="space-y-1">
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <CardDescription className="text-sm leading-6">
                      {feature.description}
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Designed to help professionals look more selective, more
                    credible, and more premium.
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}