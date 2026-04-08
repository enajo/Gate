import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
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

const setupCards = [
  {
    title: "Complete your profile",
    description:
      "Set your public identity, headline, bio, branding, and expert page slug.",
    href: "/app/profile",
    icon: UserCircle2,
    badge: "Step 1",
  },
  {
    title: "Create your services",
    description:
      "Turn your sessions into productized offers with titles, pricing, and duration.",
    href: "/app/services",
    icon: Layers3,
    badge: "Step 2",
  },
  {
    title: "Build your Gatekeeper",
    description:
      "Add qualification questions and define rules for allow, reject, or redirect.",
    href: "/app/qualification",
    icon: ShieldCheck,
    badge: "Step 3",
  },
  {
    title: "Set your availability",
    description:
      "Configure weekly schedule, blocked dates, and timezone settings.",
    href: "/app/availability",
    icon: Clock3,
    badge: "Step 4",
  },
];

const managementCards = [
  {
    title: "Calendars",
    description: "Connect Google Calendar and configure sync behavior.",
    href: "/app/calendars",
    icon: CalendarDays,
  },
  {
    title: "Access codes",
    description: "Control who can confirm bookings with private access codes.",
    href: "/app/access-codes",
    icon: CreditCard,
  },
  {
    title: "Bookings",
    description: "Review confirmed bookings and pending booking activity.",
    href: "/app/bookings",
    icon: ClipboardList,
  },
];

export default function DashboardOverviewPage() {
  return (
    <PageShell
      header={
        <SectionHeading
          title="Build your expert front desk"
          description="Work through the core setup steps to launch a gated booking page that filters, converts, and monetizes access to your time."
          maxWidth="full"
        />
      }
    >
      <div className="space-y-8">
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="rounded-2xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Getting started</Badge>
              </div>
              <CardTitle className="text-2xl">
                Your launch checklist
              </CardTitle>
              <CardDescription>
                Complete these core steps in order to publish a working public
                page and start taking qualified bookings.
              </CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 md:grid-cols-2">
              {setupCards.map((item) => {
                const Icon = item.icon;

                return (
                  <Link key={item.href} href={item.href}>
                    <Card className="h-full rounded-2xl border-slate-200 transition-transform hover:-translate-y-0.5 hover:shadow-sm">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex size-11 items-center justify-center rounded-xl bg-slate-900 text-white">
                            <Icon className="size-5" />
                          </div>
                          <Badge variant="outline">{item.badge}</Badge>
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
              <Badge variant="secondary" className="w-fit">
                Progress
              </Badge>
              <CardTitle className="text-2xl">What this dashboard controls</CardTitle>
              <CardDescription>
                This app is your expert operating layer — not just a booking
                page.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                Filter bad-fit leads before they reach the calendar.
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                Present premium service offers like products.
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                Control booking access through rules and codes.
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                Keep your availability synced and conflict-free.
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Manage your live workflow</CardTitle>
            <CardDescription>
              Once your core setup is in place, these areas help you operate the
              system day to day.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4 md:grid-cols-3">
            {managementCards.map((item) => {
              const Icon = item.icon;

              return (
                <Link key={item.href} href={item.href}>
                  <Card className="h-full rounded-2xl border-slate-200 transition-transform hover:-translate-y-0.5 hover:shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex size-11 items-center justify-center rounded-xl bg-slate-900 text-white">
                        <Icon className="size-5" />
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

        <div className="flex justify-end">
          <Button asChild>
            <Link href="/app/profile">
              Start setup
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </PageShell>
  );
}