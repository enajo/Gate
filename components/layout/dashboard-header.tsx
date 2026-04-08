import * as React from "react";

import { cn } from "@/lib/utils";

export interface DashboardHeaderProps
  extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
}

export function DashboardHeader({
  className,
  title,
  description,
  eyebrow,
  actions,
  children,
  ...props
}: DashboardHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-slate-200 bg-white px-4 py-5 sm:px-6 lg:px-8",
        className,
      )}
      {...props}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-1">
          {eyebrow ? (
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
              {eyebrow}
            </p>
          ) : null}

          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {title}
          </h1>

          {description ? (
            <p className="max-w-2xl text-sm text-slate-500">{description}</p>
          ) : null}
        </div>

        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>

      {children ? <div>{children}</div> : null}
    </div>
  );
}