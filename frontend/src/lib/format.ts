import type { Role } from "@/lib/api/types";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  manager: "Gestor",
  client: "Cliente",
};

const dateTimeFormatter = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "medium",
  timeStyle: "short",
});

const dateFormatter = new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" });

const numberFormatter = new Intl.NumberFormat("es-ES");

/** Formatea una fecha ISO como fecha y hora; "—" si falta o es inválida. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormatter.format(date);
}

/** Formatea una fecha ISO como fecha; "—" si falta o es inválida. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

/** Rango vital de un artista: "1907 – 1954", "1907 – " o "—". */
export function formatLifespan(
  birth: number | null | undefined,
  death: number | null | undefined,
): string {
  if (birth == null && death == null) return "—";
  const from = birth == null ? "?" : String(birth);
  const to = death == null ? "" : String(death);
  return `${from} – ${to}`.trim();
}

/** "1800" / "-300" → "1800" / "300 a. C." */
export function formatYear(year: number | null | undefined): string {
  if (year == null) return "—";
  return year < 0 ? `${Math.abs(year)} a. C.` : String(year);
}

/** Convierte un action de auditoría ("auth.login.success") en texto legible. */
export function humanizeAction(action: string): string {
  return action
    .replaceAll(".", " ")
    .replaceAll("_", " ")
    .replace(/(^|\s)\w/g, (c) => c.toUpperCase());
}
