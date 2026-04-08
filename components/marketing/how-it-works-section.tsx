import {
  ArrowRight,
  CalendarCheck2,
  LayoutPanelTop,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const steps = [
  {
    number: "01",
    title: "Create your page",
    description:
      "Set up your profile, headline, services, and public page from your dashboard. Publish one professional link that represents your expertise properly.",
    icon: LayoutPanelTop,
    points: [
      "Claim your slug",
      "Add your profile and offer",
      "Publish your expert page",
    ],
  },
  {
    number: "02",
    title: "Add qualification questions",
    description:
      "Build your Gatekeeper with a few smart questions and a simple rule: if the lead is a fit, allow booking. If not, reject or redirect.",
    icon: ShieldCheck,
    points: [
      "Ask 3 focused questions",
      "Set allow / reject / redirect logic",
      "Protect your time automatically",
    ],
  },
  {
    number: "03",
    title: "Only qualified people can book",
    description:
      "Clients move through your page, answer the questions, and only accepted leads unlock available slots and complete booking.",
    icon: CalendarCheck2,
    points: [
      "Accepted leads see slots",
      "Rejected leads get the right next step",
      "Booking stays premium and controlled",
    ],
  },
];

export function HowItWorksSection() {
  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="secondary">How it works</Badge>

          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            A gated booking flow built for professionals
          </h2>

          <p className="mt-4 text-lg leading-8 text-slate-600">
            Instead of sending everyone straight to a calendar, you create a
            page that filters, qualifies, and converts clients before they get
            access to your time.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <Card
                key={step.number}
                className="relative rounded-2xl border-slate-200 bg-white shadow-sm"
              >
                <CardHeader className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-slate-900 text-white">
                      <Icon className="size-5" />
                    </div>

                    <span className="text-xs font-semibold tracking-[0.14em] text-slate-400">
                      {step.number}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <CardTitle className="text-xl">{step.title}</CardTitle>
                    <p className="text-sm leading-6 text-slate-600">
                      {step.description}
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <ul className="space-y-3">
                    {step.points.map((point) => (
                      <li key={point} className="flex items-start gap-3">
                        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-slate-900" />
                        <span className="text-sm text-slate-700">{point}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                {index < steps.length - 1 ? (
                  <div className="pointer-events-none absolute -right-3 top-1/2 hidden -translate-y-1/2 lg:block">
                    <div className="flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
                      <ArrowRight className="size-4 text-slate-500" />
                    </div>
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>

        <div className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 p-6 lg:p-8">
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-10">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                What the client experiences
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                Learn. Qualify. Unlock booking.
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Clients land on the expert page, read the profile and service
                details, answer the Gatekeeper questions, and only qualified
                people get access to available slots.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Step A
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  Visit the expert page
                </p>
              </div>

              <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Step B
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  Answer qualification questions
                </p>
              </div>

              <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Step C
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  Get accepted or redirected
                </p>
              </div>

              <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Step D
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  Book only if qualified
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}