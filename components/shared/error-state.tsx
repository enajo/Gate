import * as React from "react";
import { AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";

export interface ErrorStateProps
  extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  inset?: boolean;
  fullPage?: boolean;
}

export function ErrorState({
  className,
  title = "Something went wrong",
  description = "We couldn't load this right now. Please try again.",
  action,
  inset = false,
  fullPage = false,
  ...props
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50/40 px-6 py-10 text-center",
        inset ? "min-h-[200px]" : "min-h-[260px]",
        fullPage && "min-h-[calc(100vh-8rem)] border-none bg-transparent",
        className,
      )}
      {...props}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-red-200">
        <AlertTriangle className="size-5 text-red-600" />
      </div>

      <div className="mt-4 space-y-1">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {description ? (
          <p className="max-w-md text-sm text-slate-600">{description}</p>
        ) : null}
      </div>

      {action ? <div className="mt-6 flex items-center">{action}</div> : null}
    </div>
  );
}