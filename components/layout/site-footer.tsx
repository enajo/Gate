import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";

const productLinks = [
  { href: "/", label: "Home" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
];

const accountLinks = [
  { href: "/login", label: "Log in" },
  { href: "/register", label: "Get started" },
];

export interface SiteFooterProps
  extends React.HTMLAttributes<HTMLElement> {
  brandName?: string;
  tagline?: string;
}

export function SiteFooter({
  className,
  brandName = "Expert Gatekeeper",
  tagline = "Qualify leads before they book your time.",
  ...props
}: SiteFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer
      className={cn("border-t border-slate-200 bg-white", className)}
      {...props}
    >
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.2fr_0.8fr_0.8fr] lg:px-8">
        <div className="max-w-md space-y-4">
          <Link
            href="/"
            className="inline-flex items-center gap-3 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
          >
            <div className="flex size-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
              <ShieldCheck className="size-5" />
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-900">
                {brandName}
              </p>
              <p className="text-xs text-slate-500">AI front desk for experts</p>
            </div>
          </Link>

          <p className="text-sm leading-6 text-slate-600">{tagline}</p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900">Product</h3>
          <ul className="mt-4 space-y-3">
            {productLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-slate-600 transition-colors hover:text-slate-900"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900">Account</h3>
          <ul className="mt-4 space-y-3">
            {accountLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-slate-600 transition-colors hover:text-slate-900"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-200">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {year} {brandName}. All rights reserved.</p>
          <p>Built for solo experts, mentors, and consultants.</p>
        </div>
      </div>
    </footer>
  );
}