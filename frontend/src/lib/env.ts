/** URL base de la API, sin barra final. */
export const API_URL: string = (
  import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000"
).replace(/\/+$/, "");

export const APP_NAME = "Museo";
export const APP_TAGLINE = "Catálogo digital";
