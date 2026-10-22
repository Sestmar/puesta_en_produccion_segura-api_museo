import { createContext } from "react";

import type { User } from "@/lib/api/types";

export type AuthStatus = "loading" | "anonymous" | "authenticated";

export interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  isAdmin: boolean;
  /** Admin o gestor: puede editar obras, artistas y salas. */
  canManageCatalog: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  /** Cierra el flujo OAuth: canjea la cookie httpOnly por un access token. */
  completeOAuth: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
