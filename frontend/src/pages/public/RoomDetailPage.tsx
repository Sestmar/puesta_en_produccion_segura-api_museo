import { ArrowLeft, Images } from "@phosphor-icons/react";
import { Link, useParams } from "react-router-dom";

import { ArtworkCard } from "@/components/common/ArtworkCard";
import { ErrorPanel } from "@/components/common/QueryState";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { imageForRoom } from "@/lib/images";
import { useArtworks, useRoom } from "@/hooks/queries";

export function RoomDetailPage() {
  const params = useParams<{ id: string }>();
  const roomId = Number(params.id);

  const roomQuery = useRoom(roomId);
  const artworksQuery = useArtworks({ room_id: roomId, limit: 100 });

  if (roomQuery.isPending) {
    return (
      <div className="container-page py-12 lg:py-16">
        <Skeleton className="aspect-21/9 w-full rounded-card" />
        <Skeleton className="mt-8 h-10 w-1/2" />
      </div>
    );
  }

  if (roomQuery.isError || !roomQuery.data) {
    return (
      <div className="container-page py-16">
        <ErrorPanel
          title="No encontramos la sala"
          description="Puede que se haya eliminado o que el enlace no sea válido."
          onRetry={() => roomQuery.refetch()}
        />
      </div>
    );
  }

  const room = roomQuery.data;
  const artworks = artworksQuery.data?.items ?? [];

  return (
    <div className="container-page py-12 lg:py-16">
      <Link
        to="/salas"
        className="inline-flex items-center gap-2 font-display text-[11px] font-bold uppercase tracking-[0.16em] text-mute-400 transition-colors hover:text-gold-400"
      >
        <ArrowLeft size={14} weight="bold" /> Salas
      </Link>

      <header className="relative mt-8 overflow-hidden rounded-card border border-ink-700">
        <div className="relative aspect-21/9 max-h-[420px] w-full">
          <img src={imageForRoom(room, 1600)} alt={room.name} className="size-full object-cover" />
          <div className="absolute inset-0 bg-linear-to-t from-ink-950 via-ink-950/40 to-transparent" />
        </div>
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-6 sm:p-10">
          <Badge variant="gold" className="w-fit">
            Planta {room.floor}
          </Badge>
          <h1 className="text-balance text-4xl font-black uppercase tracking-tight text-bone-50 sm:text-5xl">
            {room.name}
          </h1>
          {room.description ? (
            <p className="max-w-2xl text-sm text-bone-200">{room.description}</p>
          ) : null}
        </div>
      </header>

      <section className="mt-16">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-xl font-black uppercase tracking-tight text-bone-50">
            Obras en esta sala
          </h2>
          {artworksQuery.data ? (
            <span className="font-display text-xs font-bold uppercase tracking-[0.14em] text-mute-500">
              {artworksQuery.data.total}{" "}
              {artworksQuery.data.total === 1 ? "obra" : "obras"}
            </span>
          ) : null}
        </div>
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
              title="Sala sin obras"
              description="Esta sala todavía no tiene obras asignadas en el acervo."
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
