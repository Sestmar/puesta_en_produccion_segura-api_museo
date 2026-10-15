import { ShieldSlash } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

function FullScreenLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center text-gold-500">
      <Spinner className="size-6" />
    </div>
  );
}

/** Exige sesión iniciada; si no, redirige a /login recordando el destino. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") return <FullScreenLoader />;
  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <>{children}</>;
}

/**
 * Exige un permiso de rol. Es solo UX: el backend vuelve a comprobar el rol en
 * cada petición, así que ocultar o mostrar rutas aquí no concede acceso real.
 */
function RequirePermission({
  allowed,
  description,
  inline = false,
  children,
}: {
  allowed: (auth: ReturnType<typeof useAuth>) => boolean;
  description: string;
  /** Dentro de un layout ya montado (sin ocupar toda la pantalla). */
  inline?: boolean;
  children: ReactNode;
}) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status === "loading") return <FullScreenLoader />;
  if (auth.status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  if (!allowed(auth)) {
    return (
      <div className={cn("flex items-center justify-center px-6", inline ? "py-16" : "min-h-dvh")}>
        <EmptyState icon={ShieldSlash} title="Acceso restringido" description={description} />
      </div>
    );
  }
  return <>{children}</>;
}

/** Exige rol de administrador o gestor (panel del catálogo). */
export function RequireStaff({ children }: { children: ReactNode }) {
  return (
    <RequirePermission
      allowed={(auth) => auth.canManageCatalog}
      description="Esta sección es para el personal del museo. Vuelve al catálogo público."
    >
      {children}
    </RequirePermission>
  );
}

/** Exige rol de administrador. */
export function RequireAdmin({ children, inline = false }: { children: ReactNode; inline?: boolean }) {
  return (
    <RequirePermission
      allowed={(auth) => auth.isAdmin}
      description="Esta sección requiere permisos de administrador."
      inline={inline}
    >
      {children}
    </RequirePermission>
  );
}
