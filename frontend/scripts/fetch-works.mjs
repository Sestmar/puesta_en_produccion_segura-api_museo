/**
 * Genera src/data/works.ts con obras de dominio público del Art Institute of
 * Chicago (API abierta, sin clave) y descarga sus imágenes a public/works/.
 *
 * Uso:  node scripts/fetch-works.mjs
 *
 * Las imágenes se sirven localmente para evitar que el CDN de AIC bloquee el
 * hotlinking desde localhost/producción con un Referer distinto a artic.edu.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const AIC_SEARCH = "https://api.artic.edu/api/v1/artworks/search";
const AIC_IIIF = "https://www.artic.edu/iiif/2";
const DOWNLOAD_WIDTH = 1600;
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadImage(imageId) {
  const filename = `${imageId}.jpg`;
  const targetPath = new URL(`../public/works/${filename}`, import.meta.url);

  if (existsSync(targetPath)) {
    console.log(`  ✓ ${filename} ya existe`);
    return true;
  }

  const url = `${AIC_IIIF}/${imageId}/full/${DOWNLOAD_WIDTH},/0/default.jpg`;
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Referer: "https://www.artic.edu/",
        Origin: "https://www.artic.edu",
      },
    });
    if (!response.ok) {
      console.warn(`  ✗ ${filename}: ${response.status}`);
      return false;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    await writeFile(targetPath, buffer);
    console.log(`  ↓ ${filename} (${(buffer.length / 1024).toFixed(1)} KB)`);
    return true;
  } catch (error) {
    console.warn(`  ✗ ${filename}: ${error.message}`);
    return false;
  }
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

const dataDir = new URL("../src/data", import.meta.url);
const worksDir = new URL("../public/works", import.meta.url);
await mkdir(dataDir, { recursive: true });
await mkdir(worksDir, { recursive: true });

const target = new URL("../src/data/works.ts", import.meta.url);
await writeFile(target, file, "utf8");
console.log(`Escritas ${works.length} obras en src/data/works.ts`);

console.log("Descargando imágenes locales…");
let downloaded = 0;
for (const work of works) {
  const ok = await downloadImage(work.imageId);
  if (ok) downloaded += 1;
  await sleep(150);
}
console.log(`Imágenes descargadas: ${downloaded}/${works.length}`);
