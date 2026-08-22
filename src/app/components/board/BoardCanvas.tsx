import { Application, extend } from "@pixi/react";
import {
  Container,
  Graphics,
  Rectangle,
  Sprite,
  Text,
  type FederatedPointerEvent,
} from "pixi.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  clampScale,
  DEFAULT_CELL_SIZE,
  DEFAULT_VIEWPORT,
  gridToWorld,
  screenToWorld,
  worldToGrid,
  zoomAt,
  type BoardEntity,
  type GridConfig,
  type GridPos,
  type Viewport,
} from "@/engine/board";
import { GridLayer } from "./GridLayer";
import { EntitiesLayer } from "./EntitiesLayer";
import { BackgroundLayer } from "./BackgroundLayer";
import { FogLayer } from "./FogLayer";
import { WallsLayer } from "./WallsLayer";
import { VisibilityLayer } from "./VisibilityLayer";

extend({ Container, Graphics, Sprite, Text });

export type BoardCanvasProps = {
  grid?: GridConfig;
  entities: BoardEntity[];
  selectedId: string | null;
  onSelectChange: (id: string | null) => void;
  canMove?: (e: BoardEntity) => boolean;
  onDragMove?: (id: string, pos: GridPos) => void;
  onDragEnd?: (id: string, pos: GridPos) => void;
  spawnMode?: boolean;
  onSpawnAt?: (pos: GridPos) => void;
  backgroundUrl?: string | null;
  fog?: Set<string>;
  fogTranslucent?: boolean;
  fogPaintMode?: boolean;
  onFogPaint?: (pos: GridPos, hide: boolean) => void;
  walls?: Set<string>;
  wallPaintMode?: boolean;
  onWallPaint?: (pos: GridPos, add: boolean) => void;
  /** Si no es null, sombrea todas las celdas fuera del set (LOS de players). */
  visibilityMask?: Set<string> | null;
  className?: string;
};

const DEFAULT_GRID: GridConfig = {
  cellSize: DEFAULT_CELL_SIZE,
  cols: 30,
  rows: 30,
};

type PanState = {
  startScreenX: number;
  startScreenY: number;
  vpX: number;
  vpY: number;
};

type DragState = {
  entityId: string;
  offsetX: number;
  offsetY: number;
  lastCol: number;
  lastRow: number;
};

const EMPTY = new Set<string>();

export function BoardCanvas({
  grid = DEFAULT_GRID,
  entities,
  selectedId,
  onSelectChange,
  canMove,
  onDragMove,
  onDragEnd,
  spawnMode = false,
  onSpawnAt,
  backgroundUrl = null,
  fog = EMPTY,
  fogTranslucent = false,
  fogPaintMode = false,
  onFogPaint,
  walls = EMPTY,
  wallPaintMode = false,
  onWallPaint,
  visibilityMask = null,
  className,
}: BoardCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  const [viewport, setViewport] = useState<Viewport>(DEFAULT_VIEWPORT);
  const [ready, setReady] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const panRef = useRef<PanState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const viewportRef = useRef(viewport);
  useEffect(() => {
    viewportRef.current = viewport;
  });

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setCanvasSize({ w: width, h: height });
      if (width > 0 && height > 0) setReady(true);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const screenPoint = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      setViewport((vp) => {
        const factor = Math.exp(-e.deltaY * 0.0015);
        const newScale = clampScale(vp.scale * factor);
        return zoomAt(vp, screenPoint, newScale);
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const stageHitArea = useMemo(
    () => new Rectangle(0, 0, canvasSize.w, canvasSize.h),
    [canvasSize.w, canvasSize.h],
  );

  const onStagePointerDown = useCallback(
    (e: FederatedPointerEvent) => {
      const world = screenToWorld(
        { x: e.global.x, y: e.global.y },
        viewportRef.current,
      );
      const pos = worldToGrid(world, grid);
      const key = `${pos.col},${pos.row}`;

      if (wallPaintMode && onWallPaint) {
        onWallPaint(pos, !walls.has(key));
        return;
      }
      if (fogPaintMode && onFogPaint) {
        onFogPaint(pos, !fog.has(key));
        return;
      }
      if (spawnMode && onSpawnAt) {
        onSpawnAt(pos);
        return;
      }
      onSelectChange(null);
      panRef.current = {
        startScreenX: e.global.x,
        startScreenY: e.global.y,
        vpX: viewportRef.current.x,
        vpY: viewportRef.current.y,
      };
    },
    [
      grid,
      wallPaintMode,
      onWallPaint,
      walls,
      fogPaintMode,
      onFogPaint,
      fog,
      spawnMode,
      onSpawnAt,
      onSelectChange,
    ],
  );

  const onStageGlobalPointerMove = useCallback(
    (e: FederatedPointerEvent) => {
      const drag = dragRef.current;
      if (drag) {
        const world = screenToWorld(
          { x: e.global.x, y: e.global.y },
          viewportRef.current,
        );
        const worldCorner = {
          x: world.x - drag.offsetX,
          y: world.y - drag.offsetY,
        };
        const pos = worldToGrid(worldCorner, grid);
        if (pos.col === drag.lastCol && pos.row === drag.lastRow) return;
        drag.lastCol = pos.col;
        drag.lastRow = pos.row;
        onDragMove?.(drag.entityId, pos);
        return;
      }
      const pan = panRef.current;
      if (pan) {
        const dx = e.global.x - pan.startScreenX;
        const dy = e.global.y - pan.startScreenY;
        setViewport((vp) => ({ ...vp, x: pan.vpX + dx, y: pan.vpY + dy }));
      }
    },
    [grid, onDragMove],
  );

  const endInteraction = useCallback(() => {
    const drag = dragRef.current;
    if (drag) {
      onDragEnd?.(drag.entityId, { col: drag.lastCol, row: drag.lastRow });
    }
    dragRef.current = null;
    panRef.current = null;
    setDraggingId(null);
  }, [onDragEnd]);

  const onTokenPointerDown = useCallback(
    (entity: BoardEntity, e: FederatedPointerEvent) => {
      if (fogPaintMode || spawnMode || wallPaintMode) return;
      e.stopPropagation();
      onSelectChange(entity.id);
      if (!canMove || !canMove(entity)) return;
      const world = screenToWorld(
        { x: e.global.x, y: e.global.y },
        viewportRef.current,
      );
      const entityCorner = gridToWorld(entity.pos, grid);
      dragRef.current = {
        entityId: entity.id,
        offsetX: world.x - entityCorner.x,
        offsetY: world.y - entityCorner.y,
        lastCol: entity.pos.col,
        lastRow: entity.pos.row,
      };
      setDraggingId(entity.id);
    },
    [canMove, grid, onSelectChange, spawnMode, fogPaintMode, wallPaintMode],
  );

  const resetView = useCallback(() => setViewport(DEFAULT_VIEWPORT), []);

  const cursorClass = wallPaintMode
    ? "cursor-cell"
    : fogPaintMode
      ? "cursor-cell"
      : spawnMode
        ? "cursor-crosshair"
        : "";
  const pixiCursor = wallPaintMode
    ? "cell"
    : fogPaintMode
      ? "cell"
      : spawnMode
        ? "crosshair"
        : "grab";

  return (
    <div
      ref={wrapperRef}
      className={`relative h-full w-full touch-none select-none overflow-hidden rounded-md border border-border bg-muted/20 ${cursorClass} ${
        className ?? ""
      }`}
    >
      {ready && (
        <Application
          resizeTo={wrapperRef}
          antialias
          backgroundAlpha={0}
          autoDensity
          resolution={window.devicePixelRatio || 1}
        >
          <pixiContainer
            eventMode="static"
            hitArea={stageHitArea}
            cursor={pixiCursor}
            onPointerDown={onStagePointerDown}
            onGlobalPointerMove={onStageGlobalPointerMove}
            onPointerUp={endInteraction}
            onPointerUpOutside={endInteraction}
          >
            <pixiContainer
              x={viewport.x}
              y={viewport.y}
              scale={viewport.scale}
            >
              <BackgroundLayer url={backgroundUrl} grid={grid} />
              <GridLayer
                grid={grid}
                viewport={viewport}
                canvasSize={canvasSize}
              />
              <WallsLayer grid={grid} walls={walls} />
              <EntitiesLayer
                entities={entities}
                grid={grid}
                selectedId={selectedId}
                draggingId={draggingId}
                onTokenPointerDown={onTokenPointerDown}
              />
              {visibilityMask && (
                <VisibilityLayer grid={grid} visible={visibilityMask} />
              )}
              <FogLayer
                grid={grid}
                fog={fog}
                translucent={fogTranslucent}
              />
            </pixiContainer>
          </pixiContainer>
        </Application>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-between px-3 text-[10px] text-muted-foreground">
        <span className="pointer-events-auto rounded bg-background/70 px-2 py-0.5 font-mono backdrop-blur">
          {Math.round(viewport.scale * 100)}%
        </span>
        <button
          type="button"
          onClick={resetView}
          className="pointer-events-auto rounded bg-background/70 px-2 py-0.5 backdrop-blur hover:bg-background"
        >
          Reset vista
        </button>
      </div>
    </div>
  );
}
