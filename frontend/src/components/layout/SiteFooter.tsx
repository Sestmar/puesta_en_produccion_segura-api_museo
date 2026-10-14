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
      { label: "Panel admin", to: "/admin" },
    ],
  },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-ink-700 bg-ink-900">
      {/* Marquesina dorada */}
      <div className="overflow-hidden border-b border-ink-700 bg-gold-500 py-3">
        <div className="flex w-max animate-marquee pause-on-hover items-center">
          {[0, 1].map((copy) => (
            <ul
              key={copy}
              aria-hidden={copy === 1}
              className="flex items-center gap-12 pr-12"
            >
              {["MUSEO", "ARTE", "CULTURA", "HISTORIA", "COLECCIÓN"].map((word) => (
                <li
                  key={word}
                  className="flex items-center gap-12 whitespace-nowrap font-display text-lg font-black uppercase tracking-[0.18em] text-ink-950"
                >
                  {word}
                  <span aria-hidden className="inline-block size-2 rotate-45 bg-ink-950" />
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>

      <div className="container-page flex flex-col gap-14 py-16">
        <div className="grid gap-12 md:grid-cols-[1.5fr_1fr_1fr]">
          <div className="flex flex-col gap-5">
            <Logo />
            <p className="max-w-xs text-sm leading-relaxed text-mute-500">
              Un catálogo vivo del museo: recorré las obras, conocé a los artistas y
              descubrí cómo se organiza la colección por salas.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.title} className="flex flex-col gap-4">
              <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-bone-50">
                {column.title}
              </h3>
              <ul className="flex flex-col gap-3">
                {column.links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-sm text-mute-500 transition-colors duration-300 hover:text-gold-400"
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

        <div className="flex flex-col gap-3 text-xs text-mute-600 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Museo · Ejercicio académico de puesta en producción segura.</p>
          <p className="sm:text-right">
            Imágenes de referencia: Art Institute of Chicago, Open Access (dominio público).
          </p>
        </div>
      </div>
    </footer>
  );
}
