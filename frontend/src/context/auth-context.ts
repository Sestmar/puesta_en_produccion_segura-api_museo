import { createContext } from "react";

import type { User } from "@/lib/api/types";

export type AuthStatus = "loading" | "anonymous" | "authenticated";

export interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
