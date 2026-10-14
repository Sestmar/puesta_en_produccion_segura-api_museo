import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";

import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-pill font-display font-bold uppercase tracking-[0.08em] transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50 active:translate-y-px [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-gold-500 text-ink-950 hover:bg-gold-400",
        secondary:
          "border border-ink-600 text-bone-50 hover:border-gold-500 hover:text-gold-400",
        ghost: "text-bone-100 hover:bg-ink-800 hover:text-gold-400",
        danger: "bg-danger-500 text-bone-50 hover:bg-danger-400",
        subtle: "bg-ink-800 text-bone-50 hover:bg-ink-700",
      },
      size: {
        sm: "h-9 px-4 text-[11px]",
        md: "h-11 px-6 text-xs",
        lg: "h-13 px-8 text-sm",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, loading = false, type = "button", children, disabled, ...props },
    ref,
  ) => {
    const Component = asChild ? Slot : "button";
    return (
      <Component
        ref={ref}
        type={asChild ? undefined : type}
        disabled={asChild ? undefined : disabled || loading}
        aria-busy={loading || undefined}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {asChild ? children : (
          <>
            {loading ? <Spinner /> : null}
            {children}
          </>
        )}
      </Component>
    );
  },
);

Button.displayName = "Button";
