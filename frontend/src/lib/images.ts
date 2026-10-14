import { SOURCE_WORKS, type SourceWork } from "@/data/works";
import type { Artist, Artwork, Room } from "@/lib/api/types";

/**
 * Banco de imágenes del catálogo.
 *
 * Las obras del museo se asocian a imágenes reales de dominio público del Art
 * Institute of Chicago de forma **determinista**:
 *   1. Si el título de la obra coincide con una obra fuente → usa esa imagen.
 *   2. Si no (datos propios del museo) → elige una imagen estable por hash del
 *      título, de modo que la misma obra siempre muestra la misma imagen.
 *
 * Para cambiarlas por fotos propias: reemplazar `SOURCE_WORKS` por tu propio
 * conjunto (ver scripts/fetch-works.mjs).
 */

const IIIF = "https://www.artic.edu/iiif/2";

const FALLBACK_IMAGE_ID = "2d484387-2509-5e8e-2c43-22f9981972eb"; // A Sunday on La Grande Jatte

function normalizeTitle(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim();
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

const byTitle = new Map<string, SourceWork>();
for (const work of SOURCE_WORKS) {
  const key = normalizeTitle(work.title);
  if (!byTitle.has(key)) byTitle.set(key, work);
}

function sourceWorkFor(seed: string): SourceWork | undefined {
  const exact = byTitle.get(normalizeTitle(seed));
  if (exact) return exact;
  if (SOURCE_WORKS.length === 0) return undefined;
  return SOURCE_WORKS[hashString(seed) % SOURCE_WORKS.length];
}

/** URL de imagen IIIF, limitada por ancho (el recorte lo hace object-cover). */
export function iiifUrl(imageId: string, width: number): string {
  return `${IIIF}/${imageId}/full/${width},/0/default.jpg`;
}

/** Imagen de una obra a partir de su título (determinista). */
export function imageForArtwork(artwork: Pick<Artwork, "title">, width = 1200): string {
  const work = sourceWorkFor(artwork.title);
  return iiifUrl(work?.imageId ?? FALLBACK_IMAGE_ID, width);
}

/** Imagen para un artista (retrato/obra representativa). */
export function imageForArtist(artist: Pick<Artist, "id" | "name">, width = 800): string {
  const work = sourceWorkFor(`artist:${artist.id}:${artist.name}`);
  return iiifUrl(work?.imageId ?? FALLBACK_IMAGE_ID, width);
}

/** Imagen para una sala. */
export function imageForRoom(room: Pick<Room, "id" | "name">, width = 1200): string {
  const work = sourceWorkFor(`room:${room.id}:${room.name}`);
  return iiifUrl(work?.imageId ?? FALLBACK_IMAGE_ID, width);
}

/** Imagen directa por seed libre. */
export function imageForSeed(seed: string, width = 1200): string {
  const work = sourceWorkFor(seed);
  return iiifUrl(work?.imageId ?? FALLBACK_IMAGE_ID, width);
}

/** Metadatos de la obra fuente (para créditos), si coincide por título. */
export function sourceWorkByTitle(title: string): SourceWork | undefined {
  return byTitle.get(normalizeTitle(title));
}

/** Títulos destacados para el hero (deben existir en SOURCE_WORKS). */
export const FEATURED_TITLES: readonly string[] = [
  "Nighthawks",
  "A Sunday on La Grande Jatte — 1884",
  "Water Lilies",
  "American Gothic",
  "Sky above Clouds IV",
  "Paris Street; Rainy Day",
];
