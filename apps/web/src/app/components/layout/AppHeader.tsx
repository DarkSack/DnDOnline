import { useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { api } from "@/services/api";
import { useAuth } from "@/services/use-auth";
import { useI18n, type Locale } from "@/services/i18n";

export function LanguageSelect() {
  const { locale, setLocale, t } = useI18n();
  return (
    <select
      aria-label={t("app.language")}
      value={locale}
      onChange={(e) => setLocale(e.target.value as Locale)}
      className="rounded-md border border-border px-2 py-1 text-xs"
    >
      <option value="es">ES</option>
      <option value="en">EN</option>
    </select>
  );
}

/** Cabecera de las pantallas con sesión: marca, idioma, usuario y aviso de correo sin verificar. */
export function AppHeader() {
  const { user, signOut } = useAuth();
  const { t } = useI18n();
  const [resent, setResent] = useState(false);
  return (
    <>
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <Link to="/dashboard" className="font-heading text-2xl">
            dndonline
          </Link>
          <p className="truncate text-xs text-muted-foreground">{user?.displayName}</p>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSelect />
          <Button variant="outline" size="sm" onClick={signOut}>
            {t("auth.logout")}
          </Button>
        </div>
      </header>
      {user && !user.emailVerified && (
        <p className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-input/20 px-3 py-2 text-xs text-muted-foreground">
          {t("auth.unverified")}
          <button
            className="text-primary underline disabled:no-underline"
            disabled={resent}
            onClick={() => api("/api/auth/resend-verification", { body: {} }).then(() => setResent(true))}
          >
            {resent ? t("auth.resent") : t("auth.resend")}
          </button>
        </p>
      )}
    </>
  );
}
