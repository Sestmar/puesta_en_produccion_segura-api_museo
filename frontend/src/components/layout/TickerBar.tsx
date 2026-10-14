const CLAIMS: readonly string[] = [
  "ENVÍO GRATIS A PARTIR DE 50€",
  "DISEÑO EXCLUSIVO",
  "VENTAS A ESPAÑA Y PORTUGAL",
  "PAGO SEGURO",
  "CATÁLOGO DIGITAL DEL MUSEO",
  "OBRAS DE DOMINIO PÚBLICO",
];

/** Barra de anuncios con marquesina infinita estilo ED SportLine. */
export function TickerBar() {
  return (
    <div className="overflow-hidden border-b border-ink-700 bg-ink-900 py-2.5">
      <div className="flex w-max animate-marquee pause-on-hover items-center">
        {[0, 1].map((copy) => (
          <ul
            key={copy}
            aria-hidden={copy === 1}
            className="flex items-center gap-10 pr-10"
          >
            {CLAIMS.map((claim) => (
              <li
                key={claim}
                className="flex items-center gap-10 whitespace-nowrap font-display text-[10px] font-bold uppercase tracking-[0.22em] text-bone-50/70"
              >
                {claim}
                <span aria-hidden className="inline-block size-1 rotate-45 bg-gold-500" />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
