import * as SwitchPrimitive from "@radix-ui/react-switch";
import { forwardRef } from "react";

import { cn } from "@/lib/utils";

export const Switch = forwardRef<
  React.ComponentRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-pill border border-ink-600 bg-ink-800 transition-colors data-[state=checked]:border-gold-500 data-[state=checked]:bg-gold-500 disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb className="pointer-events-none block size-5 rounded-pill bg-bone-50 shadow transition-transform data-[state=checked]:translate-x-[22px] data-[state=unchecked]:translate-x-0.5 data-[state=checked]:bg-ink-950" />
  </SwitchPrimitive.Root>
));
Switch.displayName = "Switch";
