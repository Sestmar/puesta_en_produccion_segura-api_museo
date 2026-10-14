import { zodResolver } from "@hookform/resolvers/zod";
import { PencilSimple, Plus, Users as UsersIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { PageHeader } from "@/components/common/PageHeader";
import { errorMessage } from "@/components/common/QueryState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/toast";
import { useCreateUser, useUpdateUser } from "@/hooks/mutations";
import { useAuth } from "@/hooks/useAuth";
import { useUsers } from "@/hooks/queries";
import type { Role, User } from "@/lib/api/types";

const PAGE_SIZE = 20;

const createSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Mínimo 3 caracteres")
    .max(50, "Máximo 50 caracteres")
    .regex(/^[a-zA-Z0-9_.-]+$/, "Solo letras, números, punto, guion y guion bajo"),
  password: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .max(72, "Máximo 72 caracteres")
    .regex(/[A-Za-z]/, "Debe incluir al menos una letra")
    .regex(/\d/, "Debe incluir al menos un número"),
  role: z.enum(["admin", "viewer"]),
});

type CreateForm = z.infer<typeof createSchema>;

const editSchema = z.object({
  role: z.enum(["admin", "viewer"]),
  is_active: z.boolean(),
});

type EditForm = z.infer<typeof editSchema>;

function RoleBadge({ role }: { role: Role }) {
  return role === "admin" ? (
    <Badge variant="gold">Administrador</Badge>
  ) : (
    <Badge variant="neutral">Lector</Badge>
  );
}

function CreateUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { success, error: errorToast } = useToast();
  const createUser = useCreateUser();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { username: "", password: "", role: "viewer" },
  });

  useEffect(() => {
    if (open) reset({ username: "", password: "", role: "viewer" });
  }, [open, reset]);

  async function onSubmit(values: CreateForm) {
    try {
      await createUser.mutateAsync({
        username: values.username.trim(),
        password: values.password,
        role: values.role,
      });
      success("Usuario creado");
      onOpenChange(false);
    } catch (error) {
      errorToast("No se pudo crear el usuario", errorMessage(error));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogHeader>
            <DialogTitle>Nuevo usuario</DialogTitle>
            <DialogDescription>Crea una cuenta para el personal del museo.</DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-5 py-4">
            <Field label="Usuario" htmlFor="user-username" required error={errors.username?.message}>
              <Input id="user-username" autoFocus autoComplete="off" {...register("username")} />
            </Field>
            <Field
              label="Contraseña"
              htmlFor="user-password"
              required
              error={errors.password?.message}
              hint="Mínimo 8 caracteres, con al menos una letra y un número."
            >
              <Input
                id="user-password"
                type="password"
                autoComplete="new-password"
                {...register("password")}
              />
            </Field>
            <Field label="Rol" error={errors.role?.message}>
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Lector</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={createUser.isPending}>
              Crear usuario
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
}) {
  const { success, error: errorToast } = useToast();
  const updateUser = useUpdateUser();

  const {
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: { role: "viewer", is_active: true },
  });

  useEffect(() => {
    if (!open || !user) return;
    reset({ role: user.role, is_active: user.is_active });
  }, [open, user, reset]);

  async function onSubmit(values: EditForm) {
    if (!user) return;
    try {
      await updateUser.mutateAsync({ id: user.id, payload: values });
      success("Usuario actualizado");
      onOpenChange(false);
    } catch (error) {
      errorToast("No se pudo actualizar", errorMessage(error));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
            <DialogDescription>
              Ajustá el rol y el estado de{" "}
              <span className="text-bone-100">{user?.username}</span>.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-6 py-4">
            <Field label="Rol" error={errors.role?.message}>
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Lector</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Controller
              control={control}
              name="is_active"
              render={({ field }) => (
                <label className="flex cursor-pointer items-center justify-between gap-4 rounded-control border border-ink-700 bg-ink-850 p-4">
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold text-bone-100">Cuenta activa</span>
                    <span className="text-xs text-mute-400">
                      Al desactivarla se cierran todas sus sesiones.
                    </span>
                  </span>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </label>
              )}
            />
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={updateUser.isPending}>
              Guardar cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [page, setPage] = useState(0);
  const usersQuery = useUsers({ skip: page * PAGE_SIZE, limit: PAGE_SIZE });
  const users = usersQuery.data?.items ?? [];
  const total = usersQuery.data?.total ?? 0;

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Usuarios"
        description="Gestioná quién puede acceder y con qué permisos."
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={16} weight="bold" /> Nuevo usuario
          </Button>
        }
      />

      {usersQuery.isPending ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <EmptyState icon={UsersIcon} title="Sin usuarios" description="No hay usuarios cargados." />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-16 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const isSelf = user.id === currentUser?.id;
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-bold text-bone-50">
                      <span className="flex items-center gap-2">
                        {user.username}
                        {isSelf ? (
                          <Badge variant="outline" className="tracking-normal">
                            Vos
                          </Badge>
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={user.role} />
                    </TableCell>
                    <TableCell>
                      {user.is_active ? (
                        <Badge variant="success">Activo</Badge>
                      ) : (
                        <Badge variant="danger">Inactivo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        {isSelf ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button variant="ghost" size="icon" disabled aria-label="Editar">
                                  <PencilSimple size={16} weight="bold" />
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              No podés cambiar tu propio rol ni estado.
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Editar ${user.username}`}
                            onClick={() => setEditing(user)}
                          >
                            <PencilSimple size={16} weight="bold" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </>
      )}

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EditUserDialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        user={editing}
      />
    </div>
  );
}
