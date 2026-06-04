import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
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
    description: "Turn positioning and trust into booked sessions.",
    icon: Sparkles,
  },
  {
    title: "Monetize",
    description: "Route every visitor to the right next offer.",
    icon: WalletCards,
  },
];

const flowSteps = [
  "Client clicks your expert link",
  "Answers your qualification questions",
  "Only qualified leads unlock booking",
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-slate-200/70 bg-gradient-to-br from-white via-slate-50 to-indigo-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(79,70,229,0.16),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(15,23,42,0.12),_transparent_32%)]" />

      <div className="relative mx-auto grid w-full max-w-7xl gap-14 px-4 py-20 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:py-28">
        <div className="flex flex-col justify-center">
          <Badge variant="secondary" className="w-fit">
            Built for solo experts, mentors, and consultants
          </Badge>

          <div className="mt-7 max-w-4xl space-y-6">
            <h1 className="text-5xl font-bold tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
              Stop letting anyone book your time.
            </h1>

            <p className="max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
              Expert Gatekeeper is your premium front desk: it filters leads,
              sells your value, and only unlocks your calendar for people who
              qualify.
            </p>
          </div>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
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
                  className="rounded-3xl border border-white/70 bg-white/75 p-5 shadow-xl shadow-slate-200/70 backdrop-blur"
                >
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-900/20">
                    <Icon className="size-5" />
                  </div>

                  <h3 className="mt-4 text-sm font-bold text-slate-950">
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
          <Card className="w-full overflow-hidden">
            <CardHeader className="space-y-4 border-b border-white/10 bg-slate-950 text-white">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                  <ShieldCheck className="size-6" />
                </div>

                <div>
                  <CardTitle className="text-xl text-white">
                    Your AI Front Desk
                  </CardTitle>
                  <CardDescription className="text-slate-300">
                    Qualify first. Route second. Book last.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 p-7">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">
                  Apply-to-book flow
                </p>

                <ul className="mt-5 space-y-4">
                  {flowSteps.map((step, index) => (
                    <li key={step} className="flex items-start gap-3">
                      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white">
                        {index + 1}
                      </div>
                      <span className="text-sm font-medium leading-7 text-slate-700">
                        {step}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-3xl border border-dashed border-indigo-200 bg-indigo-50 p-5">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-950">
                  <CalendarDays className="size-4" />
                  Calendar stays protected
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Unqualified visitors never see your availability. They are
                  redirected to a better next step.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {["Filter noise", "Build trust", "Monetize access"].map(
                  (item) => (
                    <div
                      key={item}
                      className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
                    >
                      <CheckCircle2 className="size-4 text-indigo-600" />
                      <p className="mt-3 text-sm font-bold text-slate-950">
                        {item}
                      </p>
                    </div>
                  ),
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}