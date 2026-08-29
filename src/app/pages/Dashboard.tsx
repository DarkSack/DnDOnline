import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/services/use-auth";
import { listCampaignsIDm, type Campaign } from "@/services/campaigns";
import {
  joinRoomByCode,
  listRoomsWhereIPlay,
  type PlayerRoomEntry,
} from "@/services/rooms";
import { listMyCharacters, type Character } from "@/services/characters";

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [playerRooms, setPlayerRooms] = useState<PlayerRoomEntry[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      try {
        const [c, r, ch] = await Promise.all([
          listCampaignsIDm(user.id),
          listRoomsWhereIPlay(user.id),
          listMyCharacters(user.id),
        ]);
        if (!alive) return;
        setCampaigns(c);
        setPlayerRooms(r);
        setCharacters(ch);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  const onJoin = async (e: FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoining(true);
    setJoinError(null);
    try {
      const room = await joinRoomByCode(joinCode.trim().toUpperCase());
      navigate(`/rooms/${room.id}`);
    } catch (err) {
      setJoinError(
        err instanceof Error ? err.message : "No se pudo unir a la sala",
      );
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-svh max-w-4xl flex-col gap-4 p-4 sm:gap-6 sm:p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl">dndonline</h1>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>
        <Button variant="outline" size="sm" onClick={signOut}>
          Cerrar sesión
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Unirse a una sala</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onJoin} className="flex flex-col gap-2 sm:flex-row">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="CÓDIGO"
              maxLength={12}
              className="flex-1 rounded-md border border-border bg-input/30 px-3 py-2 font-mono text-sm uppercase tracking-widest text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            />
            <Button type="submit" disabled={joining || !joinCode.trim()}>
              {joining ? "Uniendo…" : "Unirme"}
            </Button>
          </form>
          {joinError && (
            <p className="mt-2 text-xs text-destructive">{joinError}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Mis personajes</CardTitle>
          <Button size="sm" asChild>
            <Link to="/characters/new">Nuevo personaje</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : characters.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no tienes personajes. Créalos para asignarlos a salas.
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {characters.map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/characters/${c.id}`}
                    className="flex items-center gap-3 rounded-md border border-border bg-input/20 p-3 hover:bg-input/40"
                  >
                    {c.sheet.identity.avatarUrl ? (
                      <img
                        src={c.sheet.identity.avatarUrl}
                        alt=""
                        className="size-10 rounded-full object-cover ring-1 ring-gold/40"
                      />
                    ) : (
                      <div className="flex size-10 items-center justify-center rounded-full bg-accent font-heading text-sm font-semibold text-accent-foreground ring-1 ring-gold/40">
                        {c.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {c.sheet.identity.race} · {c.sheet.identity.className} ·
                        Nv {c.sheet.identity.level}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Mis campañas</CardTitle>
          <Button size="sm" asChild>
            <Link to="/campaigns/new">Nueva campaña</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no tienes campañas. Crea una para empezar como DM.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {campaigns.map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/campaigns/${c.id}`}
                    className="flex items-center justify-between rounded-md border border-border bg-input/20 px-3 py-2 text-sm hover:bg-input/40"
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="text-xs text-muted-foreground">DM</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Salas donde participo</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : playerRooms.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No estás en ninguna sala como jugador todavía.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {playerRooms.map(({ room }) => (
                <li key={room.id}>
                  <Link
                    to={`/rooms/${room.id}`}
                    className="flex items-center justify-between rounded-md border border-border bg-input/20 px-3 py-2 text-sm hover:bg-input/40"
                  >
                    <span className="font-medium">{room.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {room.campaigns?.name ?? "—"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
