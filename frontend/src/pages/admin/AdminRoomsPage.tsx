import { zodResolver } from "@hookform/resolvers/zod";
import { Door, Plus } from "@phosphor-icons/react";
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
import { Input, Textarea } from "@/components/ui/input";
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
import { useCreateRoom, useDeleteRoom, useUpdateRoom } from "@/hooks/mutations";
import { useRooms } from "@/hooks/queries";
import type { Room } from "@/lib/api/types";
import { nullableText, requiredIntField } from "@/lib/forms";

const PAGE_SIZE = 20;

const schema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(80, "Máximo 80 caracteres"),
  floor: requiredIntField(0, 20, "La planta debe estar entre 0 y 20"),
  description: z.string().trim().max(2000, "Máximo 2000 caracteres"),
});

type FormValues = z.infer<typeof schema>;

function RoomFormDialog({
  open,
  onOpenChange,
  room,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: Room | null;
}) {
  const { success, error: errorToast } = useToast();
  const createRoom = useCreateRoom();
  const updateRoom = useUpdateRoom();
  const isEditing = room !== null;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", floor: "0", description: "" },
  });

  useEffect(() => {
    if (!open) return;
    if (room) {
      reset({
        name: room.name,
        floor: String(room.floor),
        description: room.description ?? "",
      });
    } else {
      reset({ name: "", floor: "0", description: "" });
    }
  }, [open, room, reset]);

  const isPending = createRoom.isPending || updateRoom.isPending;

  async function onSubmit(values: FormValues) {
    const payload = {
      name: values.name.trim(),
      floor: Number(values.floor),
      description: nullableText(values.description),
    };
    try {
      if (room) {
        await updateRoom.mutateAsync({ id: room.id, payload });
        success("Sala actualizada");
      } else {
        await createRoom.mutateAsync(payload);
        success("Sala creada");
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
            <DialogTitle>{isEditing ? "Editar sala" : "Nueva sala"}</DialogTitle>
            <DialogDescription>Ubicación y descripción de la sala.</DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-5 py-4">
            <Field label="Nombre" htmlFor="room-name" required error={errors.name?.message}>
              <Input id="room-name" autoFocus {...register("name")} />
            </Field>
            <Field
              label="Planta"
              htmlFor="room-floor"
              required
              error={errors.floor?.message}
              hint="Número de piso donde se encuentra (0 = planta baja)"
            >
              <Input
                id="room-floor"
                inputMode="numeric"
                type="number"
                min={0}
                max={20}
                {...register("floor")}
              />
            </Field>
            <Field
              label="Descripción"
              htmlFor="room-description"
              error={errors.description?.message}
            >
              <Textarea
                id="room-description"
                placeholder="Una breve descripción del criterio curatorial de la sala…"
                {...register("description")}
              />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isPending}>
              {isEditing ? "Guardar cambios" : "Crear sala"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AdminRoomsPage() {
  const [page, setPage] = useState(0);
  const roomsQuery = useRooms({ skip: page * PAGE_SIZE, limit: PAGE_SIZE });
  const rooms = roomsQuery.data?.items ?? [];
  const total = roomsQuery.data?.total ?? 0;

  const { success, error: errorToast } = useToast();
  const deleteRoom = useDeleteRoom();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);
  const [deleting, setDeleting] = useState<Room | null>(null);

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await deleteRoom.mutateAsync(deleting.id);
      success("Sala eliminada");
      setDeleting(null);
    } catch (error) {
      errorToast("No se pudo eliminar", errorMessage(error));
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Salas"
        description="Organizá el museo en salas y ubicá obras en cada una."
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus size={16} weight="bold" /> Nueva sala
          </Button>
        }
      />

      {roomsQuery.isPending ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <EmptyState
          icon={Door}
          title="Todavía no hay salas"
          description="Crea la primera sala para organizar el acervo."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus size={16} weight="bold" /> Nueva sala
            </Button>
          }
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead className="w-24">Planta</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="w-16 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rooms.map((room) => (
                <TableRow key={room.id}>
                  <TableCell className="font-bold text-bone-50">{room.name}</TableCell>
                  <TableCell>{room.floor}</TableCell>
                  <TableCell className="max-w-md truncate text-mute-400">
                    {room.description ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end">
                      <RowActions
                        onEdit={() => {
                          setEditing(room);
                          setDialogOpen(true);
                        }}
                        onDelete={() => setDeleting(room)}
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

      <RoomFormDialog open={dialogOpen} onOpenChange={setDialogOpen} room={editing} />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="¿Eliminar sala?"
        description={
          <>
            Vas a eliminar <strong className="text-bone-100">{deleting?.name}</strong>. Solo se
            puede eliminar una sala que no tenga obras asignadas. Esta acción no se puede
            deshacer.
          </>
        }
        confirmLabel="Eliminar"
        loading={deleteRoom.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
