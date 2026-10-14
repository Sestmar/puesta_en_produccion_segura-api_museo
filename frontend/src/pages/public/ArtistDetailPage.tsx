import { ArrowLeft, Images } from "@phosphor-icons/react";
import { Link, useParams } from "react-router-dom";

import { ArtworkCard } from "@/components/common/ArtworkCard";
import { ErrorPanel } from "@/components/common/QueryState";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatLifespan } from "@/lib/format";
import { imageForArtist } from "@/lib/images";
import { useArtist, useArtworks } from "@/hooks/queries";

export function ArtistDetailPage() {
  const params = useParams<{ id: string }>();
  const artistId = Number(params.id);

  const artistQuery = useArtist(artistId);
  const artworksQuery = useArtworks({ artist_id: artistId, limit: 100 });

  if (artistQuery.isPending) {
    return (
      <div className="container-page py-12 lg:py-16">
        <Skeleton className="aspect-16/9 w-full rounded-card lg:aspect-21/9" />
        <Skeleton className="mt-8 h-10 w-2/3" />
      </div>
    );
  }

  if (artistQuery.isError || !artistQuery.data) {
    return (
      <div className="container-page py-16">
        <ErrorPanel
          title="No encontramos al artista"
          description="Puede que se haya eliminado o que el enlace no sea válido."
          onRetry={() => artistQuery.refetch()}
        />
      </div>
    );
  }

  const artist = artistQuery.data;
  const artworks = artworksQuery.data?.items ?? [];

  return (
    <div className="container-page py-12 lg:py-16">
      <Link
        to="/artistas"
        className="inline-flex items-center gap-2 font-display text-[11px] font-bold uppercase tracking-[0.16em] text-mute-400 transition-colors hover:text-gold-400"
      >
        <ArrowLeft size={14} weight="bold" /> Artistas
      </Link>

      <header className="mt-8 grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
        <div className="relative aspect-4/5 overflow-hidden rounded-card border border-ink-700 lg:aspect-square">
          <img
            src={imageForArtist(artist, 900)}
            alt={artist.name}
            className="size-full object-cover"
          />
        </div>
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3">
            {artist.nationality ? <Badge variant="gold">{artist.nationality}</Badge> : null}
            <Badge variant="outline">
              {formatLifespan(artist.birth_year, artist.death_year)}
            </Badge>
          </div>
          <h1 className="text-balance text-4xl font-black uppercase tracking-tight text-bone-50 sm:text-5xl">
            {artist.name}
          </h1>
          <p className="max-w-lg text-sm text-mute-400">
            {artworks.length > 0
              ? `En el acervo del museo se conservan ${artworks.length} ${
                  artworks.length === 1 ? "obra" : "obras"
                } de este artista.`
              : "Este artista forma parte del catálogo del museo."}
          </p>
        </div>
      </header>

      <section className="mt-16">
        <h2 className="text-xl font-black uppercase tracking-tight text-bone-50">
          Obras en el museo
        </h2>
        <div className="mt-8">
          {artworksQuery.isPending ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="aspect-4/5 w-full rounded-card" />
              ))}
            </div>
          ) : artworks.length === 0 ? (
            <EmptyState
              icon={Images}
              title="Sin obras registradas"
              description="Este artista todavía no tiene obras asociadas en el acervo."
            />
          ) : (
            <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
              {artworks.map((artwork) => (
                <ArtworkCard key={artwork.id} artwork={artwork} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
