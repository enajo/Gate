import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface SectionHeadingProps
  extends React.HTMLAttributes<HTMLDivElement> {
  eyebrow?: string;
  badge?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  maxWidth?: "md" | "lg" | "xl" | "2xl" | "full";
}

const maxWidthClasses = {
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  full: "max-w-none",
} as const;

export function SectionHeading({
  className,
  eyebrow,
  badge,
  title,
  description,
  align = "left",
  maxWidth = "2xl",
  ...props
}: SectionHeadingProps) {
  const centered = align === "center";

  return (
    <div
      className={cn(
        "space-y-4",
        centered ? "mx-auto text-center" : "text-left",
        maxWidthClasses[maxWidth],
        className,
      )}
      {...props}
    >
      {badge ? (
        <Badge variant="secondary" className={cn(centered && "mx-auto w-fit")}>
          {badge}
        </Badge>
      ) : null}

      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          {eyebrow}
        </p>
      ) : null}

      <div className="space-y-3">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          {title}
        </h2>

        {description ? (
          <p className="text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}