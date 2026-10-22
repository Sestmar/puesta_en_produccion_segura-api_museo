/** URL base de la API, sin barra final. */
export const API_URL: string = (
  import.meta.env.VITE_API_URL ?? "http://localhost:8001"
).replace(/\/+$/, "");

export const APP_NAME = "Museo";
export const APP_TAGLINE = "Catálogo digital";

/** Endpoint que arranca el flujo OAuth de Google (redirige al consentimiento). */
export const GOOGLE_LOGIN_URL = `${API_URL}/auth/google/login`;
