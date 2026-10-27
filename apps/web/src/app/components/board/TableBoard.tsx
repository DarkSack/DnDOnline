import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { BrickWall, Eye, EyeOff } from "lucide-react";
import {
  DEFAULT_CELL_SIZE,
  type BoardEntity,
  type CreatureTemplate,
  type EntitySize,
  type GridConfig,
  type GridPos,
} from "@dndonline/engine/board";
import { Button } from "@/components/ui/button";
import { listCampaignCharacters, type CharacterSummary } from "@/services/characters";
import { listScenes, type SceneSummary } from "@/services/scenes";
import { labelOf, useI18n } from "@/services/i18n";
import type { BoardView, Table, TokenView } from "@/realtime/use-table";
import { BoardCanvas } from "./BoardCanvas";
import { CreatureCatalog } from "./CreatureCatalog";
import { TokenActionsPanel } from "./TokenActionsPanel";

type Mode = "none" | "fog" | "walls";

const toEntity = (t: TokenView): BoardEntity => ({
  id: t.id,
  kind: t.kind,
  name: t.name,
  pos: { col: t.col, row: t.row },
  size: Math.min(4, Math.max(1, t.size)) as EntitySize,
  color: t.color ?? undefined,
  hp: t.hp ?? undefined,
  hpMax: t.hpMax ?? undefined,
  visible: t.visible,
  characterId: t.characterId ?? undefined,
});

/**
 * Tablero de la mesa. El servidor decide qué ve cada uno y valida cada cambio;
 * aquí solo se pinta lo recibido y se mandan las órdenes por el socket de la mesa.
 */
export function TableBoard({ table, campaignId }: { table: Table; campaignId: string }) {
  const { t } = useI18n();
  const { board, send, errors } = table;
  const [mode, setMode] = useState<Mode>("none");
  const [armed, setArmed] = useState<CreatureTemplate | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scenes, setScenes] = useState<SceneSummary[]>([]);
  const [pcs, setPcs] = useState<CharacterSummary[]>([]);
  // Posición arrastrada hasta que el servidor conteste con un tablero nuevo o con un error.
  const [drag, setDrag] = useState<{ board: BoardView | null; errors: number; pos: Map<string, GridPos> }>(() => ({
    board,
    errors,
    pos: new Map(),
  }));
  const pending = drag.board === board && drag.errors === errors ? drag.pos : null;

  const manage = board?.manage ?? false;
  const scene = board?.scene ?? null;

  useEffect(() => {
    if (!manage) return;
    listScenes(campaignId).then(setScenes, () => setScenes([]));
    listCampaignCharacters(campaignId).then(setPcs, () => setPcs([]));
  }, [manage, campaignId]);

  const grid: GridConfig = useMemo(
    () => (scene ? { cellSize: scene.cellSize, cols: scene.cols, rows: scene.rows } : { cellSize: DEFAULT_CELL_SIZE, cols: 30, rows: 30 }),
    [scene],
  );
  const byId = useMemo(() => new Map((board?.tokens ?? []).map((tk) => [tk.id, tk])), [board]);
  const entities = useMemo(
    () =>
      (board?.tokens ?? []).map((tk) => {
        const e = toEntity(tk);
        const p = pending?.get(tk.id);
        return p ? { ...e, pos: p } : e;
      }),
    [board, pending],
  );
  const fog = useMemo(() => new Set(scene?.fog ?? []), [scene]);
  const walls = useMemo(() => new Set(scene?.walls ?? []), [scene]);
  const mask = useMemo(() => (board?.mask ? new Set(board.mask) : null), [board]);
  const selected = selectedId ? (byId.get(selectedId) ?? null) : null;

  if (!board) return <p className="text-sm text-muted-foreground">{t("table.connecting")}</p>;

  const toggleMode = (m: Mode) => {
    setMode((cur) => (cur === m ? "none" : m));
    setArmed(null);
  };
  const arm = (tpl: CreatureTemplate | null) => {
    setArmed(tpl);
    if (tpl) setMode("none");
  };
  const paint = (layer: "fog" | "walls") => (pos: GridPos, on: boolean) =>
    send({ type: "scene.paint", layer, cells: [`${pos.col},${pos.row}`], on });

  const onDragMove = (id: string, pos: GridPos) =>
    setDrag((prev) => {
      const next = new Map(prev.board === board && prev.errors === errors ? prev.pos : []);
      next.set(id, pos);
      return { board, errors, pos: next };
    });
  const onDragEnd = (id: string, pos: GridPos) => {
    const tk = byId.get(id);
    if (tk && (tk.col !== pos.col || tk.row !== pos.row)) send({ type: "token.update", tokenId: id, col: pos.col, row: pos.row });
  };

  const sceneSelect = (
    <label className="flex items-center gap-2">
      <span className="font-medium text-muted-foreground">{t("board.scene")}</span>
      <select
        value={scene?.id ?? ""}
        onChange={(e) => send({ type: "scene.activate", sceneId: e.target.value || null })}
        className="rounded-md border border-border px-2 py-1 text-xs"
      >
        <option value="">{t("board.noScene")}</option>
        {scenes.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} ({s.cols}×{s.rows})
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="flex flex-col gap-3">
      {manage && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-background/40 px-3 py-2 text-xs">
          {sceneSelect}
          {scene && (
            <>
              <span className="mx-1 text-muted-foreground">·</span>
              <Button type="button" size="sm" variant={mode === "fog" ? "default" : "outline"} onClick={() => toggleMode("fog")}>
                {mode === "fog" ? <EyeOff className="mr-1 size-3.5" /> : <Eye className="mr-1 size-3.5" />}
                {t("board.fog")}
              </Button>
              {fog.size > 0 && (
                <Button type="button" size="sm" variant="ghost" onClick={() => send({ type: "scene.clear", layer: "fog" })}>
                  {t("board.clear")} ({fog.size})
                </Button>
              )}
              <Button type="button" size="sm" variant={mode === "walls" ? "default" : "outline"} onClick={() => toggleMode("walls")}>
                <BrickWall className="mr-1 size-3.5" />
                {t("board.walls")}
              </Button>
              {walls.size > 0 && (
                <Button type="button" size="sm" variant="ghost" onClick={() => send({ type: "scene.clear", layer: "walls" })}>
                  {t("board.clear")} ({walls.size})
                </Button>
              )}
            </>
          )}
        </div>
      )}

      {!scene ? (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {manage ? (
            <>
              {t("board.emptyDm")}{" "}
              <Link to={`/campaigns/${campaignId}`} className="text-primary hover:underline">
                {t("board.scenes")}
              </Link>
            </>
          ) : (
            t("board.empty")
          )}
        </p>
      ) : (
        <div className="relative h-[50svh] min-h-[320px] sm:h-[520px]">
          <BoardCanvas
            grid={grid}
            entities={entities}
            selectedId={selectedId}
            onSelectChange={setSelectedId}
            canMove={(e) => byId.get(e.id)?.canMove ?? false}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
            spawnMode={!!armed}
            onSpawnAt={(pos) => {
              if (!armed) return;
              send({ type: "token.create", kind: armed.kind, name: labelOf(t, "creature", armed.slug), size: armed.size, hp: armed.hp, color: armed.color, col: pos.col, row: pos.row });
              setArmed(null);
            }}
            backgroundUrl={scene.imageUrl}
            fog={fog}
            fogTranslucent={manage}
            fogPaintMode={mode === "fog"}
            onFogPaint={paint("fog")}
            walls={walls}
            wallPaintMode={mode === "walls"}
            onWallPaint={paint("walls")}
            visibilityMask={mask}
          />
          {selected && (
            <TokenActionsPanel
              entity={toEntity(selected)}
              canControl={selected.canMove}
              isDm={manage}
              onHpDelta={(delta) => {
                if (selected.hp === null || selected.hpMax === null) return;
                const hp = Math.max(0, Math.min(selected.hpMax, selected.hp + delta));
                if (hp !== selected.hp) send({ type: "token.update", tokenId: selected.id, hp });
              }}
              onToggleVisibility={() => send({ type: "token.update", tokenId: selected.id, visible: !selected.visible })}
              onDuplicate={() =>
                send({
                  type: "token.create",
                  kind: selected.kind,
                  name: selected.name,
                  size: selected.size,
                  hp: selected.hp ?? undefined,
                  hpMax: selected.hpMax ?? undefined,
                  color: selected.color ?? undefined,
                  col: Math.min(selected.col + selected.size, scene.cols - 1),
                  row: selected.row,
                })
              }
              onDelete={() => {
                send({ type: "token.delete", tokenId: selected.id });
                setSelectedId(null);
              }}
              onClose={() => setSelectedId(null)}
            />
          )}
        </div>
      )}

      {manage && scene && (
        <CreatureCatalog
          armed={armed}
          onArm={arm}
          pcs={pcs}
          onSpawnPc={(pc) =>
            send({ type: "token.create", kind: "pc", name: pc.name, characterId: pc.id, hp: pc.hp, hpMax: pc.hpMax, col: 0, row: 0 })
          }
        />
      )}
    </div>
  );
}
