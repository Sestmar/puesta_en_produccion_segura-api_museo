import { ArrowRight } from "@phosphor-icons/react";
import { Link } from "react-router-dom";

import { ArtistCard } from "@/components/common/ArtistCard";
import { ArtworkCard } from "@/components/common/ArtworkCard";
import { RoomCard } from "@/components/common/RoomCard";
import { SectionHeading } from "@/components/common/SectionHeading";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useArtists, useArtworks, useRooms } from "@/hooks/queries";
import { formatNumber } from "@/lib/format";
import { imageForArtwork, imageForSeed } from "@/lib/images";

function Stat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-mute-500">
        {label}
      </dt>
      <dd className="font-display text-3xl font-black text-bone-50">
        {value === undefined ? "—" : formatNumber(value)}
      </dd>
    </div>
  );
}

function CardGridSkeleton({ count, className }: { count: number; className?: string }) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex flex-col gap-3">
          <Skeleton className="aspect-4/5 w-full rounded-card" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function HomePage() {
  const artworksQuery = useArtworks({ limit: 8 });
  const artistsQuery = useArtists({ limit: 6 });
  const roomsQuery = useRooms({ limit: 6 });

  const artworks = artworksQuery.data?.items ?? [];
  const artists = artistsQuery.data?.items ?? [];
  const rooms = roomsQuery.data?.items ?? [];

  const heroArtwork = artworks[0];
  const heroImage = heroArtwork
    ? imageForArtwork(heroArtwork, 1000)
    : imageForSeed("museo-hero", 1000);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-ink-800">
        <div className="container-page grid items-center gap-12 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div className="flex flex-col gap-8">
            <span className="inline-flex w-fit items-center gap-2 rounded-pill border border-ink-700 px-3.5 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.22em] text-mute-400">
              <span className="size-1.5 rounded-pill bg-gold-500" />
              Catálogo digital del museo
            </span>

            <h1 className="text-balance text-5xl font-black uppercase leading-[0.94] tracking-tight text-bone-50 sm:text-6xl lg:text-7xl">
              El arte,
              <br />
              <span className="text-gold-500">en su contexto</span>
            </h1>

            <p className="max-w-lg text-base leading-relaxed text-mute-400">
              Recorré la colección: explorá las obras y a sus autores, ubicalas por sala y
              descubrí cómo se organiza el acervo del museo.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/obras">
                  Explorar obras <ArrowRight size={16} weight="bold" />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link to="/salas">Visitar salas</Link>
              </Button>
            </div>

            <dl className="flex flex-wrap gap-10 border-t border-ink-800 pt-6">
              <Stat label="Obras" value={artworksQuery.data?.total} />
              <Stat label="Artistas" value={artistsQuery.data?.total} />
              <Stat label="Salas" value={roomsQuery.data?.total} />
            </dl>
          </div>

          <div className="relative">
            <div className="relative aspect-4/5 overflow-hidden rounded-card border border-ink-700">
              <img
                src={heroImage}
                alt={heroArtwork?.title ?? "Obra destacada del museo"}
                className="size-full object-cover"
              />
              <div className="absolute inset-0 bg-linear-to-t from-ink-950/70 via-transparent to-transparent" />
            </div>
            {heroArtwork ? (
              <figcaption className="absolute -bottom-5 left-4 right-4 rounded-card border border-ink-700 bg-ink-900/95 p-4 backdrop-blur-sm sm:left-6 sm:right-6">
                <p className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-gold-500">
                  Destacada
                </p>
                <p className="mt-1 font-display text-base font-bold text-bone-50">
                  {heroArtwork.title}
                </p>
              </figcaption>
            ) : null}
          </div>
        </div>
      </section>

      {/* Salas */}
      <section className="container-page py-16 lg:py-20">
        <SectionHeading
          index="01"
          title="Las salas del museo"
          description="Cada sala reúne obras bajo un criterio curatorial: ubicación, época o tema."
          action={
            <Button asChild variant="ghost" size="sm">
              <Link to="/salas">
                Ver todas <ArrowRight size={14} weight="bold" />
              </Link>
            </Button>
          }
        />
        <div className="mt-10">
          {roomsQuery.isPending ? (
            <CardGridSkeleton count={3} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" />
          ) : rooms.length === 0 ? (
            <p className="text-sm text-mute-400">Todavía no hay salas cargadas.</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.slice(0, 3).map((room) => (
                <RoomCard key={room.id} room={room} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Obras destacadas */}
      <section className="border-y border-ink-800 bg-ink-900/40">
        <div className="container-page py-16 lg:py-20">
          <SectionHeading
            index="02"
            title="Obras destacadas"
            description="Una selección del acervo para empezar el recorrido."
            action={
              <Button asChild variant="ghost" size="sm">
                <Link to="/obras">
                  Ver catálogo <ArrowRight size={14} weight="bold" />
                </Link>
              </Button>
            }
          />
          <div className="mt-10">
            {artworksQuery.isPending ? (
              <CardGridSkeleton
                count={4}
                className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4"
              />
            ) : artworks.length === 0 ? (
              <p className="text-sm text-mute-400">Todavía no hay obras cargadas.</p>
            ) : (
              <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
                {artworks.slice(0, 4).map((artwork) => (
                  <ArtworkCard key={artwork.id} artwork={artwork} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Artistas */}
      <section className="container-page py-16 lg:py-20">
        <SectionHeading
          index="03"
          title="Los artistas"
          description="Quiénes están detrás de las obras del acervo."
          action={
            <Button asChild variant="ghost" size="sm">
              <Link to="/artistas">
                Ver todos <ArrowRight size={14} weight="bold" />
              </Link>
            </Button>
          }
        />
        <div className="mt-10">
          {artistsQuery.isPending ? (
            <CardGridSkeleton
              count={6}
              className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6"
            />
          ) : artists.length === 0 ? (
            <p className="text-sm text-mute-400">Todavía no hay artistas cargados.</p>
          ) : (
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
              {artists.slice(0, 6).map((artist) => (
                <ArtistCard key={artist.id} artist={artist} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="container-page pb-8">
        <div className="relative overflow-hidden rounded-card bg-gold-500 px-8 py-12 text-ink-950 sm:px-12">
          <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-black uppercase tracking-tight sm:text-3xl">
                ¿Gestionás el acervo?
              </h2>
              <p className="max-w-xl text-sm text-ink-950/80">
                Ingresá con tu cuenta para administrar obras, artistas y salas, y consultar la
                auditoría del sistema.
              </p>
            </div>
            <Button asChild size="lg" variant="secondary" className="border-ink-950/30 text-ink-950 hover:border-ink-950 hover:text-ink-950">
              <Link to="/login">
                Ingresar al panel <ArrowRight size={16} weight="bold" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
