import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

/** Bloque de formulario: label arriba, control, ayuda o error abajo. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required ? <span className="text-gold-500"> *</span> : null}
      </Label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-danger-400">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-mute-400">{hint}</p>
      ) : null}
    </div>
  );
}
