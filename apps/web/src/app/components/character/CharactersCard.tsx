import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CharacterSummary } from "@/services/characters";
import { useI18n, type I18nKey } from "@/services/i18n";

/**
 * Tarjeta con una lista de personajes. `aside` decide qué se ve a la derecha:
 * la campaña en el panel propio, el jugador en la página de una campaña.
 */
export function CharactersCard({
  title,
  load,
  empty,
  aside,
  newHref,
}: {
  title: I18nKey;
  load: () => Promise<CharacterSummary[]>;
  empty: I18nKey;
  aside: (c: CharacterSummary) => string | null;
  newHref: string | null;
}) {
  const { t } = useI18n();
  const [characters, setCharacters] = useState<CharacterSummary[] | null>(null);

  useEffect(() => {
    load().then(setCharacters, () => setCharacters([]));
  }, [load]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t(title)}</CardTitle>
        {newHref && (
          <Button size="sm" asChild>
            <Link to={newHref}>{t("char.new")}</Link>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {characters === null ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : characters.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t(empty)}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {characters.map((c) => (
              <li key={c.id}>
                <Link
                  to={`/characters/${c.id}`}
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-input/20 px-3 py-2 text-sm hover:bg-input/40"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{c.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {c.race} · {c.className} · {t("char.level")} {c.level}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{aside(c)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
