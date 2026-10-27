import type { useRoomChannel } from "@/realtime/use-room-channel";

export type ConnectionPillProps = {
  status: ReturnType<typeof useRoomChannel>["status"];
};

const LABEL = {
  idle: "Inactivo",
  connecting: "Conectando…",
  subscribed: "En vivo",
  closed: "Desconectado",
  error: "Error de conexión",
} as const;

const COLOR = {
  idle: "bg-muted-foreground/40",
  connecting: "bg-yellow-500",
  subscribed: "bg-emerald-500",
  closed: "bg-muted-foreground/40",
  error: "bg-destructive",
} as const;

export function ConnectionPill({ status }: ConnectionPillProps) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
      <span className={`size-1.5 rounded-full ${COLOR[status]}`} />
      {LABEL[status]}
    </span>
  );
}
