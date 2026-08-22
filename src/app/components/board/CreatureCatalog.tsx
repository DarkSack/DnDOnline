import { useEffect } from "react";
import { CREATURE_CATALOG, type CreatureTemplate } from "@/engine/board";
import { cn } from "@/lib/utils";
import type { RoomMemberWithProfile } from "@/services/rooms";

export type CreatureCatalogProps = {
  armed: CreatureTemplate | null;
  onArm: (t: CreatureTemplate | null) => void;
  onSpawnPc?: (member: RoomMemberWithProfile) => void;
  pcMembers?: RoomMemberWithProfile[];
};

/**
 * Panel del DM: click en una tarjeta arma el spawn; el siguiente click
 * sobre el tablero coloca la entidad. Escape cancela.
 *
 * Los PCs asignados a la sala se muestran como spawn especial que
 * enlaza character_id (no del catálogo genérico).
 */
export function CreatureCatalog({
  armed,
  onArm,
  onSpawnPc,
  pcMembers = [],
}: CreatureCatalogProps) {
  // Escape cancela el arm.
  useEffect(() => {
    if (!armed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onArm(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [armed, onArm]);

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-background/40 p-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-muted-foreground">
          Catálogo (DM)
        </span>
        {armed && (
          <span className="text-primary">
            Click en el tablero para colocar · Esc para cancelar
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
        {CREATURE_CATALOG.map((t) => {
          const active = armed?.slug === t.slug;
          return (
            <button
              key={t.slug}
              type="button"
              onClick={() => onArm(active ? null : t)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-md border p-2 text-xs transition-colors",
                active
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-input/20 text-muted-foreground hover:bg-input/40 hover:text-foreground",
              )}
            >
              <span className="text-lg leading-none">{t.glyph ?? "•"}</span>
              <span className="text-center font-medium">{t.name}</span>
              <span className="text-[10px] opacity-60">
                {t.kind === "monster"
                  ? "Enemigo"
                  : t.kind === "npc"
                    ? "NPC"
                    : "PC"}
                {t.size > 1 ? ` · ${t.size}×` : ""} · {t.hp} HP
              </span>
            </button>
          );
        })}
      </div>

      {pcMembers.length > 0 && onSpawnPc && (
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <span className="text-xs font-medium text-muted-foreground">
            PCs de la sala
          </span>
          <div className="flex flex-wrap gap-2">
            {pcMembers.map((m) => (
              <button
                key={m.user_id}
                type="button"
                onClick={() => onSpawnPc(m)}
                className="rounded-md border border-border bg-input/20 px-3 py-1.5 text-xs hover:bg-input/40"
              >
                + {m.characters!.name}
                <span className="ml-2 text-[10px] text-muted-foreground">
                  {m.profiles?.username ?? ""}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
