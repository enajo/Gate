import * as React from "react";
import { Inbox } from "lucide-react";

import { cn } from "@/lib/utils";

export interface EmptyStateProps
  extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  inset?: boolean;
}

export function EmptyState({
  className,
  title,
  description,
  icon,
  action,
  inset = false,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[260px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center",
        inset && "min-h-[200px]",
        className,
      )}
      {...props}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
        {icon ?? <Inbox className="size-5 text-slate-500" />}
      </div>

      <div className="mt-4 space-y-1">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {description ? (
          <p className="mx-auto max-w-md text-sm text-slate-500">
            {description}
          </p>
        ) : null}
      </div>

      {action ? <div className="mt-6 flex items-center">{action}</div> : null}
    </div>
  );
}