import { API_URL } from "@/lib/env";

import type { TokenOut } from "./types";

/** Error normalizado de la API. */
export class ApiError extends Error {
  readonly status: number;
  readonly detail: string;
  readonly payload: unknown;

  constructor(status: number, detail: string, payload?: unknown) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
    this.payload = payload;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/* ------------------------------------------------------------------ */
/* Estado de autenticación JWT en memoria (access token only)           */
/* ------------------------------------------------------------------ */

interface AuthHandlers {
  /** Se llama cuando la sesión dejó de ser válida. */
  onAuthError: () => void;
}

let accessToken: string | null = null;
let handlers: AuthHandlers | null = null;

export function setAuthHandlers(next: AuthHandlers | null): void {
  handlers = next;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

/* ------------------------------------------------------------------ */
/* Indicador de sesión previa                                          */
/* ------------------------------------------------------------------ */

/**
 * La cookie del refresh token es httpOnly, así que JavaScript no puede saber
 * si existe. Este indicador (no es un secreto, solo un booleano) evita lanzar
 * /auth/refresh en cada carga de un visitante que nunca inició sesión.
 */
const SESSION_HINT_KEY = "museo:has-session";

export function hasSessionHint(): boolean {
  try {
    return localStorage.getItem(SESSION_HINT_KEY) === "1";
  } catch {
    return false;
  }
}

export function setSessionHint(active: boolean): void {
  try {
    if (active) localStorage.setItem(SESSION_HINT_KEY, "1");
    else localStorage.removeItem(SESSION_HINT_KEY);
  } catch {
    // localStorage no disponible (modo privado estricto): solo se pierde la optimización.
  }
}

/* ------------------------------------------------------------------ */
/* Refresh silencioso con deduplicación                                */
/* ------------------------------------------------------------------ */

let refreshInFlight: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("refresh rejected");
      const data = (await response.json()) as TokenOut;
      accessToken = data.access_token;
      return data.access_token;
    } catch {
      accessToken = null;
      handlers?.onAuthError();
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

/* ------------------------------------------------------------------ */
/* Petición base                                                       */
/* ------------------------------------------------------------------ */

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Cuerpo JSON. */
  body?: unknown;
  /** Cuerpo form-urlencoded (login OAuth2). */
  form?: Record<string, string>;
  /** Adjuntar el bearer token (por defecto sí). */
  auth?: boolean;
  /** Intentar refresh ante 401 (por defecto sí). */
  allowRefresh?: boolean;
  query?: Record<string, QueryValue>;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(`${API_URL}${path.startsWith("/") ? path : `/${path}`}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function extractDetail(status: number, text: string): {
  detail: string;
  payload: unknown;
} {
  if (!text) return { detail: `Error ${status}`, payload: null };

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { detail: text, payload: text };
  }

  if (typeof data === "string") return { detail: data, payload: data };

  if (data && typeof data === "object" && "detail" in data) {
    const { detail } = data as { detail: unknown };
    if (typeof detail === "string") return { detail, payload: data };
    if (Array.isArray(detail)) {
      const messages = detail
        .map((item) =>
          item && typeof item === "object" && "msg" in item
            ? String((item as { msg: unknown }).msg)
            : null,
        )
        .filter((msg): msg is string => Boolean(msg));
      if (messages.length > 0) {
        return { detail: messages.join("\n"), payload: data };
      }
    }
  }
  return { detail: `Error ${status}`, payload: data };
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", auth = true, allowRefresh = true } = options;

  const send = (token: string | null): Promise<Response> => {
    const headers = new Headers({ Accept: "application/json" });
    let body: BodyInit | undefined;

    if (options.form) {
      headers.set("Content-Type", "application/x-www-form-urlencoded");
      body = new URLSearchParams(options.form).toString();
    } else if (options.body !== undefined) {
      headers.set("Content-Type", "application/json");
      body = JSON.stringify(options.body);
    }
    if (auth && token) headers.set("Authorization", `Bearer ${token}`);

    return fetch(buildUrl(path, options.query), {
      method,
      headers,
      body,
      credentials: "include",
      signal: options.signal,
    });
  };

  let response = await send(accessToken);

  if (response.status === 401 && auth && allowRefresh) {
    const fresh = await refreshAccessToken();
    if (fresh) response = await send(fresh);
  }

  if (response.status === 401 && auth) {
    handlers?.onAuthError();
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();

  if (response.ok) {
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  const { detail, payload } = extractDetail(response.status, text);
  throw new ApiError(response.status, detail, payload);
}
