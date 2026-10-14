import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  index?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/** Encabezado de sección con numeración editorial y acción opcional. */
export function SectionHeading({
  index,
  title,
  description,
  action,
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="flex items-start gap-4">
        {index ? (
          <span className="pt-1 font-display text-sm font-black text-gold-500">{index}</span>
        ) : null}
        <div className="flex flex-col gap-2">
          <h2 className="text-balance text-2xl font-black uppercase tracking-tight text-bone-50 sm:text-3xl">
            {title}
          </h2>
          {description ? (
            <p className="max-w-xl text-sm text-mute-400">{description}</p>
          ) : null}
        </div>
      </div>
      {action}
    </div>
  );
}
