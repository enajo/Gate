import Image from "next/image";
import Link from "next/link";
import { ArrowDown, Globe, Linkedin, Twitter } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PublicHeroProfile = {
  fullName: string;
  title?: string | null;
  headline?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  socialLinks?: {
    website?: string | null;
    linkedin?: string | null;
    x?: string | null;
  } | null;
  brandSettings?: {
    primaryColor?: string | null;
    accentColor?: string | null;
  } | null;
};

export interface PublicHeroProps
  extends React.HTMLAttributes<HTMLElement> {
  professional: PublicHeroProfile;
  ctaLabel?: string;
  ctaHref?: string;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function PublicHero({
  className,
  professional,
  ctaLabel = "Apply to work with me",
  ctaHref = "#gatekeeper",
  ...props
}: PublicHeroProps) {
  const accentColor =
    professional.brandSettings?.accentColor || "#0f172a";
  const primaryColor =
    professional.brandSettings?.primaryColor || "#111827";

  const socialLinks = [
    {
      href: professional.socialLinks?.website,
      label: "Website",
      icon: Globe,
    },
    {
      href: professional.socialLinks?.linkedin,
      label: "LinkedIn",
      icon: Linkedin,
    },
    {
      href: professional.socialLinks?.x,
      label: "X",
      icon: Twitter,
    },
  ].filter((item): item is { href: string; label: string; icon: typeof Globe } =>
    Boolean(item.href),
  );

  return (
    <section
      className={cn(
        "relative overflow-hidden border-b border-slate-200 bg-white",
        className,
      )}
      style={
        {
          "--public-hero-accent": accentColor,
          "--public-hero-primary": primaryColor,
        } as React.CSSProperties
      }
      {...props}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,23,42,0.06),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.08),transparent_28%)]" />

      <div className="relative mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-24">
        <div className="flex items-start justify-center lg:justify-start">
          <div className="relative">
            <div
              className="absolute inset-0 rounded-[2rem] blur-3xl opacity-25"
              style={{ backgroundColor: accentColor }}
            />
            <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-100 shadow-xl">
              {professional.avatarUrl ? (
                <Image
                  src={professional.avatarUrl}
                  alt={professional.fullName}
                  width={420}
                  height={420}
                  className="h-[280px] w-[280px] object-cover sm:h-[340px] sm:w-[340px]"
                />
              ) : (
                <div
                  className="flex h-[280px] w-[280px] items-center justify-center text-5xl font-semibold text-white sm:h-[340px] sm:w-[340px]"
                  style={{ backgroundColor: primaryColor }}
                >
                  {getInitials(professional.fullName)}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center">
          <Badge
            variant="secondary"
            className="w-fit"
            style={{
              backgroundColor: `${accentColor}14`,
              color: primaryColor,
            }}
          >
            Premium expert storefront
          </Badge>

          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                {professional.fullName}
              </h1>

              {professional.title ? (
                <p className="text-base font-medium text-slate-500 sm:text-lg">
                  {professional.title}
                </p>
              ) : null}
            </div>

            {professional.headline ? (
              <p className="max-w-3xl text-xl leading-8 text-slate-700 sm:text-2xl">
                {professional.headline}
              </p>
            ) : null}

            {professional.bio ? (
              <p className="max-w-2xl text-base leading-7 text-slate-600">
                {professional.bio}
              </p>
            ) : null}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              asChild
              size="lg"
              className="shadow-sm"
              style={{
                backgroundColor: primaryColor,
              }}
            >
              <Link href={ctaHref}>
                {ctaLabel}
                <ArrowDown className="size-4" />
              </Link>
            </Button>

            {socialLinks.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                {socialLinks.map((link) => {
                  const Icon = link.icon;

                  return (
                    <Button key={link.label} asChild variant="outline" size="sm">
                      <Link
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Icon className="size-4" />
                        {link.label}
                      </Link>
                    </Button>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                Step 1
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                Review the offer
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                Step 2
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                Qualify through the Gatekeeper
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                Step 3
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                Unlock booking if accepted
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}