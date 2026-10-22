import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Lock, SignIn, User as UserIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";

import { errorMessage } from "@/components/common/QueryState";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { isApiError } from "@/lib/api/client";
import { GOOGLE_LOGIN_URL } from "@/lib/env";
import { imageForSeed } from "@/lib/images";

const schema = z.object({
  username: z.string().trim().min(3, "Ingresa al menos 3 caracteres"),
  password: z.string().min(8, "La contraseña tiene al menos 8 caracteres"),
});

type FormValues = z.infer<typeof schema>;

interface LocationState {
  from?: string;
  /** Usuario recién registrado cuyo login automático no se pudo completar. */
  registered?: string;
}

export function LoginPage() {
  const { login, completeOAuth, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const handledOAuth = useRef(false);

  const state = location.state as LocationState | null;
  const from = state?.from ?? "/";
  const registered = state?.registered;
  const oauth = searchParams.get("oauth");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: registered ?? "", password: "" },
  });

  // Vuelta del callback de Google: el backend ya puso la cookie httpOnly.
  useEffect(() => {
    if (oauth !== "success" || handledOAuth.current) return;
    handledOAuth.current = true;
    completeOAuth()
      .then(() => navigate(from, { replace: true }))
      .catch(() => setServerError("No se pudo completar el inicio de sesión con Google."));
    // Quita el parámetro para que un recargado no repita el intento.
    searchParams.delete("oauth");
    setSearchParams(searchParams, { replace: true });
  }, [oauth, completeOAuth, from, navigate, searchParams, setSearchParams]);

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
            Inicia sesión para guardar tus obras favoritas o, si formas parte del
            equipo del museo, para gestionar el catálogo.
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
            Accede con tu usuario y contraseña.
          </p>

          {registered ? (
            <p
              role="status"
              className="mt-6 rounded-control border border-gold-500/30 bg-gold-500/10 px-4 py-3 text-sm text-gold-300"
            >
              Cuenta creada. Inicia sesión para continuar.
            </p>
          ) : null}

          {oauth === "error" ? (
            <p
              role="alert"
              className="mt-6 rounded-control border border-danger-500/30 bg-danger-500/10 px-4 py-3 text-sm text-danger-400"
            >
              No se pudo iniciar sesión con Google. Intenta de nuevo.
            </p>
          ) : null}

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

          <div className="mt-6 flex items-center gap-4" aria-hidden="true">
            <span className="h-px flex-1 bg-white/10" />
            <span className="font-display text-[11px] font-bold uppercase tracking-[0.16em] text-mute-500">
              o
            </span>
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <a href={GOOGLE_LOGIN_URL} className="mt-6 block">
            <Button type="button" variant="secondary" size="lg" className="w-full">
              <GoogleIcon /> Continuar con Google
            </Button>
          </a>

          <p className="mt-6 text-center text-sm text-mute-400">
            ¿No tienes cuenta?{" "}
            <Link
              to="/registro"
              state={{ from }}
              className="font-bold text-gold-400 transition-colors hover:text-gold-300"
            >
              Regístrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

/** Logotipo oficial multicolor de Google (Google Sign-In branding). */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.98 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.02-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.02 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
