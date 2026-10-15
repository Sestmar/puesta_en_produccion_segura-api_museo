import { Heart } from "@phosphor-icons/react";
import { Link, useSearchParams } from "react-router-dom";

import { ArtworkCard } from "@/components/common/ArtworkCard";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorPanel } from "@/components/common/QueryState";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { useFavorites } from "@/hooks/queries";

const PAGE_SIZE = 12;

export function MyCollectionPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const pageParam = Number(searchParams.get("page") ?? "1");
  const page = Number.isFinite(pageParam) && pageParam >= 1 ? Math.floor(pageParam) : 1;

  const favoritesQuery = useFavorites({ skip: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE });
  const artworks = favoritesQuery.data?.items ?? [];
  const total = favoritesQuery.data?.total ?? 0;

  return (
    <div className="container-page py-12 lg:py-16">
      <PageHeader
        title="Mi colección"
        description="Las obras que has guardado. Pulsa el corazón de cualquier obra para añadirla o quitarla."
      />

      <div className="mt-10">
        {favoritesQuery.isPending ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex flex-col gap-3">
                <Skeleton className="aspect-4/5 w-full rounded-card" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        ) : favoritesQuery.isError ? (
          <ErrorPanel onRetry={() => favoritesQuery.refetch()} />
        ) : artworks.length === 0 ? (
          <EmptyState
            icon={Heart}
            title={total > 0 ? "No hay obras en esta página" : "Tu colección está vacía"}
            description="Explora el catálogo y guarda las obras que más te gusten."
            action={
              <Button asChild variant="secondary">
                <Link to="/obras">Explorar obras</Link>
              </Button>
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
