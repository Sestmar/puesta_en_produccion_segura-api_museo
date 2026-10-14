/**
 * Genera src/data/works.ts con obras de dominio público del Art Institute of
 * Chicago (API abierta, sin clave). Se usa como banco de imágenes reales para
 * el catálogo. Volver a ejecutar con:  node scripts/fetch-works.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";

const AIC_SEARCH = "https://api.artic.edu/api/v1/artworks/search";
const FIELDS =
  "id,title,image_id,artist_display,date_display,department_title,medium_display,place_of_origin";

const QUERIES = [
  "painting",
  "sculpture",
  "landscape",
  "portrait",
  "still life",
  "photograph",
  "impressionism",
  "abstract",
  "modern",
  "print",
  "drawing",
  "seascape",
];

async function getJSON(url) {
  const response = await fetch(url, {
    headers: { "AIC-User-Agent": "museo-frontend-clase (uso educativo)" },
  });
  if (!response.ok) throw new Error(`${url} -> ${response.status}`);
  return response.json();
}

const seen = new Set();
const works = [];

for (const query of QUERIES) {
  const url = `${AIC_SEARCH}?q=${encodeURIComponent(query)}&fields=${FIELDS}&limit=8`;
  let payload;
  try {
    payload = await getJSON(url);
  } catch (error) {
    console.warn(`Se omite "${query}": ${error.message}`);
    continue;
  }
  for (const item of payload.data ?? []) {
    if (!item.image_id || seen.has(item.id)) continue;
    seen.add(item.id);
    works.push({
      id: item.id,
      title: item.title,
      artist: item.artist_display ?? "",
      date: item.date_display ?? "",
      department: item.department_title ?? "",
      medium: item.medium_display ?? "",
      origin: item.place_of_origin ?? "",
      imageId: item.image_id,
    });
  }
}

const file = `// GENERADO AUTOMÁTICAMENTE por scripts/fetch-works.mjs — no editar a mano.
// Fuente: Art Institute of Chicago, Open Access API (obras de dominio público).
// https://api.artic.edu/docs/
//
// Banco de imágenes del catálogo. Cada entrada se asocia de forma
// determinista a las obras del museo (ver src/lib/images.ts).

export interface SourceWork {
  /** Identificador de la obra en el Art Institute of Chicago. */
  id: number;
  title: string;
  artist: string;
  date: string;
  department: string;
  medium: string;
  origin: string;
  /** ID IIIF para construir la URL de la imagen. */
  imageId: string;
}

export const SOURCE_WORKS: readonly SourceWork[] = ${JSON.stringify(works, null, 2)} as const;
`;

const target = new URL("../src/data/works.ts", import.meta.url);
await mkdir(new URL("../src/data", import.meta.url), { recursive: true });
await writeFile(target, file, "utf8");
console.log(`Escritas ${works.length} obras en src/data/works.ts`);
