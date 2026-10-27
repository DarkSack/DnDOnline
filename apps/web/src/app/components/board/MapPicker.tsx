import { useEffect, useState, type ChangeEvent } from "react";
import { listMaps, type CampaignMap } from "@/services/maps";

export type MapPickerProps = {
  campaignId: string;
  activeMapId: string | null;
  onChange: (mapId: string | null) => void;
  disabled?: boolean;
};

export function MapPicker({
  campaignId,
  activeMapId,
  onChange,
  disabled,
}: MapPickerProps) {
  const [maps, setMaps] = useState<CampaignMap[] | null>(null);

  useEffect(() => {
    let alive = true;
    listMaps(campaignId).then((m) => {
      if (alive) setMaps(m);
    });
    return () => {
      alive = false;
    };
  }, [campaignId]);

  const onSelect = (e: ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value === "" ? null : e.target.value);
  };

  if (!maps) {
    return <span className="text-xs text-muted-foreground">…</span>;
  }
  if (maps.length === 0) {
    return (
      <span className="text-xs text-muted-foreground">
        Sin mapas subidos.
      </span>
    );
  }

  return (
    <select
      value={activeMapId ?? ""}
      onChange={onSelect}
      disabled={disabled}
      className="rounded-md border border-border bg-input/30 px-2 py-1 text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <option value="">Sin mapa</option>
      {maps.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name} ({m.cols}×{m.rows})
        </option>
      ))}
    </select>
  );
}
