"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  exact?: boolean;
};

const navItems: NavItem[] = [
  { href: "/", label: "Home", exact: true },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
];

function isActivePath(
  pathname: string,
  href: string,
  exact: boolean | undefined,
) {
  if (exact) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export interface SiteHeaderProps
  extends React.HTMLAttributes<HTMLElement> {
  brandName?: string;
  loginHref?: string;
  registerHref?: string;
}

export function SiteHeader({
  className,
  brandName = "Expert Gatekeeper",
  loginHref = "/login",
  registerHref = "/register",
  ...props
}: SiteHeaderProps) {
  const pathname = usePathname();

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur",
        className,
      )}
      {...props}
    >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex min-w-0 items-center gap-3 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
        >
          <div className="flex size-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
            <ShieldCheck className="size-5" />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              {brandName}
            </p>
            <p className="text-xs text-slate-500">
              Qualify leads before they book
            </p>
          </div>
        </Link>

        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-1 md:flex"
        >
          {navItems.map((item) => {
            const active = isActivePath(pathname, item.href, item.exact);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                )}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link href={loginHref}>Log in</Link>
          </Button>

          <Button asChild>
            <Link href={registerHref}>Get started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}