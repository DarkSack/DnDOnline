import { Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Character } from "@/services/characters";
import type { RoomMemberWithProfile } from "@/services/rooms";

export type MyCharacterCardProps = {
  myMember: RoomMemberWithProfile | null;
  myCharacters: Character[];
  assigning: boolean;
  onAssign: (characterId: string) => void;
};

export function MyCharacterCard({
  myMember,
  myCharacters,
  assigning,
  onAssign,
}: MyCharacterCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mi personaje en esta sala</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {myCharacters.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No tienes personajes creados.{" "}
            <Link
              to="/characters/new"
              className="text-primary hover:underline"
            >
              Crea uno
            </Link>{" "}
            para asignarlo.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={myMember?.character_id ?? ""}
              disabled={assigning}
              onChange={(e) => onAssign(e.target.value)}
              className="rounded-md border border-border bg-input/30 px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <option value="">Sin asignar</option>
              {myCharacters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.sheet.identity.className} Nv{" "}
                  {c.sheet.identity.level}
                </option>
              ))}
            </select>
            {myMember?.character_id && (
              <Link
                to={`/characters/${myMember.character_id}`}
                className="text-xs text-primary hover:underline"
              >
                Ver ficha →
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
