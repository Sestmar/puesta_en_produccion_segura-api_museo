import { ArrowRight } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

import { ArtistCard } from "@/components/common/ArtistCard";
import { ArtworkCard } from "@/components/common/ArtworkCard";
import { RoomCard } from "@/components/common/RoomCard";
import { SectionHeading } from "@/components/common/SectionHeading";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useArtists, useArtworks, useRooms } from "@/hooks/queries";
import { formatNumber } from "@/lib/format";
import { imageForArtwork, imageForSeed } from "@/lib/images";

const SLIDE_INTERVAL_MS = 4500;
const SLIDE_COUNT = 6;

function Stat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="flex flex-col gap-1 text-center sm:text-left">
      <dt className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-mute-500">
        {label}
      </dt>
      <dd className="font-display text-4xl font-black text-bone-50">
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

function HeroSlideshow({ artworks }: { artworks: { id: number; title: string }[] }) {
  const slides =
    artworks.length > 1
      ? artworks.slice(1, Math.min(artworks.length, 1 + SLIDE_COUNT))
      : artworks.slice(0, 1);

  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (slides.length <= 1) return;
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, SLIDE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [slides.length, isPaused]);

  if (slides.length === 0) {
    return (
      <img
        src={imageForSeed("museo-hero", 1600)}
        alt="Obra destacada del museo"
        className="absolute inset-0 size-full object-cover"
      />
    );
  }

  return (
    <div
      className="absolute inset-0"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {slides.map((artwork, index) => {
        const isActive = index === current;
        return (
          <img
            key={artwork.id}
            src={imageForArtwork(artwork, 1600)}
            alt={artwork.title}
            className="absolute inset-0 size-full object-cover transition-all duration-[1500ms] ease-in-out"
            style={{
              opacity: isActive ? 1 : 0,
              transform: isActive ? "scale(1.05)" : "scale(1)",
            }}
          />
        );
      })}
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

  return (
    <>
      {/* Hero — full viewport, slideshow de fondo, texto centrado */}
      <section className="relative -mt-16 flex min-h-[calc(100dvh-2.5rem)] items-center justify-center overflow-hidden">
        <HeroSlideshow artworks={artworks} />
        <div className="overlay-ed absolute inset-0" />

        <div className="container-page relative z-10 flex flex-col items-center gap-8 py-32 text-center">
          <span className="animate-fade-up inline-flex w-fit items-center gap-2 rounded-pill border border-gold-500/40 bg-gold-500/10 px-4 py-2 font-display text-[10px] font-bold uppercase tracking-[0.22em] text-gold-400 backdrop-blur-sm">
            <span className="size-1.5 rounded-pill bg-gold-500" />
            Catálogo digital del museo
          </span>

          <h1 className="animate-fade-up-delay-1 text-balance max-w-4xl text-5xl font-black uppercase leading-[0.92] tracking-tight text-bone-50 sm:text-7xl lg:text-8xl">
            El arte,
            <br />
            <span className="text-gold-400">en su contexto</span>
          </h1>

          <p className="animate-fade-up-delay-2 max-w-xl text-base leading-relaxed text-bone-100/70 sm:text-lg">
            Recorre la colección: explora las obras y a sus autores, ubicadas por sala, y
            descubre cómo se organiza el acervo del museo.
          </p>

          <div className="animate-fade-up-delay-3 flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="btn-gold h-13 px-8 text-sm">
              <Link to="/obras">
                Explorar obras <ArrowRight size={18} weight="bold" />
              </Link>
            </Button>
            <Button
              asChild
              variant="secondary"
              size="lg"
              className="h-13 border-white/20 px-8 text-sm text-bone-50 hover:border-gold-500 hover:bg-white/5 hover:text-gold-400"
            >
              <Link to="/salas">Visitar salas</Link>
            </Button>
          </div>

          <dl className="animate-fade-up-delay-3 mt-8 flex flex-wrap justify-center gap-12 border-t border-white/10 pt-8">
            <Stat label="Obras" value={artworksQuery.data?.total} />
            <Stat label="Artistas" value={artistsQuery.data?.total} />
            <Stat label="Salas" value={roomsQuery.data?.total} />
          </dl>
        </div>
      </section>

      {/* Obras destacadas — full width, fondo alternado */}
      <section className="bg-ink-900">
        <div className="container-page py-20 lg:py-28">
          <SectionHeading
            index="01"
            title="Obras destacadas"
            description="Una selección del acervo para empezar el recorrido."
            action={
              <Button asChild variant="ghost" size="sm" className="text-bone-50 hover:text-gold-400">
                <Link to="/obras">
                  Ver catálogo <ArrowRight size={14} weight="bold" />
                </Link>
              </Button>
            }
          />
          <div className="mt-12">
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

      {/* Salas */}
      <section className="container-page py-20 lg:py-28">
        <SectionHeading
          index="02"
          title="Las salas del museo"
          description="Cada sala reúne obras bajo un criterio curatorial: ubicación, época o tema."
          action={
            <Button asChild variant="ghost" size="sm" className="text-bone-50 hover:text-gold-400">
              <Link to="/salas">
                Ver todas <ArrowRight size={14} weight="bold" />
              </Link>
            </Button>
          }
        />
        <div className="mt-12">
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

      {/* Artistas */}
      <section className="border-y border-ink-800 bg-ink-900/50">
        <div className="container-page py-20 lg:py-28">
          <SectionHeading
            index="03"
            title="Los artistas"
            description="Quiénes están detrás de las obras del acervo."
            action={
              <Button asChild variant="ghost" size="sm" className="text-bone-50 hover:text-gold-400">
                <Link to="/artistas">
                  Ver todos <ArrowRight size={14} weight="bold" />
                </Link>
              </Button>
            }
          />
          <div className="mt-12">
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
        </div>
      </section>

      {/* CTA */}
      <section className="container-page pb-8 pt-20">
        <div className="relative overflow-hidden rounded-card bg-gradient-to-br from-gold-400 to-gold-600 px-8 py-14 text-ink-950 sm:px-14">
          <div className="relative flex flex-col items-start gap-8 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-3">
              <span className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-ink-950/60">
                Administración
              </span>
              <h2 className="text-3xl font-black uppercase tracking-tight sm:text-4xl">
                ¿Gestionas el acervo?
              </h2>
              <p className="max-w-xl text-sm text-ink-950/80">
                Ingresa con tu cuenta para administrar obras, artistas y salas, y consultar la
                auditoría del sistema.
              </p>
            </div>
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="border-ink-950/30 bg-ink-950 text-bone-50 hover:bg-ink-900 hover:text-bone-50"
            >
              <Link to="/login">
                Ingresar al panel <ArrowRight size={18} weight="bold" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
