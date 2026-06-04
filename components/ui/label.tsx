"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";

import { cn } from "@/lib/utils";

type LabelProps = React.ComponentProps<typeof LabelPrimitive.Root> & {
  muted?: boolean;
  error?: boolean;
};

function Label({ className, muted, error, ...props }: LabelProps) {
  return (
    <LabelPrimitive.Root
      className={cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        muted && "text-[#9CA3AF]",
        error && "text-red-500",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
export type { LabelProps };
