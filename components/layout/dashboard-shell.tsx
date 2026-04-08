import * as React from "react";

import { cn } from "@/lib/utils";

export interface DashboardShellProps
  extends React.HTMLAttributes<HTMLDivElement> {
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  children: React.ReactNode;
  contentClassName?: string;
}

export function DashboardShell({
  className,
  sidebar,
  header,
  children,
  contentClassName,
  ...props
}: DashboardShellProps) {
  return (
    <div
      className={cn(
        "min-h-screen bg-slate-50 text-slate-900",
        "lg:grid lg:grid-cols-[280px_minmax(0,1fr)]",
        className,
      )}
      {...props}
    >
      {sidebar ? (
        <aside className="hidden border-r border-slate-200 bg-white lg:block">
          <div className="sticky top-0 h-screen overflow-y-auto">{sidebar}</div>
        </aside>
      ) : null}

      <div className="min-w-0">
        {header ? (
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
            {header}
          </header>
        ) : null}

        <main
          className={cn(
            "min-w-0 px-4 py-6 sm:px-6 lg:px-8",
            contentClassName,
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}