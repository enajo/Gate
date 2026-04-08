import * as React from "react";

import { cn } from "@/lib/utils";

export interface LoadingStateProps
  extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  inset?: boolean;
  fullPage?: boolean;
}

export function LoadingState({
  className,
  title = "Loading...",
  description = "Please wait while we fetch your data.",
  inset = false,
  fullPage = false,
  ...props
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-10 text-center",
        inset ? "min-h-[200px]" : "min-h-[260px]",
        fullPage && "min-h-[calc(100vh-8rem)] border-none bg-transparent",
        className,
      )}
      {...props}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-slate-100">
        <span className="size-5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
      </div>

      <div className="mt-4 space-y-1">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {description ? (
          <p className="max-w-md text-sm text-slate-500">{description}</p>
        ) : null}
      </div>

      <div className="mt-6 w-full max-w-sm space-y-3">
        <div className="h-3 w-3/4 animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-full animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200" />
      </div>
    </div>
  );
}