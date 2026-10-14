import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
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
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
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
import { useCreateArtist, useDeleteArtist, useUpdateArtist } from "@/hooks/mutations";
import { useArtists } from "@/hooks/queries";
import type { Artist } from "@/lib/api/types";
import { formatLifespan } from "@/lib/format";
import { nullableInt, nullableText, optionalYearField } from "@/lib/forms";
import { PaintBrush } from "@phosphor-icons/react";

const PAGE_SIZE = 20;

const schema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "El nombre es obligatorio")
      .max(120, "Máximo 120 caracteres"),
    nationality: z.string().trim().max(60, "Máximo 60 caracteres"),
    birth_year: optionalYearField(-3000, 2100),
    death_year: optionalYearField(-3000, 2100),
  })
  .refine(
    (values) => {
      const birth = nullableInt(values.birth_year);
      const death = nullableInt(values.death_year);
      return birth === null || death === null || death >= birth;
    },
    { path: ["death_year"], message: "El año de fallecimiento no puede ser anterior al nacimiento" },
  );

type FormValues = z.infer<typeof schema>;

function ArtistFormDialog({
  open,
  onOpenChange,
  artist,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artist: Artist | null;
}) {
  const { success, error: errorToast } = useToast();
  const createArtist = useCreateArtist();
  const updateArtist = useUpdateArtist();
  const isEditing = artist !== null;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", nationality: "", birth_year: "", death_year: "" },
  });

  useEffect(() => {
    if (!open) return;
    if (artist) {
      reset({
        name: artist.name,
        nationality: artist.nationality ?? "",
        birth_year: artist.birth_year === null ? "" : String(artist.birth_year),
        death_year: artist.death_year === null ? "" : String(artist.death_year),
      });
    } else {
      reset({ name: "", nationality: "", birth_year: "", death_year: "" });
    }
  }, [open, artist, reset]);

  const isPending = createArtist.isPending || updateArtist.isPending;

  async function onSubmit(values: FormValues) {
    const payload = {
      name: values.name.trim(),
      nationality: nullableText(values.nationality),
      birth_year: nullableInt(values.birth_year),
      death_year: nullableInt(values.death_year),
    };
    try {
      if (artist) {
        await updateArtist.mutateAsync({ id: artist.id, payload });
        success("Artista actualizado");
      } else {
        await createArtist.mutateAsync(payload);
        success("Artista creado");
      }
      onOpenChange(false);
    } catch (error) {
      errorToast("No se pudo guardar", errorMessage(error));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar artista" : "Nuevo artista"}</DialogTitle>
            <DialogDescription>
              Datos biográficos básicos del autor.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-5 py-4">
            <Field label="Nombre" htmlFor="artist-name" required error={errors.name?.message}>
              <Input id="artist-name" autoFocus {...register("name")} />
            </Field>
            <Field
              label="Nacionalidad"
              htmlFor="artist-nationality"
              error={errors.nationality?.message}
            >
              <Input
                id="artist-nationality"
                placeholder="p. ej. Argentina"
                {...register("nationality")}
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Año de nacimiento"
                htmlFor="artist-birth"
                error={errors.birth_year?.message}
              >
                <Input
                  id="artist-birth"
                  inputMode="numeric"
                  placeholder="1900"
                  {...register("birth_year")}
                />
              </Field>
              <Field
                label="Año de fallecimiento"
                htmlFor="artist-death"
                error={errors.death_year?.message}
                hint="Dejar vacío si sigue con vida"
              >
                <Input
                  id="artist-death"
                  inputMode="numeric"
                  placeholder="1980"
                  {...register("death_year")}
                />
              </Field>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isPending}>
              {isEditing ? "Guardar cambios" : "Crear artista"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AdminArtistsPage() {
  const [page, setPage] = useState(0);
  const artistsQuery = useArtists({ skip: page * PAGE_SIZE, limit: PAGE_SIZE });
  const artists = artistsQuery.data?.items ?? [];
  const total = artistsQuery.data?.total ?? 0;

  const { success, error: errorToast } = useToast();
  const deleteArtist = useDeleteArtist();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Artist | null>(null);
  const [deleting, setDeleting] = useState<Artist | null>(null);

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await deleteArtist.mutateAsync(deleting.id);
      success("Artista eliminado");
      setDeleting(null);
    } catch (error) {
      errorToast("No se pudo eliminar", errorMessage(error));
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Artistas"
        description="Administrá los autores del acervo."
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus size={16} weight="bold" /> Nuevo artista
          </Button>
        }
      />

      {artistsQuery.isPending ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      ) : artists.length === 0 ? (
        <EmptyState
          icon={PaintBrush}
          title="Todavía no hay artistas"
          description="Creá el primer artista para empezar a cargar obras."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus size={16} weight="bold" /> Nuevo artista
            </Button>
          }
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Nacionalidad</TableHead>
                <TableHead>Vida</TableHead>
                <TableHead className="w-16 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {artists.map((artist) => (
                <TableRow key={artist.id}>
                  <TableCell className="font-bold text-bone-50">{artist.name}</TableCell>
                  <TableCell>{artist.nationality ?? "—"}</TableCell>
                  <TableCell className="text-mute-400">
                    {formatLifespan(artist.birth_year, artist.death_year)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end">
                      <RowActions
                        onEdit={() => {
                          setEditing(artist);
                          setDialogOpen(true);
                        }}
                        onDelete={() => setDeleting(artist)}
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

      <ArtistFormDialog open={dialogOpen} onOpenChange={setDialogOpen} artist={editing} />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="¿Eliminar artista?"
        description={
          <>
            Vas a eliminar a <strong className="text-bone-100">{deleting?.name}</strong>. Solo se
            puede eliminar un artista que no tenga obras registradas. Esta acción no se puede
            deshacer.
          </>
        }
        confirmLabel="Eliminar"
        loading={deleteArtist.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
