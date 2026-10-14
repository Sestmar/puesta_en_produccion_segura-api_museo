import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { AuthContext, type AuthStatus } from "@/context/auth-context";
import { setAccessToken, setAuthHandlers } from "@/lib/api/client";
import { authApi } from "@/lib/api/endpoints";
import type { TokenOut, User } from "@/lib/api/types";

/**
 * Autenticación JWT con refresh token en cookie httpOnly.
 *
 * El *access token* vive en memoria y se pierde al recargar. El *refresh token*
 * nunca es accesible por JavaScript: el backend lo coloca en una cookie
 * httpOnly, Secure y SameSite, y el navegador la envía automáticamente en
 * /auth/refresh. Al arrancar, intentamos renovar el access token con la cookie
 * y, si funciona, recuperamos el usuario.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const persistTokens = useCallback((token: TokenOut) => {
    setAccessToken(token.access_token);
  }, []);

  const clearSession = useCallback(() => {
    setAccessToken(null);
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
  useEffect(() => {
    let active = true;

    authApi
      .me()
      .then((me) => {
        if (!active) return;
        setUser(me);
        setStatus("authenticated");
      })
      .catch(() => {
        authApi
          .refresh()
          .then(async (token) => {
            if (!active) return;
            persistTokens(token);
            const me = await authApi.me();
            if (!active) return;
            setUser(me);
            setStatus("authenticated");
          })
          .catch(() => {
            if (active) clearSession();
          });
      });

    return () => {
      active = false;
    };
  }, [clearSession, persistTokens]);

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
      login,
      logout,
      refreshUser,
    }),
    [user, status, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
