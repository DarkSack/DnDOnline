import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  createScene,
  deleteScene,
  listScenes,
  MAX_SCENE_IMAGE,
  SCENE_IMAGE_TYPES,
  sceneImageUrl,
  uploadSceneImage,
  type SceneSummary,
} from "@/services/scenes";
import { useI18n } from "@/services/i18n";

const FIELD = "rounded-md border border-border px-2 py-1 text-sm";

/** Escenas de la campaña (solo DM y co-DM). Cuál está en la mesa se elige desde la mesa. */
export function ScenesCard({ campaignId }: { campaignId: string }) {
  const { t, tError } = useI18n();
  const [scenes, setScenes] = useState<SceneSummary[] | null>(null);
  const [form, setForm] = useState({ name: "", cols: 30, rows: 30, cellSize: 64 });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadFor = useRef<string | null>(null);

  const load = useCallback(() => listScenes(campaignId).then(setScenes, () => setScenes([])), [campaignId]);
  useEffect(() => {
    void load();
  }, [load]);

  const run = async (key: string, action: () => Promise<unknown>) => {
    setBusy(key);
    setError(null);
    try {
      await action();
      await load();
    } catch (err) {
      setError(tError((err as { code?: string }).code ?? "internal"));
    } finally {
      setBusy(null);
    }
  };

  const onCreate = (e: FormEvent) => {
    e.preventDefault();
    void run("create", async () => {
      await createScene(campaignId, { ...form, name: form.name.trim() });
      setForm((f) => ({ ...f, name: "" }));
    });
  };

  const onFile = (file: File | undefined) => {
    const id = uploadFor.current;
    if (!file || !id) return;
    // Mismos límites que el servidor, para avisar sin subir nada.
    if (!SCENE_IMAGE_TYPES.includes(file.type)) return setError(tError("invalid_image"));
    if (file.size > MAX_SCENE_IMAGE) return setError(tError("too_large"));
    void run(id, () => uploadSceneImage(id, file));
  };

  const num = (key: "cols" | "rows" | "cellSize", min: number, max: number) => (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {t(`board.${key}`)}
      <input
        type="number"
        min={min}
        max={max}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: Number(e.target.value) }))}
        className={`${FIELD} w-20`}
      />
    </label>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("board.scenes")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <form onSubmit={onCreate} className="flex flex-wrap items-end gap-2">
          <label className="flex min-w-32 flex-1 flex-col gap-1 text-xs text-muted-foreground">
            {t("board.name")}
            <input required maxLength={60} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={FIELD} />
          </label>
          {num("cols", 1, 100)}
          {num("rows", 1, 100)}
          {num("cellSize", 16, 256)}
          <Button type="submit" size="sm" disabled={busy === "create" || !form.name.trim()}>
            {t("board.create")}
          </Button>
        </form>
        <input
          ref={fileRef}
          type="file"
          accept={SCENE_IMAGE_TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
        {scenes === null ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : scenes.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("board.noScenes")}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {scenes.map((s) => {
              const url = sceneImageUrl(s);
              return (
                <li key={s.id} className="overflow-hidden rounded-md border border-border bg-input/20">
                  <div className="aspect-video bg-muted">{url && <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />}</div>
                  <div className="flex items-center justify-between gap-2 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{s.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {s.cols}×{s.rows} · {s.cellSize}px{s.active && ` · ${t("board.active")}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        disabled={busy === s.id}
                        onClick={() => {
                          uploadFor.current = s.id;
                          fileRef.current?.click();
                        }}
                        className="rounded p-1 text-muted-foreground hover:bg-input/40 hover:text-foreground disabled:opacity-40"
                        aria-label={t("board.upload")}
                        title={t("board.imageHelp")}
                      >
                        <ImagePlus className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={busy === s.id}
                        onClick={() => confirm(`${t("board.deleteConfirm")} «${s.name}»?`) && void run(s.id, () => deleteScene(s.id))}
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                        aria-label={t("board.delete")}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-[10px] text-muted-foreground">{t("board.imageHelp")}</p>
      </CardContent>
    </Card>
  );
}
