import type { RealtimeChannel } from "@supabase/supabase-js";
import { BrickWall, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RoomMemberWithProfile, RoomWithCampaign } from "@/services/rooms";
import { BoardCanvas } from "./BoardCanvas";
import { CreatureCatalog } from "./CreatureCatalog";
import { MapPicker } from "./MapPicker";
import { TokenActionsPanel } from "./TokenActionsPanel";
import { useBoardState } from "./use-board-state";

export type BoardProps = {
  room: RoomWithCampaign;
  channel: RealtimeChannel | null;
  isDm: boolean;
  userId: string | undefined;
  members: RoomMemberWithProfile[];
  className?: string;
};

export function Board({
  room,
  channel,
  isDm,
  userId,
  members,
  className,
}: BoardProps) {
  const state = useBoardState({ room, channel, isDm, userId, members });

  return (
    <div className={`flex flex-col gap-3 ${className ?? ""}`}>
      {isDm && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-background/40 px-3 py-2 text-xs">
          <span className="font-medium text-muted-foreground">Mapa:</span>
          <MapPicker
            campaignId={state.room.campaign_id}
            activeMapId={state.room.active_map_id ?? null}
            onChange={state.onChangeMap}
          />
          <span className="mx-1 text-muted-foreground">·</span>
          <Button
            type="button"
            size="sm"
            variant={state.fogPaintMode ? "default" : "outline"}
            onClick={() => state.setFogPaintMode(!state.fogPaintMode)}
          >
            {state.fogPaintMode ? (
              <EyeOff className="mr-1 size-3.5" />
            ) : (
              <Eye className="mr-1 size-3.5" />
            )}
            {state.fogPaintMode ? "Saliendo…" : "Niebla"}
          </Button>
          {state.fogSet.size > 0 && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={state.clearFog}
            >
              Limpiar niebla ({state.fogSet.size})
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant={state.wallPaintMode ? "default" : "outline"}
            onClick={() => state.setWallPaintMode(!state.wallPaintMode)}
          >
            <BrickWall className="mr-1 size-3.5" />
            {state.wallPaintMode ? "Saliendo…" : "Paredes"}
          </Button>
          {state.wallsSet.size > 0 && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={state.clearWalls}
            >
              Limpiar paredes ({state.wallsSet.size})
            </Button>
          )}
        </div>
      )}

      <div className="relative h-[50svh] min-h-[320px] sm:h-[500px]">
        <BoardCanvas
          grid={state.grid}
          entities={state.entities}
          selectedId={state.selectedId}
          onSelectChange={state.setSelectedId}
          canMove={state.canControl}
          onDragMove={state.onDragMove}
          onDragEnd={state.onDragEnd}
          spawnMode={!!state.armed}
          onSpawnAt={state.onSpawnAt}
          backgroundUrl={state.activeMap?.backgroundUrl ?? null}
          fog={state.fogSet}
          fogTranslucent={isDm}
          fogPaintMode={state.fogPaintMode}
          onFogPaint={state.onFogPaint}
          walls={state.wallsSet}
          wallPaintMode={state.wallPaintMode}
          onWallPaint={state.onWallPaint}
          visibilityMask={state.visibilityMask}
        />
        {state.selectedEntity && (
          <TokenActionsPanel
            entity={state.selectedEntity}
            canControl={state.canControl(state.selectedEntity)}
            isDm={isDm}
            onHpDelta={state.onHpDelta}
            onToggleVisibility={state.onToggleVisibility}
            onDuplicate={state.onDuplicate}
            onDelete={state.onDelete}
            onClose={() => state.setSelectedId(null)}
          />
        )}
      </div>

      {isDm && (
        <CreatureCatalog
          armed={state.armed}
          onArm={state.setArmed}
          onSpawnPc={state.onSpawnPc}
          pcMembers={state.pcMembers}
        />
      )}
    </div>
  );
}
