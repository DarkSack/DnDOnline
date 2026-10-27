import { Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { roleLabel, type RoomMemberWithProfile } from "@/services/rooms";

export type MembersCardProps = {
  members: RoomMemberWithProfile[];
  presentIds: Set<string>;
  connectedCount: number;
  myUserId: string | undefined;
};

export function MembersCard({
  members,
  presentIds,
  connectedCount,
  myUserId,
}: MembersCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Miembros ({members.length}){" "}
          <span className="text-xs font-normal text-muted-foreground">
            · {connectedCount} conectado{connectedCount === 1 ? "" : "s"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2">
          {members.map((m) => {
            const online = presentIds.has(m.user_id);
            return (
              <li
                key={m.user_id}
                className="flex items-center justify-between rounded-md border border-border bg-input/20 px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`size-2 rounded-full ${
                      online
                        ? "bg-emerald-500"
                        : "bg-muted-foreground/30"
                    }`}
                    title={online ? "Conectado" : "Desconectado"}
                  />
                  {m.profiles?.username ?? m.user_id.slice(0, 8)}
                  {m.user_id === myUserId && (
                    <span className="text-xs text-muted-foreground">
                      (tú)
                    </span>
                  )}
                  {m.characters && (
                    <Link
                      to={`/characters/${m.characters.id}`}
                      className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted/70"
                    >
                      {m.characters.name}
                    </Link>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">
                  {roleLabel(m.role)}
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
