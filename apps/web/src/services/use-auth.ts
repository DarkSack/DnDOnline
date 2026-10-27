import { createContext, useContext } from "react";
import type { User } from "./api";

export type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithPassword: (input: { email: string; password: string; displayName: string }) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  /** Vuelve a pedir la sesión al servidor (tras verificar el correo, por ejemplo). */
  refresh: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
