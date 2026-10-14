import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { isApiError } from "@/lib/api/client";

interface ErrorPanelProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorPanel({
  title = "No se pudo cargar la información",
  description,
  onRetry,
}: ErrorPanelProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-card border border-danger-500/30 bg-danger-500/5 px-6 py-14 text-center">
      <div className="flex flex-col gap-1.5">
        <h3 className="text-lg font-bold text-bone-50">{title}</h3>
        <p className="mx-auto max-w-md text-sm text-mute-400">
          {description ?? "Revisa la conexión con la API e intenta nuevamente."}
        </p>
      </div>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Reintentar
        </Button>
      ) : null}
    </div>
  );
}

/** Traduce un error de la API a un mensaje legible. */
export function errorMessage(error: unknown, fallback = "Ocurrió un error inesperado."): string {
  if (isApiError(error)) return error.detail || fallback;
  if (error instanceof Error) return error.message;
  return fallback;
}

/** Muestra un toast de error a partir de un error de mutación. */
export function useErrorToast() {
  const { error: errorToast } = useToast();
  return (error: unknown, title = "Error") => {
    errorToast(title, errorMessage(error));
  };
}

interface QueryStateProps<T> {
  query: {
    isPending: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => void;
    data: T | undefined;
  };
  skeleton?: ReactNode;
  children: (data: T) => ReactNode;
}

/** Renderiza skeleton, error o contenido según el estado de una query. */
export function QueryState<T>({ query, skeleton, children }: QueryStateProps<T>) {
  if (query.isPending) {
    return <>{skeleton ?? <Skeleton className="h-64 w-full" />}</>;
  }
  if (query.isError || query.data === undefined) {
    return <ErrorPanel description={errorMessage(query.error)} onRetry={() => query.refetch()} />;
  }
  return <>{children(query.data)}</>;
}
