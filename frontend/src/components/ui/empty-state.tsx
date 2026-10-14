import type { Icon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: Icon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/** Estado vacío compuesto: ícono, mensaje y una acción opcional. */
export function EmptyState({
  icon: IconComponent,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-card border border-dashed border-ink-700 px-6 py-16 text-center",
        className,
      )}
    >
      {IconComponent ? (
        <span className="flex size-14 items-center justify-center rounded-pill bg-ink-800 text-gold-500">
          <IconComponent size={26} weight="duotone" />
        </span>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <h3 className="text-lg font-bold text-bone-50">{title}</h3>
        {description ? (
          <p className="mx-auto max-w-md text-sm text-mute-400">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
