import { Link } from "react-router-dom";

import { FavoriteButton } from "@/components/common/FavoriteButton";
import { formatYear } from "@/lib/format";
import { imageForArtwork } from "@/lib/images";
import type { Artwork } from "@/lib/api/types";

export function ArtworkCard({ artwork }: { artwork: Artwork }) {
  return (
    // El botón de favorito va fuera del enlace: no se anidan elementos interactivos.
    <div className="group relative flex flex-col">
      <Link to={`/obras/${artwork.id}`} className="flex flex-col">
        <div className="hover-lift relative aspect-4/5 overflow-hidden rounded-card bg-ink-800">
          <img
            src={imageForArtwork(artwork, 800)}
            alt={artwork.title}
            loading="lazy"
            decoding="async"
            className="artwork-media size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-transparent to-transparent opacity-60 transition-opacity duration-500 group-hover:opacity-80" />
          {artwork.year != null ? (
            <span className="absolute left-3 top-3 rounded-pill bg-ink-950/70 px-3 py-1 font-display text-[10px] font-bold uppercase tracking-[0.14em] text-bone-100 backdrop-blur-sm">
              {formatYear(artwork.year)}
            </span>
          ) : null}
        </div>
        <div className="mt-4 flex flex-col gap-1">
          <h3 className="font-display text-base font-bold leading-snug text-bone-50 transition-colors duration-300 group-hover:text-gold-400">
            {artwork.title}
          </h3>
          {artwork.technique ? (
            <p className="text-[11px] uppercase tracking-[0.14em] text-mute-500">
              {artwork.technique}
            </p>
          ) : null}
        </div>
      </Link>
      <FavoriteButton artworkId={artwork.id} className="absolute right-3 top-3" />
    </div>
  );
}
