import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Lock, SignIn, User as UserIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";

import { errorMessage } from "@/components/common/QueryState";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { isApiError } from "@/lib/api/client";
import { imageForSeed } from "@/lib/images";

const schema = z.object({
  username: z.string().trim().min(3, "Ingresa al menos 3 caracteres"),
  password: z.string().min(8, "La contraseña tiene al menos 8 caracteres"),
});

type FormValues = z.infer<typeof schema>;

interface LocationState {
  from?: string;
}

export function LoginPage() {
  const { login, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);

  const from = (location.state as LocationState | null)?.from ?? "/";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: "", password: "" },
  });

  if (status === "authenticated") {
    return <Navigate to={from} replace />;
  }

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      await login(values.username, values.password);
      navigate(from, { replace: true });
    } catch (error) {
      if (isApiError(error) && error.status === 429) {
        setServerError("Demasiados intentos. Espera un momento e intenta de nuevo.");
      } else if (isApiError(error) && error.status === 401) {
        setServerError("Usuario o contraseña incorrectos.");
      } else {
        setServerError(errorMessage(error, "No se pudo iniciar sesión."));
      }
    }
  }

  return (
    <div className="grid min-h-[calc(100dvh-6rem)] lg:grid-cols-2">
      {/* Panel de marca */}
      <div className="relative hidden overflow-hidden lg:block">
        <img
          src={imageForSeed("museo-login", 1400)}
          alt=""
          className="size-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-t from-ink-950 via-ink-950/60 to-ink-950/20" />
        <div className="absolute inset-0 flex flex-col justify-end gap-5 p-12">
          <span className="w-fit rounded-pill bg-gold-500 px-3 py-1 font-display text-[10px] font-bold uppercase tracking-[0.2em] text-ink-950">
            Acceso
          </span>
          <blockquote className="max-w-md text-3xl font-black uppercase leading-tight tracking-tight text-bone-50">
            El acervo, bajo control.
          </blockquote>
          <p className="max-w-md text-sm text-bone-300">
            Inicia sesión para administrar obras, artistas y salas, y para consultar el
            registro de auditoría del sistema.
          </p>
        </div>
      </div>

      {/* Formulario */}
      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-display text-[11px] font-bold uppercase tracking-[0.16em] text-mute-400 transition-colors hover:text-gold-400"
          >
            <ArrowLeft size={14} weight="bold" /> Volver al sitio
          </Link>

          <h1 className="mt-8 text-3xl font-black uppercase tracking-tight text-bone-50">
            Iniciar sesión
          </h1>
          <p className="mt-2 text-sm text-mute-400">
            Usa tus credenciales del museo para acceder al panel.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 flex flex-col gap-5" noValidate>
            <Field
              label="Usuario"
              htmlFor="username"
              required
              error={errors.username?.message}
            >
              <div className="relative">
                <UserIcon
                  size={18}
                  weight="bold"
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mute-500"
                />
                <Input
                  id="username"
                  autoComplete="username"
                  autoFocus
                  placeholder="tu.usuario"
                  className="pl-11"
                  aria-invalid={Boolean(errors.username)}
                  {...register("username")}
                />
              </div>
            </Field>

            <Field
              label="Contraseña"
              htmlFor="password"
              required
              error={errors.password?.message}
            >
              <div className="relative">
                <Lock
                  size={18}
                  weight="bold"
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mute-500"
                />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pl-11"
                  aria-invalid={Boolean(errors.password)}
                  {...register("password")}
                />
              </div>
            </Field>

            {serverError ? (
              <p
                role="alert"
                className="rounded-control border border-danger-500/30 bg-danger-500/10 px-4 py-3 text-sm text-danger-400"
              >
                {serverError}
              </p>
            ) : null}

            <Button type="submit" size="lg" loading={isSubmitting} className="mt-2 w-full">
              <SignIn size={16} weight="bold" /> Entrar
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
