import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Trash2, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  createMapFromFile,
  deleteMap,
  listMaps,
  type CampaignMap,
} from "@/services/maps";

export type MapsCardProps = {
  campaignId: string;
  canEdit: boolean;
};

export function MapsCard({ campaignId, canEdit }: MapsCardProps) {
  const [maps, setMaps] = useState<CampaignMap[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    listMaps(campaignId)
      .then((m) => {
        if (alive) setMaps(m);
      })
      .catch((e) =>
        alive
          ? setError(e instanceof Error ? e.message : "No se pudo cargar")
          : null,
      );
    return () => {
      alive = false;
    };
  }, [campaignId]);

  const onUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const created = await createMapFromFile({
        campaignId,
        name: file.name.replace(/\.[^.]+$/, ""),
        file,
      });
      setMaps((prev) => [created, ...(prev ?? [])]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir el mapa");
    } finally {
      setUploading(false);
    }
  };

  const onDelete = async (map: CampaignMap) => {
    if (!confirm(`¿Eliminar el mapa "${map.name}"?`)) return;
    try {
      await deleteMap(map);
      setMaps((prev) => prev?.filter((m) => m.id !== map.id) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Mapas</CardTitle>
        {canEdit && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onUpload}
            />
            <Button
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="mr-1 size-3.5" />
              {uploading ? "Subiendo…" : "Subir mapa"}
            </Button>
          </>
        )}
      </CardHeader>
      <CardContent>
        {error && <p className="mb-2 text-xs text-destructive">{error}</p>}
        {!maps ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : maps.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin mapas aún.{" "}
            {canEdit && "Sube uno para usarlo en las salas de esta campaña."}
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {maps.map((m) => (
              <li
                key={m.id}
                className="group relative overflow-hidden rounded-md border border-border bg-input/20"
              >
                <div className="aspect-video bg-muted">
                  {m.backgroundUrl && (
                    <img
                      src={m.backgroundUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{m.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {m.cols}×{m.rows} · {m.cell_size}px
                    </p>
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => onDelete(m)}
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Eliminar mapa"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
