"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ClipboardList,
  Clock3,
  CreditCard,
  Home,
  Layers3,
  Settings,
  ShieldCheck,
  Sparkles,
  UserCircle2,
} from "lucide-react";

import { cn } from "@/lib/utils";

type NavigationItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
};

const navigationItems: NavigationItem[] = [
  {
    href: "/app",
    label: "Overview",
    icon: Home,
    exact: true,
  },
  {
    href: "/app/onboarding",
    label: "Onboarding",
    icon: Sparkles,
  },
  {
    href: "/app/profile",
    label: "Profile",
    icon: UserCircle2,
  },
  {
    href: "/app/services",
    label: "Services",
    icon: Layers3,
  },
  {
    href: "/app/qualification",
    label: "Qualification",
    icon: ShieldCheck,
  },
  {
    href: "/app/availability",
    label: "Availability",
    icon: Clock3,
  },
  {
    href: "/app/calendars",
    label: "Calendars",
    icon: CalendarDays,
  },
  {
    href: "/app/access-codes",
    label: "Access Codes",
    icon: CreditCard,
  },
  {
    href: "/app/bookings",
    label: "Bookings",
    icon: ClipboardList,
  },
  {
    href: "/app/settings",
    label: "Settings",
    icon: Settings,
  },
];

export interface DashboardSidebarProps
  extends React.HTMLAttributes<HTMLDivElement> {
  brandName?: string;
  brandHref?: string;
}

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

export function DashboardSidebar({
  className,
  brandName = "Expert Gatekeeper",
  brandHref = "/app",
  ...props
}: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <div
      className={cn(
        "flex h-full min-h-screen w-full flex-col bg-white",
        className,
      )}
      {...props}
    >
      <div className="border-b border-slate-200 px-6 py-5">
        <Link
          href={brandHref}
          className="inline-flex items-center gap-3 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
        >
          <div className="flex size-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
            <ShieldCheck className="size-5" />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              {brandName}
            </p>
            <p className="text-xs text-slate-500">Professional dashboard</p>
          </div>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <nav className="space-y-1" aria-label="Dashboard navigation">
          {navigationItems.map((item) => {
            const active = isActivePath(pathname, item.href, item.exact);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  className={cn(
                    "size-4 shrink-0",
                    active
                      ? "text-white"
                      : "text-slate-400 group-hover:text-slate-700",
                  )}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-slate-200 px-4 py-4">
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Status
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            Build your gatekeeper
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Set up services, qualification, and availability to start taking
            bookings.
          </p>
        </div>
      </div>
    </div>
  );
}