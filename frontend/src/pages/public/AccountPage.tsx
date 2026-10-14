import { zodResolver } from "@hookform/resolvers/zod";
import {
  DeviceMobile,
  Key,
  ShieldCheck,
  SignOut,
  Trash,
  User as UserIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import { PageHeader } from "@/components/common/PageHeader";
import { errorMessage } from "@/components/common/QueryState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/hooks/useAuth";
import { useChangePassword, useCloseAllSessions, useRevokeSession } from "@/hooks/mutations";
import { useSessions } from "@/hooks/queries";
import { formatDateTime } from "@/lib/format";

const passwordSchema = z
  .object({
    current_password: z.string().min(1, "Ingresa tu contraseña actual"),
    new_password: z
      .string()
      .min(8, "Debe tener al menos 8 caracteres")
      .regex(/[A-Za-z]/, "Debe incluir al menos una letra")
      .regex(/\d/, "Debe incluir al menos un número"),
    confirm: z.string(),
  })
  .refine((values) => values.new_password === values.confirm, {
    path: ["confirm"],
    message: "Las contraseñas no coinciden",
  })
  .refine((values) => values.new_password !== values.current_password, {
    path: ["new_password"],
    message: "La nueva contraseña debe ser distinta a la actual",
  });

type PasswordForm = z.infer<typeof passwordSchema>;

function PasswordCard() {
  const { success } = useToast();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const changePassword = useChangePassword();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current_password: "", new_password: "", confirm: "" },
  });

  async function onSubmit(values: PasswordForm) {
    setServerError(null);
    try {
      await changePassword.mutateAsync({
        current_password: values.current_password,
        new_password: values.new_password,
      });
      reset();
      success(
        "Contraseña actualizada",
        "Por seguridad, cerramos todas tus sesiones. Vuelve a ingresar.",
      );
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      setServerError(errorMessage(error, "No se pudo cambiar la contraseña."));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key size={18} weight="bold" className="text-gold-500" /> Cambiar contraseña
        </CardTitle>
        <CardDescription>
          Al cambiarla se cerrarán todas tus sesiones activas por seguridad.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
          <Field
            label="Contraseña actual"
            htmlFor="current_password"
            required
            error={errors.current_password?.message}
          >
            <Input
              id="current_password"
              type="password"
              autoComplete="current-password"
              {...register("current_password")}
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Nueva contraseña"
              htmlFor="new_password"
              required
              error={errors.new_password?.message}
              hint="Mínimo 8 caracteres, con al menos una letra y un número."
            >
              <Input
                id="new_password"
                type="password"
                autoComplete="new-password"
                {...register("new_password")}
              />
            </Field>
            <Field
              label="Repetir contraseña"
              htmlFor="confirm"
              required
              error={errors.confirm?.message}
            >
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                {...register("confirm")}
              />
            </Field>
          </div>

          {serverError ? (
            <p role="alert" className="text-sm text-danger-400">
              {serverError}
            </p>
          ) : null}

          <div className="flex justify-end">
            <Button type="submit" loading={isSubmitting || changePassword.isPending}>
              Actualizar contraseña
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function SessionsCard() {
  const sessionsQuery = useSessions();
  const revokeSession = useRevokeSession();
  const closeAll = useCloseAllSessions();
  const { success, error: errorToast } = useToast();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [confirmCloseAll, setConfirmCloseAll] = useState(false);

  const sessions = sessionsQuery.data ?? [];

  async function handleRevoke(id: number) {
    try {
      await revokeSession.mutateAsync(id);
      success("Sesión cerrada");
    } catch (error) {
      errorToast("No se pudo cerrar la sesión", errorMessage(error));
    }
  }

  async function handleCloseAll() {
    try {
      await closeAll.mutateAsync();
      setConfirmCloseAll(false);
      success("Cerramos todas tus sesiones");
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      errorToast("No se pudieron cerrar las sesiones", errorMessage(error));
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck size={18} weight="bold" className="text-gold-500" /> Sesiones activas
          </CardTitle>
          <CardDescription>
            Dispositivos con acceso vigente a tu cuenta.
          </CardDescription>
        </div>
        {sessions.length > 1 ? (
          <Button variant="secondary" size="sm" onClick={() => setConfirmCloseAll(true)}>
            Cerrar todas
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {sessionsQuery.isPending ? (
          <>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </>
        ) : sessions.length === 0 ? (
          <EmptyState
            icon={DeviceMobile}
            title="Sin sesiones activas"
            description="No hay dispositivos con acceso vigente."
            className="py-10"
          />
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-start justify-between gap-4 rounded-control border border-ink-700 bg-ink-850 p-4"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-mute-400">
                  <DeviceMobile size={20} weight="duotone" />
                </span>
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-bold text-bone-100">
                    {session.user_agent ?? "Dispositivo desconocido"}
                  </p>
                  <p className="text-xs text-mute-400">
                    IP {session.ip_address ?? "—"} · Inicio {formatDateTime(session.created_at)}
                  </p>
                  <p className="text-xs text-mute-500">
                    Vence {formatDateTime(session.expires_at)}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Cerrar esta sesión"
                loading={revokeSession.isPending && revokeSession.variables === session.id}
                onClick={() => handleRevoke(session.id)}
              >
                <Trash size={16} weight="bold" />
              </Button>
            </div>
          ))
        )}
      </CardContent>

      <ConfirmDialog
        open={confirmCloseAll}
        onOpenChange={setConfirmCloseAll}
        title="¿Cerrar todas las sesiones?"
        description="Se cerrará tu sesión en todos los dispositivos, incluido este. Vas a tener que volver a ingresar."
        confirmLabel="Cerrar todas"
        loading={closeAll.isPending}
        onConfirm={handleCloseAll}
      />
    </Card>
  );
}

export function AccountPage() {
  const { user } = useAuth();

  return (
    <div className="container-page py-12 lg:py-16">
      <PageHeader
        title="Mi cuenta"
        description="Gestioná tu perfil, tu contraseña y las sesiones activas de tu cuenta."
      />

      <div className="mt-10 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex flex-col gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon size={18} weight="bold" className="text-gold-500" /> Perfil
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="flex size-12 items-center justify-center rounded-pill bg-ink-750 font-display text-lg font-bold text-gold-400">
                  {(user?.username ?? "?").slice(0, 2).toUpperCase()}
                </span>
                <div className="flex flex-col gap-1">
                  <p className="font-display text-lg font-bold text-bone-50">
                    {user?.username ?? "—"}
                  </p>
                  <Badge variant={user?.role === "admin" ? "gold" : "neutral"}>
                    {user?.role === "admin" ? "Administrador" : "Lector"}
                  </Badge>
                </div>
              </div>
              <p className="flex items-center gap-2 text-xs text-mute-400">
                <SignOut size={14} weight="bold" />
                {user?.is_active ? "Cuenta activa" : "Cuenta desactivada"}
              </p>
            </CardContent>
          </Card>

          <PasswordCard />
        </div>

        <SessionsCard />
      </div>
    </div>
  );
}
