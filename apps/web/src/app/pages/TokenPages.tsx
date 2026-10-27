import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/services/api";
import { useAuth } from "@/services/use-auth";
import { useI18n } from "@/services/i18n";

// El token llega en el fragmento (#) del enlace del correo: nunca viaja al servidor en la URL.
const tokenFromHash = () => window.location.hash.slice(1);

export function VerifyPage() {
  const { t, tError } = useI18n();
  const { refresh } = useAuth();
  const [state, setState] = useState<"busy" | "ok" | { error: string }>("busy");
  const started = useRef(false);

  useEffect(() => {
    // El token es de un solo uso: StrictMode ejecuta el efecto dos veces y la segunda fallaría.
    if (started.current) return;
    started.current = true;
    api("/api/auth/verify", { body: { token: tokenFromHash() } }).then(
      () => {
        setState("ok");
        refresh();
      },
      (e: { code?: string }) => setState({ error: tError(e.code ?? "internal") }),
    );
  }, [refresh, tError]);

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-3 text-center text-sm">
          {state === "busy" ? (
            t("auth.verifying")
          ) : state === "ok" ? (
            t("auth.verified")
          ) : (
            <p role="alert" className="text-destructive">
              {state.error}
            </p>
          )}
          <Link to="/dashboard" className="text-primary hover:underline">
            dndonline
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

export function ResetPage() {
  const { t, tError } = useI18n();
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await api("/api/auth/reset", { body: { token: tokenFromHash(), password } });
      setDone(true);
    } catch (err) {
      setError(tError((err as { code?: string }).code ?? "internal"));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("auth.newPassword")}</CardTitle>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="flex flex-col gap-3 text-sm">
              <p>{t("auth.resetDone")}</p>
              <Button asChild>
                <Link to="/login">{t("auth.loginCta")}</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                {t("auth.newPassword")}
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={10}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-md border border-border px-3 py-2 text-sm"
                />
                <span>{t("auth.passwordHint")}</span>
              </label>
              {error && (
                <p role="alert" className="text-xs text-destructive">
                  {error}
                </p>
              )}
              <Button type="submit" disabled={pending}>
                {t("auth.save")}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
