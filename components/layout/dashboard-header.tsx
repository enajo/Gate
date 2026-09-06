"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink } from "lucide-react";

import { cn } from "@/lib/utils";
import { SignOutButton } from "@/components/auth/sign-out-button";

const NAV_ITEMS: Array<{ href: string; label: string; exact?: boolean }> = [
  { href: "/app", label: "Dashboard", exact: true },
  { href: "/app/control-room", label: "Control Room" },
  { href: "/app/leads", label: "Leads" },
  { href: "/app/bookings", label: "Bookings" },
  { href: "/app/embed", label: "Embed" },
  { href: "/app/settings", label: "Settings" },
];

function isActivePath(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export interface DashboardHeaderProps {
  initials: string;
  publicUrl?: string | null;
  isAdmin?: boolean;
}

// Rendered once, in the dashboard layout, so every /app/* page gets the same
// nav and — the actual point of this component existing — sign-out from
// anywhere, instead of only from the two pages that happened to hand-roll
// their own header.
export function DashboardHeader({
  initials,
  publicUrl,
  isAdmin = false,
}: DashboardHeaderProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-gray-50/75 backdrop-blur-xl">
      <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 text-[13px]">
        <Link href="/app" className="font-medium tracking-wide">
          GATE
        </Link>

        <div className="hidden items-center gap-7 text-gray-500 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(isActivePath(pathname, item.href, item.exact) && "text-ink")}
            >
              {item.label}
            </Link>
          ))}

          {isAdmin ? (
            <Link href="/admin" className="text-brand-amber">
              Admin
            </Link>
          ) : null}

          {publicUrl ? (
            <Link
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1"
            >
              Public Page
              <ExternalLink className="size-3" />
            </Link>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <SignOutButton />
          <div className="flex size-8 items-center justify-center rounded-full bg-ink text-[12px] text-white">
            {initials}
          </div>
        </div>
      </nav>
    </header>
  );
}
