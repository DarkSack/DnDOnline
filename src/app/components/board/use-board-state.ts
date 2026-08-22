import type { RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  computeVisibleCells,
  DEFAULT_CELL_SIZE,
  type BoardEntity,
  type CreatureTemplate,
  type GridConfig,
  type GridPos,
} from "@/engine/board";
import {
  createEntity,
  deleteEntity,
  updateEntity,
  updateEntityPosition,
} from "@/services/entities";
import { getMap, type CampaignMap } from "@/services/maps";
import {
  setActiveMap,
  setFog,
  setWalls,
  type RoomMemberWithProfile,
  type RoomWithCampaign,
} from "@/services/rooms";
import { useEntityBroadcast } from "@/realtime/use-entity-broadcast";
import { useLiveEntities } from "@/realtime/use-live-entities";
import { useLiveRoom } from "@/realtime/use-live-room";

export type UseBoardStateInput = {
  room: RoomWithCampaign;
  channel: RealtimeChannel | null;
  isDm: boolean;
  userId: string | undefined;
  members: RoomMemberWithProfile[];
};

const DEFAULT_GRID: GridConfig = {
  cellSize: DEFAULT_CELL_SIZE,
  cols: 30,
  rows: 30,
};

function stringArrayFromJsonb(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string");
}

/**
 * Toda la lógica del tablero — realtime, autoridad, permisos, spawn,
 * fog, mapa activo. El componente Board queda como layout puro.
 */
export function useBoardState({
  room: initialRoom,
  channel,
  isDm,
  userId,
  members,
}: UseBoardStateInput) {
  const { room: liveRoom } = useLiveRoom(initialRoom.id);
  const room = liveRoom ?? initialRoom;

  const { entities: authoritative } = useLiveEntities(room.id);
  const { transient, broadcastMove, broadcastEnd } = useEntityBroadcast(
    channel,
    userId,
  );

  const [myDragPos, setMyDragPos] = useState<Map<string, GridPos>>(
    () => new Map(),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [armed, setArmed] = useState<CreatureTemplate | null>(null);
  const [fogPaintMode, setFogPaintModeRaw] = useState(false);
  const [wallPaintMode, setWallPaintModeRaw] = useState(false);
  const [loadedMap, setLoadedMap] = useState<CampaignMap | null>(null);

  // Los tres modos (fog, wall, spawn) son mutuamente exclusivos.
  const setFogPaintMode = useCallback((v: boolean) => {
    setFogPaintModeRaw(v);
    if (v) {
      setWallPaintModeRaw(false);
      setArmed(null);
    }
  }, []);
  const setWallPaintMode = useCallback((v: boolean) => {
    setWallPaintModeRaw(v);
    if (v) {
      setFogPaintModeRaw(false);
      setArmed(null);
    }
  }, []);

  useEffect(() => {
    const id = room.active_map_id;
    if (!id) return;
    let alive = true;
    getMap(id)
      .then((m) => {
        if (alive && m) setLoadedMap(m);
      })
      .catch(() => {
        // silencioso — el fondo simplemente no aparece.
      });
    return () => {
      alive = false;
    };
  }, [room.active_map_id]);

  // Solo usar mapa si su id corresponde al active actual (evita el reset
  // sincrónico y maneja bien la carrera durante cambios de mapa).
  const activeMap =
    loadedMap && loadedMap.id === room.active_map_id ? loadedMap : null;

  const grid: GridConfig = useMemo(() => {
    if (activeMap) {
      return {
        cellSize: activeMap.cell_size,
        cols: activeMap.cols,
        rows: activeMap.rows,
      };
    }
    return DEFAULT_GRID;
  }, [activeMap]);

  const fogSet = useMemo(() => new Set(stringArrayFromJsonb(room.fog)), [room]);
  const wallsSet = useMemo(
    () => new Set(stringArrayFromJsonb(room.walls)),
    [room],
  );

  // Fuentes de LOS: entidades PC visibles. Nota: usamos authoritative para
  // que el DM cambie su HP sin afectar la visibilidad; y coordenadas actuales,
  // no las transitorias del drag (evita "linterna" saltarina).
  const losSources = useMemo(() => {
    return authoritative
      .filter((e) => e.kind === "pc" && e.visible)
      .map((e) => e.pos);
  }, [authoritative]);

  const visibilityMask = useMemo(() => {
    // El DM ve todo, sin máscara.
    if (isDm) return null;
    // Sin paredes, no aplicamos máscara (todo visible).
    if (wallsSet.size === 0) return null;
    // Sin PCs vivos, los players no ven nada (excepto el tablero base).
    return computeVisibleCells(losSources, wallsSet, grid);
  }, [isDm, wallsSet, losSources, grid]);

  const myCharacterIds = useMemo(() => {
    const set = new Set<string>();
    members.forEach((m) => {
      if (m.user_id === userId && m.character_id) set.add(m.character_id);
    });
    return set;
  }, [members, userId]);

  // Filtro de visibilidad: non-DM no ven ocultas, ni en niebla, ni fuera
  // de la máscara LOS.
  const visible = useMemo(() => {
    if (isDm) return authoritative;
    return authoritative.filter((e) => {
      if (!e.visible) return false;
      const key = `${e.pos.col},${e.pos.row}`;
      if (fogSet.has(key)) return false;
      if (visibilityMask && !visibilityMask.has(key)) return false;
      return true;
    });
  }, [authoritative, isDm, fogSet, visibilityMask]);

  // Fusión: myDragPos > transient > authoritative.
  const entities = useMemo(() => {
    if (myDragPos.size === 0 && transient.size === 0) return visible;
    return visible.map((e) => {
      const own = myDragPos.get(e.id);
      if (own) return { ...e, pos: own };
      const t = transient.get(e.id);
      if (t) return { ...e, pos: t };
      return e;
    });
  }, [visible, myDragPos, transient]);

  const selectedEntity = useMemo(
    () => entities.find((e) => e.id === selectedId) ?? null,
    [entities, selectedId],
  );

  const canControl = useCallback(
    (e: BoardEntity) => {
      if (isDm) return true;
      if (!e.characterId) return false;
      return myCharacterIds.has(e.characterId);
    },
    [isDm, myCharacterIds],
  );

  const onDragMove = useCallback(
    (id: string, pos: GridPos) => {
      setMyDragPos((prev) => {
        const cur = prev.get(id);
        if (cur && cur.col === pos.col && cur.row === pos.row) return prev;
        const next = new Map(prev);
        next.set(id, pos);
        return next;
      });
      broadcastMove(id, pos);
    },
    [broadcastMove],
  );

  const onDragEnd = useCallback(
    async (id: string, pos: GridPos) => {
      broadcastEnd(id);
      try {
        await updateEntityPosition(id, pos);
      } catch (err) {
        console.error("No se pudo persistir el movimiento", err);
      } finally {
        setMyDragPos((prev) => {
          if (!prev.has(id)) return prev;
          const next = new Map(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [broadcastEnd],
  );

  const onSpawnAt = useCallback(
    async (pos: GridPos) => {
      if (!armed) return;
      try {
        await createEntity({
          roomId: room.id,
          kind: armed.kind,
          name: armed.name,
          size: armed.size,
          hp: armed.hp,
          hpMax: armed.hp,
          color: armed.color,
          pos,
        });
      } catch (err) {
        console.error("No se pudo spawnear la entidad", err);
      } finally {
        setArmed(null);
      }
    },
    [armed, room.id],
  );

  const onSpawnPc = useCallback(
    async (member: RoomMemberWithProfile) => {
      if (!member.characters) return;
      try {
        await createEntity({
          roomId: room.id,
          kind: "pc",
          name: member.characters.name,
          characterId: member.characters.id,
          size: 1,
          pos: { col: 0, row: 0 },
        });
      } catch (err) {
        console.error("No se pudo spawnear el PC", err);
      }
    },
    [room.id],
  );

  const onHpDelta = useCallback(
    async (delta: number) => {
      if (!selectedEntity) return;
      if (
        selectedEntity.hp === undefined ||
        selectedEntity.hpMax === undefined
      )
        return;
      const nextHp = Math.max(
        0,
        Math.min(selectedEntity.hpMax, selectedEntity.hp + delta),
      );
      if (nextHp === selectedEntity.hp) return;
      try {
        await updateEntity(selectedEntity.id, { hp: nextHp });
      } catch (err) {
        console.error("No se pudo actualizar HP", err);
      }
    },
    [selectedEntity],
  );

  const onToggleVisibility = useCallback(async () => {
    if (!selectedEntity || !isDm) return;
    try {
      await updateEntity(selectedEntity.id, {
        visible: !selectedEntity.visible,
      });
    } catch (err) {
      console.error("No se pudo cambiar visibilidad", err);
    }
  }, [selectedEntity, isDm]);

  const onDuplicate = useCallback(async () => {
    if (!selectedEntity || !isDm) return;
    try {
      await createEntity({
        roomId: room.id,
        kind: selectedEntity.kind,
        name: selectedEntity.name,
        size: selectedEntity.size,
        hp: selectedEntity.hp,
        hpMax: selectedEntity.hpMax,
        color: selectedEntity.color,
        pos: {
          col: selectedEntity.pos.col + selectedEntity.size,
          row: selectedEntity.pos.row,
        },
      });
    } catch (err) {
      console.error("No se pudo duplicar", err);
    }
  }, [selectedEntity, isDm, room.id]);

  const onDelete = useCallback(async () => {
    if (!selectedEntity || !isDm) return;
    try {
      await deleteEntity(selectedEntity.id);
      setSelectedId(null);
    } catch (err) {
      console.error("No se pudo eliminar", err);
    }
  }, [selectedEntity, isDm]);

  const onChangeMap = useCallback(
    async (mapId: string | null) => {
      if (!isDm) return;
      try {
        await setActiveMap(room.id, mapId);
      } catch (err) {
        console.error("No se pudo cambiar mapa", err);
      }
    },
    [isDm, room.id],
  );

  const onFogPaint = useCallback(
    async (pos: GridPos, hide: boolean) => {
      if (!isDm) return;
      const key = `${pos.col},${pos.row}`;
      const current = stringArrayFromJsonb(room.fog);
      const set = new Set(current);
      if (hide) set.add(key);
      else set.delete(key);
      try {
        await setFog(room.id, Array.from(set));
      } catch (err) {
        console.error("No se pudo pintar niebla", err);
      }
    },
    [isDm, room],
  );

  const clearFog = useCallback(async () => {
    if (!isDm) return;
    try {
      await setFog(room.id, []);
    } catch (err) {
      console.error("No se pudo limpiar niebla", err);
    }
  }, [isDm, room.id]);

  const onWallPaint = useCallback(
    async (pos: GridPos, add: boolean) => {
      if (!isDm) return;
      const key = `${pos.col},${pos.row}`;
      const current = stringArrayFromJsonb(room.walls);
      const set = new Set(current);
      if (add) set.add(key);
      else set.delete(key);
      try {
        await setWalls(room.id, Array.from(set));
      } catch (err) {
        console.error("No se pudo pintar pared", err);
      }
    },
    [isDm, room],
  );

  const clearWalls = useCallback(async () => {
    if (!isDm) return;
    try {
      await setWalls(room.id, []);
    } catch (err) {
      console.error("No se pudo limpiar paredes", err);
    }
  }, [isDm, room.id]);

  const pcMembers = useMemo(
    () => members.filter((m) => m.role === "player" && m.characters),
    [members],
  );

  const setArmedExclusive = useCallback((t: CreatureTemplate | null) => {
    setArmed(t);
    if (t) {
      setFogPaintModeRaw(false);
      setWallPaintModeRaw(false);
    }
  }, []);

  return {
    room,
    grid,
    entities,
    fogSet,
    wallsSet,
    visibilityMask,
    activeMap,
    selectedId,
    setSelectedId,
    selectedEntity,
    canControl,
    armed,
    setArmed: setArmedExclusive,
    fogPaintMode,
    setFogPaintMode,
    wallPaintMode,
    setWallPaintMode,
    onDragMove,
    onDragEnd,
    onSpawnAt,
    onSpawnPc,
    onHpDelta,
    onToggleVisibility,
    onDuplicate,
    onDelete,
    onChangeMap,
    onFogPaint,
    clearFog,
    onWallPaint,
    clearWalls,
    pcMembers,
  };
}
