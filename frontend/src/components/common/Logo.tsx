import { Link } from "react-router-dom";

import { cn } from "@/lib/utils";

interface LogoProps {
  to?: string;
  className?: string;
  compact?: boolean;
}

export function Logo({ to = "/", className, compact = false }: LogoProps) {
  return (
    <Link
      to={to}
      aria-label="Ir al inicio"
      className={cn("group inline-flex items-center gap-2.5", className)}
    >
      <span className="flex size-9 items-center justify-center rounded-[10px] bg-gold-500 font-display text-lg font-black text-ink-950 transition-colors group-hover:bg-gold-400">
        M
      </span>
      {!compact ? (
        <span className="flex flex-col leading-none">
          <span className="font-display text-base font-black uppercase tracking-[0.22em] text-bone-50">
            Museo
          </span>
          <span className="mt-0.5 text-[9px] uppercase tracking-[0.3em] text-mute-500">
            Catálogo digital
          </span>
        </span>
      ) : null}
    </Link>
  );
}
