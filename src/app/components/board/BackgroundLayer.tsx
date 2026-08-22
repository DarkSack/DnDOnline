import { Assets, Texture } from "pixi.js";
import { useEffect, useState } from "react";
import type { GridConfig } from "@/engine/board";

export type BackgroundLayerProps = {
  url: string | null;
  grid: GridConfig;
};

type LoadedTexture = { url: string; texture: Texture };

/**
 * Sprite de fondo del mapa. Se escala para cubrir cols*rows*cellSize.
 * Cuando cambia la url, ignora la textura antigua sin necesidad de
 * resetear estado sincrónicamente en el efecto (patrón "current URL
 * check" para evitar el warning de set-state-in-effect).
 */
export function BackgroundLayer({ url, grid }: BackgroundLayerProps) {
  const [loaded, setLoaded] = useState<LoadedTexture | null>(null);

  useEffect(() => {
    if (!url) return;
    let alive = true;
    Assets.load(url)
      .then((texture: Texture) => {
        if (alive) setLoaded({ url, texture });
      })
      .catch(() => {
        // silencioso — el mapa simplemente no se pintará.
      });
    return () => {
      alive = false;
    };
  }, [url]);

  // Solo usamos la textura si corresponde a la url actual.
  const texture =
    url && loaded && loaded.url === url ? loaded.texture : null;

  if (!texture || !grid.cols || !grid.rows) return null;

  return (
    <pixiSprite
      texture={texture}
      x={0}
      y={0}
      width={grid.cols * grid.cellSize}
      height={grid.rows * grid.cellSize}
    />
  );
}
