import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 border-b border-ink-700 pb-8 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black uppercase tracking-tight text-bone-50 sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-sm text-mute-400">{description}</p>
        ) : null}
      </div>
      {action}
    </header>
  );
}
