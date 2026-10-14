import { CaretLeft, CaretRight } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

/** Paginación simple con rango y controles anterior/siguiente. */
export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);

  return (
    <nav
      aria-label="Paginación"
      className="flex flex-col items-center justify-between gap-3 sm:flex-row"
    >
      <p className="text-xs text-mute-400">
        {total === 0
          ? "Sin resultados"
          : `${formatNumber(from)}–${formatNumber(to)} de ${formatNumber(total)}`}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 0}
          onClick={() => onPageChange(page - 1)}
        >
          <CaretLeft size={14} weight="bold" /> Anterior
        </Button>
        <span className="px-2 text-xs text-mute-400">
          {formatNumber(page + 1)} / {formatNumber(pageCount)}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={page + 1 >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          Siguiente <CaretRight size={14} weight="bold" />
        </Button>
      </div>
    </nav>
  );
}
