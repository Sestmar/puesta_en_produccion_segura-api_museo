import type {
  ArtworkListParams,
  AuditListParams,
  ListParams,
} from "./types";

/**
 * Claves de caché jerárquicas de TanStack Query.
 * Agrupar por recurso permite invalidaciones amplias (p. ej. qk.artists.all).
 */
export const qk = {
  me: ["me"] as const,
  sessions: ["sessions"] as const,

  users: {
    all: ["users"] as const,
    list: (params: ListParams) => ["users", "list", params] as const,
  },

  artists: {
    all: ["artists"] as const,
    list: (params: ListParams) => ["artists", "list", params] as const,
    detail: (id: number) => ["artists", "detail", id] as const,
  },

  rooms: {
    all: ["rooms"] as const,
    list: (params: ListParams) => ["rooms", "list", params] as const,
    detail: (id: number) => ["rooms", "detail", id] as const,
  },

  artworks: {
    all: ["artworks"] as const,
    list: (params: ArtworkListParams) => ["artworks", "list", params] as const,
    detail: (id: number) => ["artworks", "detail", id] as const,
  },

  audit: {
    all: ["audit"] as const,
    list: (params: AuditListParams) => ["audit", "list", params] as const,
    verify: ["audit", "verify"] as const,
  },
};
