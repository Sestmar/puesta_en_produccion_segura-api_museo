import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/** Marcador de carga con la forma del contenido final. */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-control bg-ink-800", className)}
      {...props}
    />
  );
}
