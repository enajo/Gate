import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const corePillars = [
  {
    title: "Filter",
    description: "Qualify every lead before they ever see the calendar.",
    icon: ShieldCheck,
  },
  {
    title: "Convert",
    description: "Turn trust, positioning, and exclusivity into booked sessions.",
    icon: Sparkles,
  },
  {
    title: "Monetize",
    description: "Protect expert time and route every visitor to the right offer.",
    icon: WalletCards,
  },
];

const flowSteps = [
  "Client clicks your link",
  "Answers your qualification questions",
  "Only qualified leads unlock booking",
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-slate-200 bg-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.06),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(99,102,241,0.08),_transparent_30%)]" />

      <div className="relative mx-auto grid w-full max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-28">
        <div className="flex flex-col justify-center">
          <Badge variant="secondary" className="w-fit">
            Built for solo experts, mentors, and consultants
          </Badge>

          <div className="mt-6 max-w-3xl space-y-6">
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Stop letting anyone book your time.
            </h1>

            <p className="max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
              Expert Gatekeeper is the AI-powered front desk that filters,
              sells, and monetizes access to your expertise before a lead ever
              touches your calendar.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/register">
                Get started
                <ArrowRight className="size-4" />
              </Link>
            </Button>

            <Button asChild variant="outline" size="lg">
              <Link href="/demo">See demo</Link>
            </Button>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {corePillars.map((pillar) => {
              const Icon = pillar.icon;

              return (
                <div
                  key={pillar.title}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
                >
                  <div className="flex size-10 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-200">
                    <Icon className="size-5 text-slate-900" />
                  </div>

                  <h3 className="mt-4 text-sm font-semibold text-slate-900">
                    {pillar.title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {pillar.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center">
          <Card className="w-full rounded-2xl border-slate-200 shadow-xl shadow-slate-200/50">
            <CardHeader className="space-y-4 border-b border-slate-200 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-xl bg-slate-900 text-white">
                  <ShieldCheck className="size-6" />
                </div>

                <div>
                  <CardTitle className="text-xl">Your AI Front Desk</CardTitle>
                  <CardDescription>
                    Qualify first. Route second. Book last.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 p-6">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                  Apply-to-book flow
                </p>

                <ul className="mt-4 space-y-3">
                  {flowSteps.map((step, index) => (
                    <li key={step} className="flex items-start gap-3">
                      <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                        {index + 1}
                      </div>
                      <span className="text-sm text-slate-700">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                  <CalendarDays className="size-4" />
                  Calendar stays protected
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Only qualified leads get access to your available slots.
                  Everyone else is redirected to the right next step.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-slate-100 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Gatekeeper
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    Filter noise
                  </p>
                </div>

                <div className="rounded-lg bg-slate-100 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Trust engine
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    Convert faster
                  </p>
                </div>

                <div className="rounded-lg bg-slate-100 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Toll booth
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    Monetize access
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}