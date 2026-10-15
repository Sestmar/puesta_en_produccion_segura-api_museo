import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Lock, User as UserIcon, UserPlus } from "@phosphor-icons/react";
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
import { authApi } from "@/lib/api/endpoints";
import { imageForSeed } from "@/lib/images";
import { PASSWORD_HINT, USERNAME_HINT, passwordSchema, usernameSchema } from "@/lib/validation";

const schema = z
  .object({
    username: usernameSchema,
    password: passwordSchema,
    confirm: z.string().min(1, "Repite la contraseña"),
  })
  .refine((values) => values.password === values.confirm, {
    path: ["confirm"],
    message: "Las contraseñas no coinciden",
  });

type FormValues = z.infer<typeof schema>;

interface LocationState {
  from?: string;
}

function signupErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    if (error.status === 409) return "Ese nombre de usuario ya está en uso. Prueba con otro.";
    if (error.status === 429) return "Demasiados registros desde tu red. Inténtalo más tarde.";
    if (error.status === 503) return "El registro aún no está disponible. Inténtalo más tarde.";
  }
  return errorMessage(error, "No se pudo crear la cuenta.");
}

export function RegisterPage() {
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
    defaultValues: { username: "", password: "", confirm: "" },
  });

  if (status === "authenticated") {
    return <Navigate to={from} replace />;
  }

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const username = values.username.trim();
    try {
      await authApi.signup({ username, password: values.password });
    } catch (error) {
      setServerError(signupErrorMessage(error));
      return;
    }
    try {
      await login(username, values.password);
      navigate(from, { replace: true });
    } catch {
      // La cuenta existe aunque el login automático falle (p. ej. límite de tasa).
      navigate("/login", { replace: true, state: { from, registered: username } });
    }
  }

  return (
    <div className="grid min-h-[calc(100dvh-6rem)] lg:grid-cols-2">
      {/* Panel de marca */}
      <div className="relative hidden overflow-hidden lg:block">
        <img
          src={imageForSeed("museo-registro", 1400)}
          alt=""
          className="size-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-t from-ink-950 via-ink-950/60 to-ink-950/20" />
        <div className="absolute inset-0 flex flex-col justify-end gap-5 p-12">
          <span className="w-fit rounded-pill bg-gold-500 px-3 py-1 font-display text-[10px] font-bold uppercase tracking-[0.2em] text-ink-950">
            Registro
          </span>
          <blockquote className="max-w-md text-3xl font-black uppercase leading-tight tracking-tight text-bone-50">
            Tu propia colección.
          </blockquote>
          <p className="max-w-md text-sm text-bone-300">
            Crea una cuenta gratuita para guardar tus obras favoritas y volver a ellas
            cuando quieras.
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
            Crear cuenta
          </h1>
          <p className="mt-2 text-sm text-mute-400">
            Regístrate como visitante para guardar obras en tu colección.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 flex flex-col gap-5" noValidate>
            <Field
              label="Usuario"
              htmlFor="signup-username"
              required
              error={errors.username?.message}
              hint={USERNAME_HINT}
            >
              <div className="relative">
                <UserIcon
                  size={18}
                  weight="bold"
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mute-500"
                />
                <Input
                  id="signup-username"
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
              htmlFor="signup-password"
              required
              error={errors.password?.message}
              hint={PASSWORD_HINT}
            >
              <div className="relative">
                <Lock
                  size={18}
                  weight="bold"
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mute-500"
                />
                <Input
                  id="signup-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="pl-11"
                  aria-invalid={Boolean(errors.password)}
                  {...register("password")}
                />
              </div>
            </Field>

            <Field
              label="Repite la contraseña"
              htmlFor="signup-confirm"
              required
              error={errors.confirm?.message}
            >
              <div className="relative">
                <Lock
                  size={18}
                  weight="bold"
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mute-500"
                />
                <Input
                  id="signup-confirm"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="pl-11"
                  aria-invalid={Boolean(errors.confirm)}
                  {...register("confirm")}
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
              <UserPlus size={16} weight="bold" /> Crear cuenta
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-mute-400">
            ¿Ya tienes cuenta?{" "}
            <Link
              to="/login"
              state={{ from }}
              className="font-bold text-gold-400 transition-colors hover:text-gold-300"
            >
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
