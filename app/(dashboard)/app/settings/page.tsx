import { redirect } from "next/navigation";
import Link from "next/link";
import { Bell, CreditCard, ExternalLink, Shield, UserCog } from "lucide-react";

import { auth } from "@/lib/auth";
import { PLAN_TIER_LIMITS } from "@/lib/constants";
import { profileRepository } from "@/server/repositories/profile.repository";
import { PageShell } from "@/components/layout/page-shell";
import { SectionHeading } from "@/components/shared/section-heading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SettingsSignOutButton } from "@/components/settings/sign-out-button";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const professional = await profileRepository.findByUserId(session.user.id);
  if (!professional) redirect("/onboarding");

  const tier = PLAN_TIER_LIMITS[professional.planTier];
  const serviceLimitLabel =
    tier.maxActiveServices === null
      ? "Unlimited active services"
      : `${tier.maxActiveServices} active service${tier.maxActiveServices === 1 ? "" : "s"}`;

  return (
    <PageShell
      header={
        <SectionHeading
          title="Settings"
          description="Your account, plan, and how Gate reaches you."
          maxWidth="full"
        />
      }
    >
      <div className="space-y-6">
        <Card className="rounded-2xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-slate-900 text-white">
                <UserCog className="size-5" />
              </div>
              <CardTitle>Account</CardTitle>
            </div>
          </CardHeader>

          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={professional.fullName} readOnly />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={session.user.email ?? ""} readOnly />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Public page</Label>
              <div className="flex items-center gap-2">
                <Input value={`/${professional.slug}`} readOnly />
                <Link
                  href={`/${professional.slug}`}
                  target="_blank"
                  className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                >
                  Open <ExternalLink className="size-3.5" />
                </Link>
              </div>
              <p className="text-xs text-slate-500">
                To change your name, headline, or bio, use the{" "}
                <Link href="/app/profile" className="underline">
                  Profile
                </Link>{" "}
                page.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-slate-900 text-white">
                <CreditCard className="size-5" />
              </div>
              <CardTitle>Plan &amp; usage</CardTitle>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge variant={professional.planTier === "FREE" ? "outline" : "success"}>
                  {tier.label} plan
                </Badge>
                <span className="text-sm text-slate-500">
                  {tier.priceUsd === 0 ? "Free" : `$${tier.priceUsd}/mo`}
                </span>
              </div>

              <Link
                href="/pricing"
                target="_blank"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-900 underline underline-offset-2"
              >
                Compare plans <ExternalLink className="size-3.5" />
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Services
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {serviceLimitLabel}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  AI qualification balance
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {professional.tokenBalance.toLocaleString()} / {tier.monthlyTokenAllowance.toLocaleString()} tokens
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Resets monthly. Running out never blocks a booking — the
                  gate just stops actively screening until it resets.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              In-app upgrades and billing aren&apos;t live yet — reach out
              directly if you&apos;d like more services or a higher AI
              allowance sooner.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-slate-900 text-white">
                <Bell className="size-5" />
              </div>
              <CardTitle>Notifications</CardTitle>
            </div>
          </CardHeader>

          <CardContent className="space-y-3 text-sm text-slate-600">
            <p>
              These emails send automatically today — there&apos;s no
              per-notification toggle yet:
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Booking confirmations, to you and your client</li>
              <li>Calendar event failures, if one can&apos;t be created</li>
              <li>Outcome follow-ups, a few days after each call</li>
              <li>Weekly AI pattern reports, once you have enough lead volume</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-slate-900 text-white">
                <Shield className="size-5" />
              </div>
              <CardTitle>Security</CardTitle>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 text-sm text-slate-600">
            <p>Signed in as {session.user.email}.</p>
            <SettingsSignOutButton />
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
