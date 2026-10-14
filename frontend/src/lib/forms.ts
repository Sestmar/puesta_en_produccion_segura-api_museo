import { z } from "zod";

/** Convierte el texto de un input numérico opcional a número o null. */
export function nullableInt(value: string): number | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : Number(trimmed);
}

/** Convierte el texto de un input opcional a texto recortado o null. */
export function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** Campo de año opcional (se maneja como texto en el formulario). */
export function optionalYearField(min: number, max: number) {
  return z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" ||
        (/^-?\d+$/.test(value) && Number(value) >= min && Number(value) <= max),
      `Ingresa un año válido entre ${min} y ${max}`,
    );
}

/** Campo numérico requerido (se maneja como texto en el formulario). */
export function requiredIntField(min: number, max: number, message: string) {
  return z
    .string()
    .trim()
    .refine(
      (value) => /^-?\d+$/.test(value) && Number(value) >= min && Number(value) <= max,
      message,
    );
}
