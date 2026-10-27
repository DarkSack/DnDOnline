import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, type User } from "./api";
import { AuthContext, type AuthContextValue } from "./use-auth";
import { useI18n } from "./i18n";

export function AuthProvider({ children }: { children: ReactNode }) {
  const { locale, tError } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(
    () =>
      api<{ user: User | null }>("/api/auth/me")
        .then((r) => setUser(r.user), () => setUser(null))
        .finally(() => setLoading(false)),
    [],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<AuthContextValue>(() => {
    const attempt = async (path: string, body: object) => {
      try {
        setUser((await api<{ user: User }>(path, { body })).user);
        return { error: null };
      } catch (err) {
        return { error: tError((err as { code?: string }).code ?? "internal") };
      }
    };
    return {
      user,
      loading,
      refresh,
      signInWithPassword: (email, password) => attempt("/api/auth/login", { email, password }),
      signUpWithPassword: (input) => attempt("/api/auth/register", { ...input, locale }),
      signOut: async () => {
        await api("/api/auth/logout", { body: {} });
        setUser(null);
      },
    };
  }, [user, loading, refresh, locale, tError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
