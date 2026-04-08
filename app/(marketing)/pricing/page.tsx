import Link from "next/link";
import { Check, ShieldCheck } from "lucide-react";

import { SectionHeading } from "@/components/shared/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const plans = [
  {
    name: "Starter",
    price: "Free",
    description:
      "For early experts setting up their first gated booking page.",
    features: [
      "Public expert page",
      "Service tiles",
      "Gatekeeper questions",
      "Basic qualification rules",
      "Manual access code flow",
    ],
    ctaLabel: "Get started",
    ctaHref: "/register",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "Coming soon",
    description:
      "For professionals who want a full front-desk workflow with calendar control and advanced monetization.",
    features: [
      "Everything in Starter",
      "Calendar connections",
      "Conflict checking",
      "Default event calendar",
      "Advanced routing and booking controls",
      "Priority support",
    ],
    ctaLabel: "Join waitlist",
    ctaHref: "/register",
    highlighted: true,
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="border-b border-slate-200 bg-slate-50/50">
        <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <SectionHeading
            align="center"
            badge="Pricing"
            title="Simple pricing for experts who want control over their time"
            description="Start free while you shape your expert storefront and qualification flow. Upgrade later when you want deeper calendar and monetization features."
            maxWidth="2xl"
          />

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`rounded-2xl border-slate-200 shadow-sm ${
                  plan.highlighted ? "ring-1 ring-slate-900/10" : ""
                }`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-2xl">{plan.name}</CardTitle>
                      <CardDescription className="mt-2 text-sm leading-6">
                        {plan.description}
                      </CardDescription>
                    </div>

                    {plan.highlighted ? (
                      <Badge variant="secondary">Best for growth</Badge>
                    ) : null}
                  </div>

                  <div className="pt-4">
                    <p className="text-3xl font-semibold tracking-tight text-slate-900">
                      {plan.price}
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <div className="mt-0.5 flex size-5 items-center justify-center rounded-full bg-slate-900 text-white">
                          <Check className="size-3.5" />
                        </div>
                        <span className="text-sm text-slate-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button asChild className="w-full" variant={plan.highlighted ? "default" : "outline"}>
                    <Link href={plan.ctaHref}>{plan.ctaLabel}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-start gap-4">
              <div className="flex size-11 items-center justify-center rounded-xl bg-slate-900 text-white">
                <ShieldCheck className="size-5" />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Early access pricing note
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  The product roadmap originally envisioned a beta phase with early
                  professional users testing the gated booking flow before full paid
                  rollout. This page keeps that spirit: easy entry now, deeper paid
                  workflow later.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}