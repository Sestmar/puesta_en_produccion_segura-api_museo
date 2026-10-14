import { Link } from "react-router-dom";

import { Logo } from "@/components/common/Logo";
import { Separator } from "@/components/ui/separator";

const COLUMNS: { title: string; links: { label: string; to: string }[] }[] = [
  {
    title: "Explorar",
    links: [
      { label: "Obras", to: "/obras" },
      { label: "Artistas", to: "/artistas" },
      { label: "Salas", to: "/salas" },
    ],
  },
  {
    title: "Cuenta",
    links: [
      { label: "Ingresar", to: "/login" },
      { label: "Mi cuenta", to: "/cuenta" },
    ],
  },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-ink-700 bg-ink-900">
      <div className="container-page flex flex-col gap-12 py-14">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
          <div className="flex flex-col gap-4">
            <Logo />
            <p className="max-w-xs text-sm text-mute-400">
              Un catálogo vivo del museo: recorré las obras, conocé a los artistas y
              descubrí cómo se organiza la colección por salas.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.title} className="flex flex-col gap-3">
              <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-mute-500">
                {column.title}
              </h3>
              <ul className="flex flex-col gap-2">
                {column.links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-sm text-bone-200 transition-colors hover:text-gold-400"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <Separator />

        <div className="flex flex-col gap-3 text-xs text-mute-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Museo · Ejercicio académico de puesta en producción segura.</p>
          <p className="sm:text-right">
            Imágenes de referencia: Art Institute of Chicago, Open Access (dominio
            público).
          </p>
        </div>
      </div>
    </footer>
  );
}
