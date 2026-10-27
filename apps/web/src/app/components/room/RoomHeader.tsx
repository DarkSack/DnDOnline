import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import type { RoomWithCampaign } from "@/services/rooms";
import type { useRoomChannel } from "@/realtime/use-room-channel";
import { ConnectionPill } from "./ConnectionPill";

export type RoomHeaderProps = {
  room: RoomWithCampaign;
  status: ReturnType<typeof useRoomChannel>["status"];
  isDm: boolean;
  onLeave: () => void;
};

export function RoomHeader({
  room,
  status,
  isDm,
  onLeave,
}: RoomHeaderProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <Link
          to={
            room.campaigns ? `/campaigns/${room.campaigns.id}` : "/dashboard"
          }
          className="text-xs text-muted-foreground hover:underline"
        >
          ← {room.campaigns?.name ?? "Dashboard"}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2 sm:gap-3">
          <h1 className="font-heading text-xl sm:text-2xl truncate">
            {room.name}
          </h1>
          <ConnectionPill status={status} />
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        {isDm ? (
          <span className="rounded bg-muted px-3 py-1 font-mono text-sm tracking-widest text-muted-foreground">
            {room.join_code}
          </span>
        ) : (
          <Button variant="outline" size="sm" onClick={onLeave}>
            Salir de la sala
          </Button>
        )}
      </div>
    </header>
  );
}
