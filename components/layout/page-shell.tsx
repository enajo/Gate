import * as React from "react";

import { cn } from "@/lib/utils";

export interface PageShellProps extends React.HTMLAttributes<HTMLDivElement> {
  header?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  contentClassName?: string;
  centered?: boolean;
}

export function PageShell({
  className,
  header,
  actions,
  children,
  contentClassName,
  centered = false,
  ...props
}: PageShellProps) {
  return (
    <div
      className={cn("flex w-full flex-col gap-6", className)}
      {...props}
    >
      {header || actions ? (
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          {header ? <div className="min-w-0 flex-1">{header}</div> : null}

          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {actions}
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          "w-full",
          centered && "mx-auto max-w-5xl",
          contentClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}