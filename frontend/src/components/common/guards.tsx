import { ShieldSlash } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/hooks/useAuth";

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

/** Exige rol de administrador. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { status, isAdmin } = useAuth();
  const location = useLocation();

  if (status === "loading") return <FullScreenLoader />;
  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  if (!isAdmin) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6">
        <EmptyState
          icon={ShieldSlash}
          title="Acceso restringido"
          description="Esta sección requiere permisos de administrador. Volvé al catálogo público."
        />
      </div>
    );
  }
  return <>{children}</>;
}
