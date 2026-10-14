import { zodResolver } from "@hookform/resolvers/zod";
import { FunnelSimple, Images, Plus } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { RowActions } from "@/components/admin/RowActions";
import { PageHeader } from "@/components/common/PageHeader";
import { errorMessage } from "@/components/common/QueryState";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { useCreateArtwork, useDeleteArtwork, useUpdateArtwork } from "@/hooks/mutations";
import { useArtists, useArtworks, useRooms } from "@/hooks/queries";
import type { Artwork } from "@/lib/api/types";
import { formatYear } from "@/lib/format";
import { nullableInt, nullableText, optionalYearField } from "@/lib/forms";

const PAGE_SIZE = 20;
const ALL = "all";
const NO_ROOM = "none";

const schema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio").max(200, "Máximo 200 caracteres"),
  year: optionalYearField(-3000, 2100),
  technique: z.string().trim().max(80, "Máximo 80 caracteres"),
  description: z.string().trim().max(5000, "Máximo 5000 caracteres"),
  artist_id: z.string().min(1, "Elegí un artista"),
  room_id: z.string(),
});

type FormValues = z.infer<typeof schema>;

function ArtworkFormDialog({
  open,
  onOpenChange,
  artwork,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artwork: Artwork | null;
}) {
  const { success, error: errorToast } = useToast();
  const createArtwork = useCreateArtwork();
  const updateArtwork = useUpdateArtwork();
  const isEditing = artwork !== null;

  const artistsQuery = useArtists({ limit: 100 });
  const roomsQuery = useRooms({ limit: 100 });
  const artists = artistsQuery.data?.items ?? [];
  const rooms = roomsQuery.data?.items ?? [];

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      year: "",
      technique: "",
      description: "",
      artist_id: "",
      room_id: NO_ROOM,
    },
  });

  useEffect(() => {
    if (!open) return;
    if (artwork) {
      reset({
        title: artwork.title,
        year: artwork.year === null ? "" : String(artwork.year),
        technique: artwork.technique ?? "",
        description: artwork.description ?? "",
        artist_id: String(artwork.artist_id),
        room_id: artwork.room_id === null ? NO_ROOM : String(artwork.room_id),
      });
    } else {
      reset({
        title: "",
        year: "",
        technique: "",
        description: "",
        artist_id: "",
        room_id: NO_ROOM,
      });
    }
  }, [open, artwork, reset]);

  const isPending = createArtwork.isPending || updateArtwork.isPending;

  async function onSubmit(values: FormValues) {
    const payload = {
      title: values.title.trim(),
      year: nullableInt(values.year),
      technique: nullableText(values.technique),
      description: nullableText(values.description),
      artist_id: Number(values.artist_id),
      room_id: values.room_id === NO_ROOM ? null : Number(values.room_id),
    };
    try {
      if (artwork) {
        await updateArtwork.mutateAsync({ id: artwork.id, payload });
        success("Obra actualizada");
      } else {
        await createArtwork.mutateAsync(payload);
        success("Obra creada");
      }
      onOpenChange(false);
    } catch (error) {
      errorToast("No se pudo guardar", errorMessage(error));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar obra" : "Nueva obra"}</DialogTitle>
            <DialogDescription>Ficha catalográfica de la obra.</DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-5 py-4">
            <Field label="Título" htmlFor="artwork-title" required error={errors.title?.message}>
              <Input id="artwork-title" autoFocus {...register("title")} />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Artista"
                required
                error={errors.artist_id?.message}
                hint={artists.length === 0 ? "Primero creá un artista." : undefined}
              >
                <Controller
                  control={control}
                  name="artist_id"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Elegí un artista" />
                      </SelectTrigger>
                      <SelectContent>
                        {artists.map((artist) => (
                          <SelectItem key={artist.id} value={String(artist.id)}>
                            {artist.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>

              <Field label="Sala" error={errors.room_id?.message} hint="Opcional">
                <Controller
                  control={control}
                  name="room_id"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sin sala" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_ROOM}>Sin sala asignada</SelectItem>
                        {rooms.map((room) => (
                          <SelectItem key={room.id} value={String(room.id)}>
                            {room.name} · Planta {room.floor}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Año" htmlFor="artwork-year" error={errors.year?.message}>
                <Input
                  id="artwork-year"
                  inputMode="numeric"
                  placeholder="1889"
                  {...register("year")}
                />
              </Field>
              <Field
                label="Técnica"
                htmlFor="artwork-technique"
                error={errors.technique?.message}
              >
                <Input
                  id="artwork-technique"
                  placeholder="Óleo sobre lienzo"
                  {...register("technique")}
                />
              </Field>
            </div>

            <Field
              label="Descripción"
              htmlFor="artwork-description"
              error={errors.description?.message}
            >
              <Textarea
                id="artwork-description"
                placeholder="Notas curatoriales sobre la obra…"
                {...register("description")}
              />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isPending}>
              {isEditing ? "Guardar cambios" : "Crear obra"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AdminArtworksPage() {
  const [page, setPage] = useState(0);
  const [artistFilter, setArtistFilter] = useState<string>(ALL);
  const [roomFilter, setRoomFilter] = useState<string>(ALL);

  const artistsQuery = useArtists({ limit: 100 });
  const roomsQuery = useRooms({ limit: 100 });

  const artworkParams = useMemo(
    () => ({
      skip: page * PAGE_SIZE,
      limit: PAGE_SIZE,
      artist_id: artistFilter === ALL ? undefined : Number(artistFilter),
      room_id: roomFilter === ALL ? undefined : Number(roomFilter),
    }),
    [page, artistFilter, roomFilter],
  );

  const artworksQuery = useArtworks(artworkParams);
  const artworks = artworksQuery.data?.items ?? [];
  const total = artworksQuery.data?.total ?? 0;

  const artistNames = useMemo(() => {
    const map = new Map<number, string>();
    for (const artist of artistsQuery.data?.items ?? []) map.set(artist.id, artist.name);
    return map;
  }, [artistsQuery.data]);

  const roomNames = useMemo(() => {
    const map = new Map<number, string>();
    for (const room of roomsQuery.data?.items ?? []) map.set(room.id, room.name);
    return map;
  }, [roomsQuery.data]);

  const { success, error: errorToast } = useToast();
  const deleteArtwork = useDeleteArtwork();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Artwork | null>(null);
  const [deleting, setDeleting] = useState<Artwork | null>(null);

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await deleteArtwork.mutateAsync(deleting.id);
      success("Obra eliminada");
      setDeleting(null);
    } catch (error) {
      errorToast("No se pudo eliminar", errorMessage(error));
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Obras"
        description="Administrá las obras del acervo y su ubicación."
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus size={16} weight="bold" /> Nueva obra
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <span className="flex items-center gap-2 font-display text-[11px] font-bold uppercase tracking-[0.16em] text-mute-500">
          <FunnelSimple size={15} weight="bold" /> Filtrar
        </span>
        <Select
          value={artistFilter}
          onValueChange={(value) => {
            setArtistFilter(value);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-full sm:w-60">
            <SelectValue placeholder="Todos los artistas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los artistas</SelectItem>
            {(artistsQuery.data?.items ?? []).map((artist) => (
              <SelectItem key={artist.id} value={String(artist.id)}>
                {artist.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={roomFilter}
          onValueChange={(value) => {
            setRoomFilter(value);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Todas las salas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas las salas</SelectItem>
            {(roomsQuery.data?.items ?? []).map((room) => (
              <SelectItem key={room.id} value={String(room.id)}>
                {room.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {artworksQuery.isPending ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      ) : artworks.length === 0 ? (
        <EmptyState
          icon={Images}
          title="Sin obras"
          description="No hay obras que coincidan con los filtros seleccionados."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus size={16} weight="bold" /> Nueva obra
            </Button>
          }
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead className="w-20">Año</TableHead>
                <TableHead>Técnica</TableHead>
                <TableHead>Artista</TableHead>
                <TableHead>Sala</TableHead>
                <TableHead className="w-16 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {artworks.map((artwork) => (
                <TableRow key={artwork.id}>
                  <TableCell className="font-bold text-bone-50">{artwork.title}</TableCell>
                  <TableCell className="text-mute-400">{formatYear(artwork.year)}</TableCell>
                  <TableCell className="text-mute-400">{artwork.technique ?? "—"}</TableCell>
                  <TableCell>{artistNames.get(artwork.artist_id) ?? `#${artwork.artist_id}`}</TableCell>
                  <TableCell className="text-mute-400">
                    {artwork.room_id === null
                      ? "—"
                      : (roomNames.get(artwork.room_id) ?? `#${artwork.room_id}`)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end">
                      <RowActions
                        onEdit={() => {
                          setEditing(artwork);
                          setDialogOpen(true);
                        }}
                        onDelete={() => setDeleting(artwork)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </>
      )}

      <ArtworkFormDialog open={dialogOpen} onOpenChange={setDialogOpen} artwork={editing} />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="¿Eliminar obra?"
        description={
          <>
            Vas a eliminar <strong className="text-bone-100">{deleting?.title}</strong>. Esta
            acción no se puede deshacer.
          </>
        }
        confirmLabel="Eliminar"
        loading={deleteArtwork.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
