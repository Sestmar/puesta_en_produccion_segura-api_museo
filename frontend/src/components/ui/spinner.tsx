import { CircleNotch } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";

/** Indicador de progreso para acciones puntuales (botones, submits). */
export function Spinner({ className }: { className?: string }) {
  return (
    <CircleNotch
      aria-hidden
      weight="bold"
      className={cn("size-4 animate-spin", className)}
    />
  );
}
