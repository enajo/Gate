import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all duration-200 outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-slate-950 text-white shadow-lg shadow-slate-900/20 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-900/25",
        secondary:
          "bg-slate-100 text-slate-950 shadow-sm hover:-translate-y-0.5 hover:bg-slate-200",
        outline:
          "border border-slate-200 bg-white/80 text-slate-950 shadow-sm backdrop-blur hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-md",
        ghost:
          "text-slate-700 hover:bg-slate-100 hover:text-slate-950",
        destructive:
          "bg-red-600 text-white shadow-lg shadow-red-600/20 hover:-translate-y-0.5 hover:bg-red-700",
        link:
          "h-auto rounded-none p-0 text-slate-950 underline-offset-4 hover:underline focus-visible:ring-transparent",
      },
      size: {
        sm: "h-9 px-4 text-xs",
        default: "h-10 px-5 py-2",
        lg: "h-12 px-7 text-base",
        icon: "h-10 w-10",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      fullWidth: false,
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  fullWidth,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      disabled={asChild ? undefined : disabled || loading}
      aria-disabled={asChild ? disabled || loading : undefined}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <>
          <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span>Loading...</span>
        </>
      ) : (
        children
      )}
    </Comp>
  );
}

export { buttonVariants };