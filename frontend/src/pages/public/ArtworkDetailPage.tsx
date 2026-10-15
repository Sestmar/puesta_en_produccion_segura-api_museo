import {
  ArrowLeft,
  ArrowRight,
  CalendarBlank,
  Door,
  Palette,
  User as UserIcon,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";

import { ArtworkCard } from "@/components/common/ArtworkCard";
import { FavoriteButton } from "@/components/common/FavoriteButton";
import { ErrorPanel } from "@/components/common/QueryState";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useArtist, useArtwork, useArtworks, useRoom } from "@/hooks/queries";
import { formatLifespan, formatYear } from "@/lib/format";
import { imageForArtwork, sourceWorkByTitle } from "@/lib/images";

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-ink-800 py-4">
      <span className="mt-0.5 text-gold-500">{icon}</span>
      <div className="flex flex-col gap-0.5">
        <dt className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-mute-500">
          {label}
        </dt>
        <dd className="text-sm text-bone-100">{children}</dd>
      </div>
    </div>
  );
}

export function ArtworkDetailPage() {
  const params = useParams<{ id: string }>();
  const artworkId = Number(params.id);

  const artworkQuery = useArtwork(artworkId);
  const artwork = artworkQuery.data;

  const artistQuery = useArtist(artwork?.artist_id ?? 0);
  const roomQuery = useRoom(artwork?.room_id ?? 0);
  const relatedQuery = useArtworks({
    artist_id: artwork?.artist_id,
    limit: 5,
  });

  if (artworkQuery.isPending) {
    return (
      <div className="container-page grid gap-10 py-12 lg:grid-cols-2 lg:py-16">
        <Skeleton className="aspect-4/5 w-full rounded-card" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (artworkQuery.isError || !artwork) {
    return (
      <div className="container-page py-16">
        <ErrorPanel
          title="No encontramos la obra"
          description="Puede que se haya eliminado o que el enlace no sea válido."
          onRetry={() => artworkQuery.refetch()}
        />
      </div>
    );
  }

  const artist = artistQuery.data;
  const room = roomQuery.data;
  const source = sourceWorkByTitle(artwork.title);
  const related = (relatedQuery.data?.items ?? []).filter((item) => item.id !== artwork.id);

  return (
    <div className="container-page py-12 lg:py-16">
      <Link
        to="/obras"
        className="inline-flex items-center gap-2 font-display text-[11px] font-bold uppercase tracking-[0.16em] text-mute-400 transition-colors hover:text-gold-400"
      >
        <ArrowLeft size={14} weight="bold" /> Obras
      </Link>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-card border border-ink-700 bg-ink-900">
            <img
              src={imageForArtwork(artwork, 1400)}
              alt={artwork.title}
              className="max-h-[75dvh] w-full object-contain"
            />
          </div>
          {source ? (
            <p className="mt-3 text-xs text-mute-500">
              Imagen de referencia: <span className="text-mute-400">{source.title}</span>,{" "}
              {source.artist || "anónimo"}
              {source.date ? `, ${source.date}` : ""}. Art Institute of Chicago (dominio
              público).
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            {artwork.year != null ? <Badge variant="gold" className="w-fit">{formatYear(artwork.year)}</Badge> : null}
            <h1 className="text-balance text-4xl font-black uppercase leading-[1] tracking-tight text-bone-50 sm:text-5xl">
              {artwork.title}
            </h1>
            {artist ? (
              <Link
                to={`/artistas/${artist.id}`}
                className="group inline-flex w-fit items-center gap-2 text-base text-bone-200 transition-colors hover:text-gold-400"
              >
                <UserIcon size={16} weight="bold" className="text-gold-500" />
                <span className="font-display font-bold uppercase tracking-[0.08em]">
                  {artist.name}
                </span>
                <span className="text-mute-500">
                  {formatLifespan(artist.birth_year, artist.death_year)}
                </span>
              </Link>
            ) : null}
            <FavoriteButton artworkId={artwork.id} variant="full" />
          </div>

          {artwork.description ? (
            <p className="max-w-xl text-sm leading-relaxed text-mute-400">
              {artwork.description}
            </p>
          ) : null}

          <dl className="flex flex-col">
            <DetailRow icon={<Palette size={18} weight="bold" />} label="Técnica">
              {artwork.technique || "No especificada"}
            </DetailRow>
            <DetailRow icon={<CalendarBlank size={18} weight="bold" />} label="Año">
              {formatYear(artwork.year)}
            </DetailRow>
            <DetailRow icon={<UserIcon size={18} weight="bold" />} label="Artista">
              {artist ? (
                <Link to={`/artistas/${artist.id}`} className="hover:text-gold-400">
                  {artist.name}
                  {artist.nationality ? ` · ${artist.nationality}` : ""}
                </Link>
              ) : (
                "—"
              )}
            </DetailRow>
            <DetailRow icon={<Door size={18} weight="bold" />} label="Sala">
              {room ? (
                <Link to={`/salas/${room.id}`} className="hover:text-gold-400">
                  {room.name} · Planta {room.floor}
                </Link>
              ) : (
                "Sin sala asignada"
              )}
            </DetailRow>
          </dl>
        </div>
      </div>

      {related.length > 0 && artist ? (
        <section className="mt-20 border-t border-ink-800 pt-12">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-xl font-black uppercase tracking-tight text-bone-50">
              Más de {artist.name}
            </h2>
            <Link
              to={`/artistas/${artist.id}`}
              className="inline-flex items-center gap-2 font-display text-[11px] font-bold uppercase tracking-[0.14em] text-mute-400 transition-colors hover:text-gold-400"
            >
              Ver artista <ArrowRight size={14} weight="bold" />
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
            {related.slice(0, 4).map((item) => (
              <ArtworkCard key={item.id} artwork={item} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
