import { Link } from "react-router-dom";

import { formatLifespan } from "@/lib/format";
import { imageForArtist } from "@/lib/images";
import type { Artist } from "@/lib/api/types";

export function ArtistCard({ artist }: { artist: Artist }) {
  return (
    <Link to={`/artistas/${artist.id}`} className="group flex flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-card bg-ink-800">
        <img
          src={imageForArtist(artist, 600)}
          alt={artist.name}
          loading="lazy"
          decoding="async"
          className="artwork-media size-full object-cover"
        />
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="font-display text-base font-bold text-bone-50 transition-colors group-hover:text-gold-400">
          {artist.name}
        </h3>
        <p className="text-[11px] uppercase tracking-[0.14em] text-mute-400">
          {[artist.nationality, formatLifespan(artist.birth_year, artist.death_year)]
            .filter((value) => value && value !== "—")
            .join(" · ") || "Sobre el artista"}
        </p>
      </div>
    </Link>
  );
}
