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
      "Require leads to qualify before they ever see your calendar. Bad-fit requests are filtered before they waste your time.",
    icon: ShieldCheck,
    badge: "Flagship",
  },
  {
    title: "Trust Engine",
    description:
      "Add testimonials, authority markers, and credibility signals exactly where prospects decide whether to book.",
    icon: Sparkles,
    badge: "Conversion",
  },
  {
    title: "The Toll Booth",
    description:
      "Turn access into a controlled asset with access codes now, and paid booking flows when you are ready.",
    icon: CreditCard,
    badge: "Revenue",
  },
  {
    title: "Service Tiles",
    description:
      "Sell outcomes like strategy sessions, audits, and mentoring offers instead of generic 30-minute slots.",
    icon: LayoutTemplate,
    badge: "Storefront",
  },
  {
    title: "Verified Signals",
    description:
      "Show experience highlights, social proof, and client outcomes so the expert page feels premium and trustworthy.",
    icon: BadgeCheck,
    badge: "Trust",
  },
  {
    title: "Branded QR Links",
    description:
      "Turn LinkedIn banners, decks, business cards, and live events into direct paths to qualified bookings.",
    icon: QrCode,
    badge: "Distribution",
  },
];

export function FeatureSection() {
  return (
    <section className="relative overflow-hidden border-b border-slate-200/70 bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.28),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.16),_transparent_30%)]" />

      <div className="relative mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="secondary" className="border-white/10 bg-white/10 text-white">
            Core product features
          </Badge>

          <h2 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Built to filter, convert, and monetize expert time
          </h2>

          <p className="mt-5 text-lg leading-8 text-slate-300">
            This is not a scheduler. It is a premium conversion system for
            mentors, consultants, and solo experts who only want qualified leads.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <Card
                key={feature.title}
                className="group overflow-hidden border-white/10 bg-white/[0.06] text-white shadow-2xl shadow-black/20 backdrop-blur hover:border-white/20 hover:bg-white/[0.09]"
              >
                <CardHeader className="space-y-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-white text-slate-950 shadow-lg shadow-black/20 transition-transform duration-300 group-hover:scale-105">
                      <Icon className="size-5" />
                    </div>

                    <Badge
                      variant="secondary"
                      className="border-white/10 bg-white/10 text-white"
                    >
                      {feature.badge}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <CardTitle className="text-xl text-white">
                      {feature.title}
                    </CardTitle>
                    <CardDescription className="text-sm leading-6 text-slate-300">
                      {feature.description}
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm leading-6 text-slate-300">
                    Designed to make professionals look more selective, more
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