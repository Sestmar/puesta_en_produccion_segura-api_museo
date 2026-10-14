import { DotsThreeVertical, PencilSimple, Trash } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface RowActionsProps {
  onEdit: () => void;
  onDelete: () => void;
}

/** Menú de acciones para una fila de tabla (editar / eliminar). */
export function RowActions({ onEdit, onDelete }: RowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Acciones de la fila">
          <DotsThreeVertical size={18} weight="bold" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onEdit()}>
          <PencilSimple size={16} weight="bold" /> Editar
        </DropdownMenuItem>
        <DropdownMenuItem destructive onSelect={() => onDelete()}>
          <Trash size={16} weight="bold" /> Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
