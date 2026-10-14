import { cn } from "@/lib/utils";

interface AvatarProps {
  name: string;
  className?: string;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase());
  return letters.join("") || "?";
}

/** Avatar de iniciales (sin imágenes externas). */
export function Avatar({ name, className }: AvatarProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-pill bg-ink-750 font-display text-xs font-bold text-gold-400",
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
