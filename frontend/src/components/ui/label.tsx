import * as LabelPrimitive from "@radix-ui/react-label";
import { forwardRef } from "react";

import { cn } from "@/lib/utils";

export const Label = forwardRef<
  React.ComponentRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      "font-display text-[11px] font-bold uppercase tracking-[0.14em] text-mute-400",
      className,
    )}
    {...props}
  />
));
Label.displayName = "Label";
