import { Link } from "react-router-dom";

import { formatYear } from "@/lib/format";
import { imageForArtwork } from "@/lib/images";
import type { Artwork } from "@/lib/api/types";

export function ArtworkCard({ artwork }: { artwork: Artwork }) {
  return (
    <Link to={`/obras/${artwork.id}`} className="group flex flex-col">
      <div className="relative aspect-4/5 overflow-hidden rounded-card bg-ink-800">
        <img
          src={imageForArtwork(artwork, 800)}
          alt={artwork.title}
          loading="lazy"
          decoding="async"
          className="artwork-media size-full object-cover"
        />
        {artwork.year != null ? (
          <span className="absolute left-3 top-3 rounded-pill bg-ink-950/75 px-2.5 py-1 font-display text-[10px] font-bold uppercase tracking-[0.14em] text-bone-100 backdrop-blur-sm">
            {formatYear(artwork.year)}
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex flex-col gap-1">
        <h3 className="font-display text-base font-bold leading-snug text-bone-50 transition-colors group-hover:text-gold-400">
          {artwork.title}
        </h3>
        {artwork.technique ? (
          <p className="text-[11px] uppercase tracking-[0.14em] text-mute-400">
            {artwork.technique}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
