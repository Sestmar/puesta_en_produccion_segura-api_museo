import { PaintBrush } from "@phosphor-icons/react";
import { useSearchParams } from "react-router-dom";

import { ArtistCard } from "@/components/common/ArtistCard";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorPanel } from "@/components/common/QueryState";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { useArtists } from "@/hooks/queries";

const PAGE_SIZE = 12;

export function ArtistsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const pageParam = Number(searchParams.get("page") ?? "1");
  const page = Number.isFinite(pageParam) && pageParam >= 1 ? Math.floor(pageParam) : 1;

  const artistsQuery = useArtists({ skip: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE });
  const artists = artistsQuery.data?.items ?? [];
  const total = artistsQuery.data?.total ?? 0;

  return (
    <div className="container-page py-12 lg:py-16">
      <PageHeader
        title="Artistas"
        description="Las autoras y autores representados en la colección del museo."
      />

      <div className="mt-10">
        {artistsQuery.isPending ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="flex flex-col gap-3">
                <Skeleton className="aspect-square w-full rounded-card" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : artistsQuery.isError ? (
          <ErrorPanel onRetry={() => artistsQuery.refetch()} />
        ) : artists.length === 0 ? (
          <EmptyState
            icon={PaintBrush}
            title="Todavía no hay artistas"
            description="Cuando se carguen artistas en el acervo, van a aparecer acá."
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
              {artists.map((artist) => (
                <ArtistCard key={artist.id} artist={artist} />
              ))}
            </div>
            <div className="mt-14">
              <Pagination
                page={page - 1}
                pageSize={PAGE_SIZE}
                total={total}
                onPageChange={(nextPage) => {
                  const next = new URLSearchParams(searchParams);
                  next.set("page", String(nextPage + 1));
                  setSearchParams(next, { replace: true });
                }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
