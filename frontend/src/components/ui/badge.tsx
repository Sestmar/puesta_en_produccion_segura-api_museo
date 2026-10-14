import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-pill px-3 py-1 font-display text-[10px] font-bold uppercase tracking-[0.14em]",
  {
    variants: {
      variant: {
        gold: "bg-gold-500 text-ink-950",
        neutral: "bg-ink-800 text-bone-200",
        outline: "border border-ink-600 text-mute-400",
        success: "bg-success-500/15 text-success-400",
        danger: "bg-danger-500/15 text-danger-400",
        info: "bg-info-400/15 text-info-400",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
