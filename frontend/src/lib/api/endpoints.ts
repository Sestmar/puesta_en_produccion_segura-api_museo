import { apiRequest } from "./client";
import type {
  Artist,
  ArtistCreate,
  ArtistUpdate,
  Artwork,
  ArtworkCreate,
  ArtworkListParams,
  ArtworkUpdate,
  AuditListParams,
  AuditLog,
  AuditVerification,
  ListParams,
  Page,
  PasswordChange,
  Room,
  RoomCreate,
  RoomUpdate,
  Session,
  TokenOut,
  User,
  UserCreate,
  UserUpdate,
} from "./types";

export const authApi = {
  login: (username: string, password: string) =>
    apiRequest<TokenOut>("/auth/login", {
      method: "POST",
      form: { username, password },
      auth: false,
      allowRefresh: false,
    }),

  logout: () =>
    apiRequest<void>("/auth/logout", {
      method: "POST",
      auth: false,
      allowRefresh: false,
    }),

  refresh: () =>
    apiRequest<TokenOut>("/auth/refresh", {
      method: "POST",
      auth: false,
      allowRefresh: false,
    }),

  me: () => apiRequest<User>("/auth/me"),

  sessions: () => apiRequest<Session[]>("/auth/sessions"),

  revokeSession: (id: number) =>
    apiRequest<void>(`/auth/sessions/${id}`, { method: "DELETE" }),

  closeAllSessions: () =>
    apiRequest<void>("/auth/sessions", { method: "DELETE" }),

  changePassword: (payload: PasswordChange) =>
    apiRequest<void>("/auth/password", { method: "PUT", body: payload }),
};

export const usersApi = {
  list: (params: ListParams = {}) =>
    apiRequest<Page<User>>("/users", { query: params as Record<string, any> }),

  create: (payload: UserCreate) =>
    apiRequest<User>("/auth/register", { method: "POST", body: payload }),

  update: (id: number, payload: UserUpdate) =>
    apiRequest<User>(`/users/${id}`, { method: "PATCH", body: payload }),
};

export const artistsApi = {
  list: (params: ListParams = {}) =>
    apiRequest<Page<Artist>>("/artists", { query: params as Record<string, any> }),

  get: (id: number) => apiRequest<Artist>(`/artists/${id}`),

  create: (payload: ArtistCreate) =>
    apiRequest<Artist>("/artists", { method: "POST", body: payload }),

  update: (id: number, payload: ArtistUpdate) =>
    apiRequest<Artist>(`/artists/${id}`, { method: "PUT", body: payload }),

  remove: (id: number) =>
    apiRequest<void>(`/artists/${id}`, { method: "DELETE" }),
};

export const roomsApi = {
  list: (params: ListParams = {}) =>
    apiRequest<Page<Room>>("/rooms", { query: params as Record<string, any> }),

  get: (id: number) => apiRequest<Room>(`/rooms/${id}`),

  create: (payload: RoomCreate) =>
    apiRequest<Room>("/rooms", { method: "POST", body: payload }),

  update: (id: number, payload: RoomUpdate) =>
    apiRequest<Room>(`/rooms/${id}`, { method: "PUT", body: payload }),

  remove: (id: number) =>
    apiRequest<void>(`/rooms/${id}`, { method: "DELETE" }),
};

export const artworksApi = {
  list: (params: ArtworkListParams = {}) =>
    apiRequest<Page<Artwork>>("/artworks", { query: params as Record<string, any> }),

  get: (id: number) => apiRequest<Artwork>(`/artworks/${id}`),

  create: (payload: ArtworkCreate) =>
    apiRequest<Artwork>("/artworks", { method: "POST", body: payload }),

  update: (id: number, payload: ArtworkUpdate) =>
    apiRequest<Artwork>(`/artworks/${id}`, { method: "PUT", body: payload }),

  remove: (id: number) =>
    apiRequest<void>(`/artworks/${id}`, { method: "DELETE" }),
};

export const auditApi = {
  list: (params: AuditListParams = {}) =>
    apiRequest<Page<AuditLog>>("/audit", { query: params as Record<string, any> }),

  verify: () => apiRequest<AuditVerification>("/audit/verify"),
};
