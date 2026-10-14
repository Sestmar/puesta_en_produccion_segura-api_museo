const CLAIMS: readonly string[] = [
  "Catálogo digital del museo",
  "Obras, artistas y salas",
  "Acceso libre a la colección",
  "Gestión segura del acervo",
  "Auditoría verificable",
];

/** Barra de anuncios con marquesina (cinta dorada, se pausa al interactuar). */
export function TickerBar() {
  return (
    <div className="overflow-hidden border-b border-gold-600/40 bg-gold-500 text-ink-950">
      <div className="flex w-max animate-marquee pause-on-hover items-center py-2">
        {[0, 1].map((copy) => (
          <ul
            key={copy}
            aria-hidden={copy === 1}
            className="flex items-center gap-8 pr-8"
          >
            {CLAIMS.map((claim) => (
              <li
                key={claim}
                className="flex items-center gap-8 whitespace-nowrap font-display text-[11px] font-bold uppercase tracking-[0.18em]"
              >
                {claim}
                <span aria-hidden className="inline-block size-1.5 rotate-45 bg-ink-950/70" />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
