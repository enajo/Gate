import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ExternalLink, Globe } from "lucide-react";

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

export interface PublicHeroProps extends React.HTMLAttributes<HTMLElement> {
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
  const accentColor = professional.brandSettings?.accentColor || "#6366f1";
  const primaryColor = professional.brandSettings?.primaryColor || "#111827";

  const socialLinks = [
    {
      href: professional.socialLinks?.website,
      label: "Website",
      icon: Globe,
    },
    {
      href: professional.socialLinks?.linkedin,
      label: "LinkedIn",
      icon: ExternalLink,
    },
    {
      href: professional.socialLinks?.x,
      label: "X",
      icon: ExternalLink,
    },
  ].filter(
    (item): item is { href: string; label: string; icon: typeof Globe } =>
      Boolean(item.href),
  );

  return (
    <section
      className={cn(
        "relative overflow-hidden border-b border-slate-200/70 bg-gradient-to-br from-white via-slate-50 to-indigo-50",
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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.10),transparent_30%)]" />

      <div className="relative mx-auto grid w-full max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-24">
        <div className="flex items-start justify-center lg:justify-start">
          <div className="relative">
            <div
              className="absolute inset-0 rounded-card opacity-30 blur-3xl"
              style={{ backgroundColor: accentColor }}
            />

            <div className="relative overflow-hidden rounded-card border border-white/70 bg-white shadow-2xl shadow-slate-300/70">
              {professional.avatarUrl ? (
                <Image
                  src={professional.avatarUrl}
                  alt={professional.fullName}
                  width={420}
                  height={420}
                  priority
                  className="h-[280px] w-[280px] object-cover sm:h-[340px] sm:w-[340px]"
                />
              ) : (
                <div
                  className="flex h-[280px] w-[280px] items-center justify-center text-5xl font-bold text-white sm:h-[340px] sm:w-[340px]"
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
            className="w-fit border border-white/70 bg-white/80 shadow-sm"
            style={{
              color: primaryColor,
            }}
          >
            Premium expert storefront
          </Badge>

          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <h1 className="text-5xl font-bold tracking-tight text-slate-950 sm:text-6xl">
                {professional.fullName}
              </h1>

              {professional.title ? (
                <p className="text-lg font-semibold text-slate-500">
                  {professional.title}
                </p>
              ) : null}
            </div>

            {professional.headline ? (
              <p className="max-w-3xl text-2xl font-semibold leading-9 text-slate-800">
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
              className="rounded-full px-7 shadow-lg shadow-slate-900/20"
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
                    <Button
                      key={link.label}
                      asChild
                      variant="outline"
                      size="sm"
                      className="rounded-full bg-white/80"
                    >
                      <Link href={link.href} target="_blank" rel="noreferrer">
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
            {[
              ["Step 1", "Review the offer"],
              ["Step 2", "Qualify through the Gatekeeper"],
              ["Step 3", "Unlock booking if accepted"],
            ].map(([step, text]) => (
              <div
                key={step}
                className="rounded-2xl border border-white/70 bg-white/75 p-4 shadow-lg shadow-slate-200/60 backdrop-blur"
              >
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  {step}
                </p>
                <p className="mt-2 text-sm font-bold text-slate-950">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}