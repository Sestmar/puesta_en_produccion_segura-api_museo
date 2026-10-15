import { Heart } from "@phosphor-icons/react";
import { useLocation, useNavigate } from "react-router-dom";

import { errorMessage } from "@/components/common/QueryState";
import { useToast } from "@/components/ui/toast";
import { useToggleFavorite } from "@/hooks/mutations";
import { useFavoriteIds } from "@/hooks/queries";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  artworkId: number;
  /** `overlay`: icono flotante sobre la imagen; `full`: botón con texto. */
  variant?: "overlay" | "full";
  className?: string;
}

export function FavoriteButton({ artworkId, variant = "overlay", className }: FavoriteButtonProps) {
  const { user, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { error: errorToast } = useToast();
  const idsQuery = useFavoriteIds();
  const toggle = useToggleFavorite(user?.id ?? 0);

  const isFavorite = idsQuery.data?.includes(artworkId) ?? false;
  const label = isFavorite ? "Quitar de mi colección" : "Guardar en mi colección";

  function onClick() {
    if (!user) {
      navigate("/login", { state: { from: location.pathname + location.search } });
      return;
    }
    toggle.mutate(
      { artworkId, favorite: !isFavorite },
      {
        onError: (error) =>
          errorToast("No se pudo actualizar tu colección", errorMessage(error)),
      },
    );
  }

  const icon = <Heart size={variant === "overlay" ? 18 : 16} weight={isFavorite ? "fill" : "bold"} />;

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={status === "loading"}
        aria-pressed={isFavorite}
        className={cn(
          "inline-flex h-11 w-fit items-center gap-2 rounded-pill border px-5 font-display text-[11px] font-bold uppercase tracking-[0.14em] transition-colors disabled:opacity-50",
          isFavorite
            ? "border-gold-500 bg-gold-500 text-ink-950 hover:bg-gold-400"
            : "border-ink-600 text-bone-100 hover:border-gold-500 hover:text-gold-400",
          className,
        )}
      >
        {icon} {isFavorite ? "En mi colección" : "Guardar en mi colección"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={status === "loading"}
      aria-pressed={isFavorite}
      aria-label={label}
      title={label}
      className={cn(
        "flex size-9 items-center justify-center rounded-pill backdrop-blur-sm transition-colors disabled:opacity-50",
        isFavorite
          ? "bg-gold-500 text-ink-950 hover:bg-gold-400"
          : "bg-ink-950/70 text-bone-100 hover:text-gold-400",
        className,
      )}
    >
      {icon}
    </button>
  );
}
