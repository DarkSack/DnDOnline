import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/services/api";
import { useAuth } from "@/services/use-auth";
import { useI18n } from "@/services/i18n";
import { LanguageSelect } from "@/app/components/layout/AppHeader";

const FIELD = "rounded-md border border-border px-3 py-2 text-sm";

export default function LoginPage() {
  const { signInWithPassword } = useAuth();
  const { t, tError } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [forgot, setForgot] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    if (forgot) {
      try {
        await api("/api/auth/forgot", { body: { email } });
        setSent(true);
      } catch (err) {
        setError(tError((err as { code?: string }).code ?? "internal"));
      }
      setPending(false);
      return;
    }
    const { error } = await signInWithPassword(email, password);
    setPending(false);
    if (error) setError(error);
    else navigate("/dashboard", { replace: true });
  };

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-4">
      <p className="text-sm text-muted-foreground">{t("app.tagline")}</p>
      <Card className="w-full max-w-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t(forgot ? "auth.forgot" : "auth.login")}</CardTitle>
          <LanguageSelect />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              {t("auth.email")}
              <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={FIELD} />
            </label>
            {!forgot && (
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                {t("auth.password")}
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={FIELD}
                />
              </label>
            )}
            {error && (
              <p role="alert" className="text-xs text-destructive">
                {error}
              </p>
            )}
            {forgot && sent ? (
              <p className="text-xs text-muted-foreground">{t("auth.forgotSent")}</p>
            ) : (
              <Button type="submit" disabled={pending}>
                {forgot ? t("auth.sendLink") : pending ? t("auth.loggingIn") : t("auth.loginCta")}
              </Button>
            )}
          </form>
          <button
            type="button"
            className="self-start text-xs text-muted-foreground hover:underline"
            onClick={() => {
              setForgot(!forgot);
              setSent(false);
              setError(null);
            }}
          >
            {forgot ? t("common.back") : t("auth.forgot")}
          </button>
          <p className="text-xs text-muted-foreground">
            {t("auth.noAccount")}{" "}
            <Link to="/register" className="text-primary hover:underline">
              {t("auth.goRegister")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
