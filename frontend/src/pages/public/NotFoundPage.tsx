import { ArrowLeft } from "@phosphor-icons/react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="container-page flex min-h-[60dvh] flex-col items-center justify-center gap-6 text-center">
      <p className="font-display text-[11px] font-bold uppercase tracking-[0.3em] text-gold-500">
        Error 404
      </p>
      <h1 className="text-5xl font-black uppercase tracking-tight text-bone-50 sm:text-7xl">
        Página no encontrada
      </h1>
      <p className="max-w-md text-sm text-mute-400">
        La dirección a la que quieres acceder no existe o fue movida. Vuelve al catálogo del
        museo.
      </p>
      <Button asChild size="lg">
        <Link to="/">
          <ArrowLeft size={16} weight="bold" /> Volver al inicio
        </Link>
      </Button>
    </div>
  );
}
