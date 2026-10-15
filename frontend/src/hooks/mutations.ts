import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  artistsApi,
  artworksApi,
  auditApi,
  authApi,
  favoritesApi,
  roomsApi,
  usersApi,
} from "@/lib/api/endpoints";
import { qk } from "@/lib/api/queryKeys";
import type {
  ArtistCreate,
  ArtistUpdate,
  ArtworkCreate,
  ArtworkUpdate,
  PasswordChange,
  RoomCreate,
  RoomUpdate,
  UserCreate,
  UserUpdate,
} from "@/lib/api/types";

/* ------------------------------- Artistas ------------------------------- */

export function useCreateArtist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ArtistCreate) => artistsApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.artists.all });
    },
  });
}

export function useUpdateArtist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ArtistUpdate }) =>
      artistsApi.update(id, payload),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: qk.artists.all });
      void queryClient.invalidateQueries({ queryKey: qk.artists.detail(variables.id) });
    },
  });
}

export function useDeleteArtist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => artistsApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.artists.all });
      // Las obras pueden quedar afectadas por la integridad referencial.
      void queryClient.invalidateQueries({ queryKey: qk.artworks.all });
    },
  });
}

/* --------------------------------- Salas -------------------------------- */

export function useCreateRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RoomCreate) => roomsApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.rooms.all });
    },
  });
}

export function useUpdateRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: RoomUpdate }) =>
      roomsApi.update(id, payload),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: qk.rooms.all });
      void queryClient.invalidateQueries({ queryKey: qk.rooms.detail(variables.id) });
    },
  });
}

export function useDeleteRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => roomsApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.rooms.all });
      void queryClient.invalidateQueries({ queryKey: qk.artworks.all });
    },
  });
}

/* --------------------------------- Obras -------------------------------- */

export function useCreateArtwork() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ArtworkCreate) => artworksApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.artworks.all });
    },
  });
}

export function useUpdateArtwork() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ArtworkUpdate }) =>
      artworksApi.update(id, payload),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: qk.artworks.all });
      void queryClient.invalidateQueries({ queryKey: qk.artworks.detail(variables.id) });
    },
  });
}

export function useDeleteArtwork() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => artworksApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.artworks.all });
    },
  });
}

/* -------------------------------- Usuarios ------------------------------ */

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UserCreate) => usersApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.users.all });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UserUpdate }) =>
      usersApi.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.users.all });
    },
  });
}

/* --------------------------- Cuenta y sesiones -------------------------- */

export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => authApi.revokeSession(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.sessions });
    },
  });
}

export function useCloseAllSessions() {
  return useMutation({ mutationFn: () => authApi.closeAllSessions() });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: PasswordChange) => authApi.changePassword(payload),
  });
}

/* ------------------------------- Favoritos ------------------------------ */

/** Marca o desmarca una obra con actualización optimista del corazón. */
export function useToggleFavorite(userId: number) {
  const queryClient = useQueryClient();
  const idsKey = qk.favorites.ids(userId);
  return useMutation({
    mutationFn: ({ artworkId, favorite }: { artworkId: number; favorite: boolean }) =>
      favorite ? favoritesApi.add(artworkId) : favoritesApi.remove(artworkId),
    onMutate: async ({ artworkId, favorite }) => {
      await queryClient.cancelQueries({ queryKey: idsKey });
      const previous = queryClient.getQueryData<number[]>(idsKey);
      queryClient.setQueryData<number[]>(idsKey, (current = []) =>
        favorite
          ? Array.from(new Set([...current, artworkId]))
          : current.filter((id) => id !== artworkId),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(idsKey, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: qk.favorites.all });
    },
  });
}

/* -------------------------------- Auditoría ----------------------------- */

export function useVerifyAuditChain() {
  return useMutation({ mutationFn: () => auditApi.verify() });
}
