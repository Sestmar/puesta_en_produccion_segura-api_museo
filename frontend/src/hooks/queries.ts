import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import {
  artistsApi,
  artworksApi,
  auditApi,
  authApi,
  favoritesApi,
  roomsApi,
  usersApi,
} from "@/lib/api/endpoints";
import { useAuth } from "@/hooks/useAuth";
import { qk } from "@/lib/api/queryKeys";
import type {
  Artist,
  Artwork,
  ArtworkListParams,
  AuditListParams,
  AuditLog,
  AuditVerification,
  ListParams,
  Page,
  Room,
  Session,
  User,
} from "@/lib/api/types";

export function useGoogleLoginEnabled(): boolean {
  const { data } = useQuery({
    queryKey: qk.googleStatus,
    queryFn: authApi.googleStatus,
    staleTime: Infinity,
    retry: false,
  });
  return data?.enabled ?? false;
}

export function useArtists(params: ListParams = {}): UseQueryResult<Page<Artist>> {
  return useQuery({
    queryKey: qk.artists.list(params),
    queryFn: () => artistsApi.list(params),
  });
}

export function useArtist(id: number): UseQueryResult<Artist> {
  return useQuery({
    queryKey: qk.artists.detail(id),
    queryFn: () => artistsApi.get(id),
    enabled: Number.isInteger(id) && id > 0,
  });
}

export function useRooms(params: ListParams = {}): UseQueryResult<Page<Room>> {
  return useQuery({
    queryKey: qk.rooms.list(params),
    queryFn: () => roomsApi.list(params),
  });
}

export function useRoom(id: number): UseQueryResult<Room> {
  return useQuery({
    queryKey: qk.rooms.detail(id),
    queryFn: () => roomsApi.get(id),
    enabled: Number.isInteger(id) && id > 0,
  });
}

export function useArtworks(params: ArtworkListParams = {}): UseQueryResult<Page<Artwork>> {
  return useQuery({
    queryKey: qk.artworks.list(params),
    queryFn: () => artworksApi.list(params),
  });
}

export function useArtwork(id: number): UseQueryResult<Artwork> {
  return useQuery({
    queryKey: qk.artworks.detail(id),
    queryFn: () => artworksApi.get(id),
    enabled: Number.isInteger(id) && id > 0,
  });
}

export function useUsers(params: ListParams = {}): UseQueryResult<Page<User>> {
  return useQuery({
    queryKey: qk.users.list(params),
    queryFn: () => usersApi.list(params),
  });
}

export function useAuditLogs(params: AuditListParams = {}): UseQueryResult<Page<AuditLog>> {
  return useQuery({
    queryKey: qk.audit.list(params),
    queryFn: () => auditApi.list(params),
  });
}

export function useAuditVerification(): UseQueryResult<AuditVerification> {
  return useQuery({
    queryKey: qk.audit.verify,
    queryFn: () => auditApi.verify(),
  });
}

/** Ids de las obras favoritas; inactiva (sin petición) para visitantes anónimos. */
export function useFavoriteIds(): UseQueryResult<number[]> {
  const { user } = useAuth();
  return useQuery({
    queryKey: qk.favorites.ids(user?.id ?? 0),
    queryFn: () => favoritesApi.ids(),
    enabled: user !== null,
  });
}

export function useFavorites(params: ListParams = {}): UseQueryResult<Page<Artwork>> {
  const { user } = useAuth();
  return useQuery({
    queryKey: qk.favorites.list(user?.id ?? 0, params),
    queryFn: () => favoritesApi.list(params),
    enabled: user !== null,
  });
}

export function useSessions(): UseQueryResult<Session[]> {
  return useQuery({
    queryKey: qk.sessions,
    queryFn: () => authApi.sessions(),
  });
}
