/** Tipos que reflejan 1:1 los esquemas Pydantic del backend. */

export type Role = "admin" | "viewer";

export interface User {
  id: number;
  username: string;
  role: Role;
  is_active: boolean;
}

export interface TokenOut {
  access_token: string;
  token_type: string;
}

export interface Session {
  id: number;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
  user_agent: string | null;
  ip_address: string | null;
}

export interface Artist {
  id: number;
  name: string;
  nationality: string | null;
  birth_year: number | null;
  death_year: number | null;
}

export interface Room {
  id: number;
  name: string;
  floor: number;
  description: string | null;
}

export interface Artwork {
  id: number;
  title: string;
  year: number | null;
  technique: string | null;
  description: string | null;
  artist_id: number;
  room_id: number | null;
}

export interface AuditLog {
  id: number;
  created_at: string;
  action: string;
  actor: string | null;
  resource_type: string | null;
  resource_id: number | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  request_id: string | null;
}

export interface AuditVerification {
  valid: boolean;
  checked: number;
  first_invalid_id: number | null;
  reason: string | null;
}

/** Envoltorio de listados paginados del backend. */
export interface Page<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

/* ---------- Payloads de escritura ---------- */

export interface UserCreate {
  username: string;
  password: string;
  role: Role;
}

export interface UserUpdate {
  role?: Role;
  is_active?: boolean;
}

export interface PasswordChange {
  current_password: string;
  new_password: string;
}

export interface ArtistCreate {
  name: string;
  nationality?: string | null;
  birth_year?: number | null;
  death_year?: number | null;
}

export type ArtistUpdate = Partial<ArtistCreate>;

export interface RoomCreate {
  name: string;
  floor: number;
  description?: string | null;
}

export type RoomUpdate = Partial<RoomCreate>;

export interface ArtworkCreate {
  title: string;
  year?: number | null;
  technique?: string | null;
  description?: string | null;
  artist_id: number;
  room_id?: number | null;
}

export type ArtworkUpdate = Partial<ArtworkCreate>;

/** Parámetros de listado comunes. */
export interface ListParams {
  skip?: number;
  limit?: number;
}

export interface ArtworkListParams extends ListParams {
  artist_id?: number;
  room_id?: number;
}

export interface AuditListParams extends ListParams {
  action?: string;
  actor?: string;
  request_id?: string;
}
