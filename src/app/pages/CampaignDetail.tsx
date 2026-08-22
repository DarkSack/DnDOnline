import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/services/use-auth";
import { getCampaign, type Campaign } from "@/services/campaigns";
import {
  createRoom,
  listRoomsForCampaign,
  type Room,
} from "@/services/rooms";
import { MapsCard } from "@/app/components/campaign/MapsCard";

export default function CampaignDetailPage() {
  const { id: campaignId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId) return;
    let alive = true;
    (async () => {
      try {
        const c = await getCampaign(campaignId);
        if (!alive) return;
        if (!c) {
          setNotFound(true);
          return;
        }
        setCampaign(c);
        const r = await listRoomsForCampaign(campaignId);
        if (!alive) return;
        setRooms(r);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [campaignId]);

  const isDm = campaign?.dm_id === user?.id;

  const onCreateRoom = async (e: FormEvent) => {
    e.preventDefault();
    if (!campaignId || !newRoomName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      await createRoom({ campaignId, name: newRoomName.trim() });
      const fresh = await listRoomsForCampaign(campaignId);
      setNewRoomName("");
      setRooms(fresh);
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "No se pudo crear la sala",
      );
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return <p className="p-6 text-sm text-muted-foreground">Cargando…</p>;
  }
  if (notFound || !campaign) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">
          Campaña no encontrada o sin acceso.
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

  return (
    <div className="mx-auto flex min-h-svh max-w-3xl flex-col gap-4 p-4 sm:gap-6 sm:p-6">
      <Link
        to="/dashboard"
        className="text-xs text-muted-foreground hover:underline"
      >
        ← Dashboard
      </Link>

      <header>
        <h1 className="font-heading text-2xl">{campaign.name}</h1>
        {campaign.description && (
          <p className="mt-1 text-sm text-muted-foreground">
            {campaign.description}
          </p>
        )}
      </header>

      {isDm && (
        <Card>
          <CardHeader>
            <CardTitle>Nueva sala</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={onCreateRoom}
              className="flex flex-col gap-2 sm:flex-row"
            >
              <input
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="Nombre de la sala"
                className="flex-1 rounded-md border border-border bg-input/30 px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
              />
              <Button
                type="submit"
                disabled={creating || !newRoomName.trim()}
              >
                {creating ? "Creando…" : "Crear sala"}
              </Button>
            </form>
            {createError && (
              <p className="mt-2 text-xs text-destructive">{createError}</p>
            )}
          </CardContent>
        </Card>
      )}

      <MapsCard campaignId={campaign.id} canEdit={isDm} />

      <Card>
        <CardHeader>
          <CardTitle>Salas</CardTitle>
        </CardHeader>
        <CardContent>
          {rooms.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no hay salas en esta campaña.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {rooms.map((r) => (
                <li key={r.id}>
                  <Link
                    to={`/rooms/${r.id}`}
                    className="flex items-center justify-between rounded-md border border-border bg-input/20 px-3 py-2 text-sm hover:bg-input/40"
                  >
                    <span className="font-medium">{r.name}</span>
                    {isDm && (
                      <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs tracking-widest text-muted-foreground">
                        {r.join_code}
                      </span>
                    )}
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
