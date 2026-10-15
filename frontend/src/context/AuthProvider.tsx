import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { AuthContext, type AuthStatus } from "@/context/auth-context";
import {
  hasSessionHint,
  refreshAccessToken,
  setAccessToken,
  setAuthHandlers,
  setSessionHint,
} from "@/lib/api/client";
import { authApi } from "@/lib/api/endpoints";
import type { TokenOut, User } from "@/lib/api/types";

/**
 * Autenticación JWT con refresh token en cookie httpOnly.
 *
 * El *access token* vive en memoria y se pierde al recargar. El *refresh token*
 * nunca es accesible por JavaScript: el backend lo coloca en una cookie
 * httpOnly, Secure y SameSite, y el navegador la envía automáticamente en
 * /auth/refresh. Al arrancar, si hubo una sesión previa, renovamos el access
 * token con la cookie y, si funciona, recuperamos el usuario.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>(() =>
    hasSessionHint() ? "loading" : "anonymous",
  );

  const persistTokens = useCallback((token: TokenOut) => {
    setAccessToken(token.access_token);
    setSessionHint(true);
  }, []);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setSessionHint(false);
    setUser(null);
    setStatus("anonymous");
  }, []);

  // Puente entre el cliente HTTP (fuera de React) y el estado de sesión.
  useEffect(() => {
    setAuthHandlers({
      onAuthError: () => {
        clearSession();
      },
    });
    return () => setAuthHandlers(null);
  }, [clearSession]);

  // Restauración de sesión al arrancar: la cookie httpOnly viaja sola.
  // Tras recargar no hay access token en memoria, así que vamos directos al
  // refresh (deduplicado, por lo que StrictMode no duplica la petición).
  useEffect(() => {
    if (!hasSessionHint()) return;
    let active = true;

    refreshAccessToken()
      .then(async (token) => {
        // Si el refresh falla, onAuthError ya ha limpiado la sesión.
        if (!token || !active) return;
        const me = await authApi.me();
        if (!active) return;
        setUser(me);
        setStatus("authenticated");
      })
      .catch(() => {
        if (active) clearSession();
      });

    return () => {
      active = false;
    };
  }, [clearSession]);

  const login = useCallback(
    async (username: string, password: string) => {
      const token = await authApi.login(username, password);
      persistTokens(token);
      const me = await authApi.me();
      setUser(me);
      setStatus("authenticated");
    },
    [persistTokens],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Aunque falle la revocación en el servidor, cerramos la sesión local.
    }
    clearSession();
  }, [clearSession]);

  const refreshUser = useCallback(async () => {
    const me = await authApi.me();
    setUser(me);
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      isAdmin: user?.role === "admin",
      canManageCatalog: user?.role === "admin" || user?.role === "manager",
      login,
      logout,
      refreshUser,
    }),
    [user, status, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
