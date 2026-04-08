import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Layers3,
  ShieldCheck,
  UserCircle2,
} from "lucide-react";

import { PageShell } from "@/components/layout/page-shell";
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

const onboardingSteps = [
  {
    title: "Set up your profile",
    description:
      "Add your public identity, headline, bio, branding, and page slug.",
    href: "/app/profile",
    icon: UserCircle2,
    step: "01",
  },
  {
    title: "Create your services",
    description:
      "Define the offers people can apply for on your expert page.",
    href: "/app/services",
    icon: Layers3,
    step: "02",
  },
  {
    title: "Build your Gatekeeper",
    description:
      "Add qualification questions and rules that decide who gets access.",
    href: "/app/qualification",
    icon: ShieldCheck,
    step: "03",
  },
  {
    title: "Set your availability",
    description:
      "Configure weekly hours, blocked dates, and timezone settings.",
    href: "/app/availability",
    icon: Clock3,
    step: "04",
  },
  {
    title: "Connect your calendar",
    description:
      "Sync Google Calendar so conflicts are respected and events can be created.",
    href: "/app/calendars",
    icon: CalendarDays,
    step: "05",
  },
  {
    title: "Create access codes",
    description:
      "Control who can complete booking and keep your time private.",
    href: "/app/access-codes",
    icon: CreditCard,
    step: "06",
  },
];

export default function OnboardingPage() {
  return (
    <PageShell
      header={
        <SectionHeading
          badge="Onboarding"
          title="Launch your gated booking system"
          description="Work through these setup steps to publish a professional page that qualifies leads before they reach your calendar."
          maxWidth="full"
        />
      }
    >
      <div className="space-y-8">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-2xl">Your onboarding checklist</CardTitle>
            <CardDescription>
              Complete the core setup in order so your public flow works end to
              end.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {onboardingSteps.map((item) => {
              const Icon = item.icon;

              return (
                <Link key={item.href} href={item.href}>
                  <Card className="h-full rounded-2xl border-slate-200 transition-transform hover:-translate-y-0.5 hover:shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex size-11 items-center justify-center rounded-xl bg-slate-900 text-white">
                          <Icon className="size-5" />
                        </div>

                        <Badge variant="outline">{item.step}</Badge>
                      </div>

                      <h3 className="mt-4 text-base font-semibold text-slate-900">
                        {item.title}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {item.description}
                      </p>

                      <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-slate-900">
                        Open
                        <ArrowRight className="size-4" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>What “done” looks like</CardTitle>
            <CardDescription>
              Once setup is complete, your public flow should work like this:
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              "A visitor lands on your expert page",
              "They choose a service and answer qualification questions",
              "Only qualified leads unlock available slots",
              "Access codes control who can confirm the booking",
            ].map((item) => (
              <div
                key={item}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="size-3.5" />
                  </div>
                  <p className="text-sm text-slate-700">{item}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button asChild>
            <Link href="/app/profile">
              Begin with profile
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </PageShell>
  );
}