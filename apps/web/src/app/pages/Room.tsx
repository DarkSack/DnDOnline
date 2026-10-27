import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/services/use-auth";
import {
  getRoom,
  leaveRoom,
  setMemberCharacter,
  type RoomWithCampaign,
} from "@/services/rooms";
import { listMyCharacters, type Character } from "@/services/characters";
import { useRoomChannel } from "@/realtime/use-room-channel";
import {
  useRoomPresence,
  type PresencePayload,
} from "@/realtime/use-room-presence";
import { useLiveRoomMembers } from "@/realtime/use-live-room-members";
import { Board } from "@/app/components/board/Board";
import { DicePanel } from "@/app/components/dice/DicePanel";
import { CombatTracker } from "@/app/components/combat/CombatTracker";
import { RoomHeader } from "@/app/components/room/RoomHeader";
import { MyCharacterCard } from "@/app/components/room/MyCharacterCard";
import { MembersCard } from "@/app/components/room/MembersCard";
import { ChatPanel } from "@/app/components/chat/ChatPanel";

export default function RoomPage() {
  const { id: roomId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [room, setRoom] = useState<RoomWithCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [myCharacters, setMyCharacters] = useState<Character[]>([]);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (!roomId) return;
    let alive = true;
    (async () => {
      try {
        const r = await getRoom(roomId);
        if (!alive) return;
        if (!r) {
          setNotFound(true);
          return;
        }
        setRoom(r);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [roomId]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    listMyCharacters(user.id)
      .then((cs) => {
        if (alive) setMyCharacters(cs);
      })
      .catch(() => {
        /* silencioso — no bloquea la sala */
      });
    return () => {
      alive = false;
    };
  }, [user]);

  const { channel, status } = useRoomChannel(room ? roomId : undefined);
  const { members } = useLiveRoomMembers(room ? roomId : undefined);

  const me = useMemo<PresencePayload | null>(() => {
    if (!user) return null;
    return {
      user_id: user.id,
      username: user.email?.split("@")[0] ?? null,
      online_at: new Date().toISOString(),
    };
  }, [user]);

  const presence = useRoomPresence(channel, me);
  const presentIds = useMemo(
    () => new Set(presence.map((p) => p.user_id)),
    [presence],
  );

  const myMember = useMemo(
    () => members.find((m) => m.user_id === user?.id) ?? null,
    [members, user?.id],
  );

  const onLeave = async () => {
    if (!roomId || !user) return;
    await leaveRoom(roomId, user.id);
    navigate("/dashboard");
  };

  const onAssignCharacter = async (characterId: string) => {
    if (!roomId || !user) return;
    setAssigning(true);
    try {
      await setMemberCharacter(
        roomId,
        user.id,
        characterId === "" ? null : characterId,
      );
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return <p className="p-6 text-sm text-muted-foreground">Cargando…</p>;
  }
  if (notFound || !room) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">
          Sala no encontrada o sin acceso.
        </p>
        <Link
          to="/dashboard"
          className="mt-2 inline-block text-xs text-primary hover:underline"
        >
          ← Volver al dashboard
        </Link>
      </div>
    );
  }

  const isDm = room.campaigns?.dm_id === user?.id;
  const iAmPlayer = myMember?.role === "player";

  return (
    <div className="mx-auto flex min-h-svh max-w-4xl flex-col gap-4 p-4 sm:gap-6 sm:p-6">
      <RoomHeader
        room={room}
        status={status}
        isDm={isDm}
        onLeave={onLeave}
      />

      {iAmPlayer && (
        <MyCharacterCard
          myMember={myMember}
          myCharacters={myCharacters}
          assigning={assigning}
          onAssign={onAssignCharacter}
        />
      )}

      <MembersCard
        members={members}
        presentIds={presentIds}
        connectedCount={presence.length}
        myUserId={user?.id}
      />

      <Card>
        <CardHeader>
          <CardTitle>Combate</CardTitle>
        </CardHeader>
        <CardContent>
          <CombatTracker roomId={room.id} isDm={isDm} />
        </CardContent>
      </Card>

      <Card className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-6">
          <h2 className="font-heading text-base font-medium">Tablero</h2>
          <span className="hidden text-[10px] text-muted-foreground sm:block">
            Arrastra para mover · rueda para zoom
          </span>
        </div>
        <div className="p-2 sm:p-3">
          <Board
            room={room}
            channel={channel}
            isDm={isDm}
            userId={user?.id}
            members={members}
          />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dados</CardTitle>
        </CardHeader>
        <CardContent>
          <DicePanel roomId={room.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Chat</CardTitle>
        </CardHeader>
        <CardContent>
          <ChatPanel roomId={room.id} userId={user?.id} />
        </CardContent>
      </Card>
    </div>
  );
}
