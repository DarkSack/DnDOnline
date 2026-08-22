import type { Session, User } from "@supabase/supabase-js";
import { createContext, useContext } from "react";

export type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signInWithPassword: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null }>;
  signUpWithPassword: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
