import { FunnelSimple, Images, X } from "@phosphor-icons/react";
import { useSearchParams } from "react-router-dom";

import { ArtworkCard } from "@/components/common/ArtworkCard";
import { ErrorPanel } from "@/components/common/QueryState";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useArtists, useArtworks, useRooms } from "@/hooks/queries";

const PAGE_SIZE = 12;
const ALL = "all";

export function ArtworksPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const artistParam = searchParams.get("artist");
  const roomParam = searchParams.get("room");
  const pageParam = Number(searchParams.get("page") ?? "1");

  const artistId = artistParam ? Number(artistParam) : undefined;
  const roomId = roomParam ? Number(roomParam) : undefined;
  const page = Number.isFinite(pageParam) && pageParam >= 1 ? Math.floor(pageParam) : 1;
  const skip = (page - 1) * PAGE_SIZE;

  const artistsQuery = useArtists({ limit: 100 });
  const roomsQuery = useRooms({ limit: 100 });
  const artworksQuery = useArtworks({
    skip,
    limit: PAGE_SIZE,
    artist_id: artistId,
    room_id: roomId,
  });

  const artists = artistsQuery.data?.items ?? [];
  const rooms = roomsQuery.data?.items ?? [];
  const artworks = artworksQuery.data?.items ?? [];
  const total = artworksQuery.data?.total ?? 0;

  const selectedArtist = artists.find((artist) => artist.id === artistId);
  const selectedRoom = rooms.find((room) => room.id === roomId);

  function updateParam(key: "artist" | "room" | "page", value: string | undefined) {
    const next = new URLSearchParams(searchParams);
    if (value === undefined || value === "" || value === ALL) next.delete(key);
    else next.set(key, value);
    if (key !== "page") next.delete("page");
    setSearchParams(next, { replace: true });
  }

  const hasFilters = artistId !== undefined || roomId !== undefined;

  return (
    <div className="container-page py-12 lg:py-16">
      <PageHeader
        title="Obras"
        description="Explorá el acervo completo del museo. Filtrá por artista o por sala para acotar el recorrido."
      />

      <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <span className="flex items-center gap-2 font-display text-[11px] font-bold uppercase tracking-[0.16em] text-mute-500">
            <FunnelSimple size={15} weight="bold" /> Filtrar
          </span>
          <Select
            value={artistParam ?? ALL}
            onValueChange={(value) => updateParam("artist", value)}
          >
            <SelectTrigger className="w-full sm:w-60">
              <SelectValue placeholder="Todos los artistas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los artistas</SelectItem>
              {artists.map((artist) => (
                <SelectItem key={artist.id} value={String(artist.id)}>
                  {artist.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={roomParam ?? ALL} onValueChange={(value) => updateParam("room", value)}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder="Todas las salas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas las salas</SelectItem>
              {rooms.map((room) => (
                <SelectItem key={room.id} value={String(room.id)}>
                  {room.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedArtist ? (
            <Badge variant="outline" className="gap-2">
              {selectedArtist.name}
              <button
                type="button"
                aria-label="Quitar filtro de artista"
                onClick={() => updateParam("artist", undefined)}
              >
                <X size={12} weight="bold" />
              </button>
            </Badge>
          ) : null}
          {selectedRoom ? (
            <Badge variant="outline" className="gap-2">
              {selectedRoom.name}
              <button
                type="button"
                aria-label="Quitar filtro de sala"
                onClick={() => updateParam("room", undefined)}
              >
                <X size={12} weight="bold" />
              </button>
            </Badge>
          ) : null}
          {hasFilters ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchParams(new URLSearchParams(), { replace: true })}
            >
              Limpiar filtros
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-10">
        {artworksQuery.isPending ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="flex flex-col gap-3">
                <Skeleton className="aspect-4/5 w-full rounded-card" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : artworksQuery.isError ? (
          <ErrorPanel onRetry={() => artworksQuery.refetch()} />
        ) : artworks.length === 0 ? (
          <EmptyState
            icon={Images}
            title="Sin obras para estos filtros"
            description="Probá quitar los filtros o elegir otro artista o sala."
            action={
              hasFilters ? (
                <Button
                  variant="secondary"
                  onClick={() => setSearchParams(new URLSearchParams(), { replace: true })}
                >
                  Limpiar filtros
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
              {artworks.map((artwork) => (
                <ArtworkCard key={artwork.id} artwork={artwork} />
              ))}
            </div>
            <div className="mt-14">
              <Pagination
                page={page - 1}
                pageSize={PAGE_SIZE}
                total={total}
                onPageChange={(nextPage) =>
                  updateParam("page", String(nextPage + 1))
                }
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
