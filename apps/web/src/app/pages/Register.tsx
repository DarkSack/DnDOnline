import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/services/use-auth";
import { useI18n } from "@/services/i18n";
import { LanguageSelect } from "@/app/components/layout/AppHeader";

const FIELD = "rounded-md border border-border px-3 py-2 text-sm";

export default function RegisterPage() {
  const { signUpWithPassword } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    const { error } = await signUpWithPassword({ email, password, displayName });
    setPending(false);
    // El servidor abre sesión al registrar; la verificación de correo llega aparte.
    if (error) setError(error);
    else navigate("/dashboard", { replace: true });
  };

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t("auth.register")}</CardTitle>
          <LanguageSelect />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              {t("auth.displayName")}
              <input
                autoComplete="nickname"
                required
                minLength={2}
                maxLength={40}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className={FIELD}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              {t("auth.email")}
              <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={FIELD} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              {t("auth.password")}
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={10}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={FIELD}
              />
              <span>{t("auth.passwordHint")}</span>
            </label>
            {error && (
              <p role="alert" className="text-xs text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" disabled={pending}>
              {pending ? t("auth.registering") : t("auth.register")}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">
            {t("auth.haveAccount")}{" "}
            <Link to="/login" className="text-primary hover:underline">
              {t("auth.goLogin")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
