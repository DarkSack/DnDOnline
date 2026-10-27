import { Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isPreviewMode } from "@/services/preview";
import { useI18n } from "@/services/i18n";

/**
 * Aviso de lo que aún depende del backend viejo (Supabase, ya borrado).
 * Con VITE_UI_PREVIEW=true enlaza a esas pantallas, que se ven con datos de ejemplo.
 */
export function LegacyNotice() {
  const { t } = useI18n();
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("legacy.title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-xs text-muted-foreground">
        <p>{t("legacy.body")}</p>
        {isPreviewMode && (
          <p className="flex flex-wrap gap-3">
            <Link to="/characters/new" className="text-primary hover:underline">
              /characters/new
            </Link>
            <Link to="/rooms/r0000000-0000-4000-8000-000000000001" className="text-primary hover:underline">
              /rooms (maqueta)
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
