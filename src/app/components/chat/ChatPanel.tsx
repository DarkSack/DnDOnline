import { useEffect, useRef, useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendMessage, type RoomMessage } from "@/services/messages";
import { useLiveMessages } from "@/realtime/use-live-messages";

export type ChatPanelProps = {
  roomId: string;
  userId: string | undefined;
};

export function ChatPanel({ roomId, userId }: ChatPanelProps) {
  const { messages, loading } = useLiveMessages(roomId);
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al fondo cuando llega un mensaje nuevo.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!userId || !body.trim()) return;
    setPending(true);
    setError(null);
    try {
      await sendMessage({ roomId, actorId: userId, body });
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={listRef}
        className="flex max-h-64 min-h-[128px] flex-col gap-1 overflow-y-auto rounded-md border border-border bg-input/10 p-2 text-sm"
      >
        {loading ? (
          <p className="text-xs text-muted-foreground">Cargando…</p>
        ) : messages.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Aún no hay mensajes en esta sala.
          </p>
        ) : (
          messages.map((m) => <MessageRow key={m.id} m={m} isMe={m.actor_id === userId} />)
        )}
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Escribe un mensaje…"
          maxLength={2000}
          disabled={pending}
          className="flex-1 rounded-md border border-border bg-input/30 px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
        />
        <Button type="submit" size="sm" disabled={pending || !body.trim()}>
          <Send className="mr-1 size-3.5" />
          Enviar
        </Button>
      </form>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function MessageRow({ m, isMe }: { m: RoomMessage; isMe: boolean }) {
  const name = m.actor?.username ?? m.actor_id.slice(0, 8);
  const time = new Date(m.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div className="flex flex-col gap-0.5 py-0.5">
      <div className="flex items-baseline gap-2 text-[10px] text-muted-foreground">
        <span className={isMe ? "font-medium text-foreground" : "font-medium"}>
          {name}
        </span>
        <span>{time}</span>
      </div>
      <p className="whitespace-pre-wrap break-words text-sm">{m.body}</p>
    </div>
  );
}
