import { Door } from "@phosphor-icons/react";
import { useSearchParams } from "react-router-dom";

import { PageHeader } from "@/components/common/PageHeader";
import { ErrorPanel } from "@/components/common/QueryState";
import { RoomCard } from "@/components/common/RoomCard";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { useRooms } from "@/hooks/queries";

const PAGE_SIZE = 9;

export function RoomsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const pageParam = Number(searchParams.get("page") ?? "1");
  const page = Number.isFinite(pageParam) && pageParam >= 1 ? Math.floor(pageParam) : 1;

  const roomsQuery = useRooms({ skip: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE });
  const rooms = roomsQuery.data?.items ?? [];
  const total = roomsQuery.data?.total ?? 0;

  return (
    <div className="container-page py-12 lg:py-16">
      <PageHeader
        title="Salas"
        description="El museo organiza su acervo en salas. Recorré cada una para ver las obras que alberga."
      />

      <div className="mt-10">
        {roomsQuery.isPending ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="aspect-16/10 w-full rounded-card" />
            ))}
          </div>
        ) : roomsQuery.isError ? (
          <ErrorPanel onRetry={() => roomsQuery.refetch()} />
        ) : rooms.length === 0 ? (
          <EmptyState
            icon={Door}
            title="Todavía no hay salas"
            description="Cuando se definan salas en el museo, van a aparecer acá."
          />
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => (
                <RoomCard key={room.id} room={room} />
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
