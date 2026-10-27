import { useEffect, useRef, useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/services/i18n";
import type { Table, TableEvent } from "@/realtime/use-table";

type ChatEvent = Extract<TableEvent, { kind: "chat" }>;

export function TableChat({ table, userId }: { table: Table; userId: string | undefined }) {
  const { t, locale } = useI18n();
  const [body, setBody] = useState("");
  const [whisper, setWhisper] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const messages = table.events.filter((e): e is ChatEvent => e.kind === "chat");

  // Auto-scroll al fondo cuando llega un mensaje nuevo.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    table.send({ type: "chat.send", body, visibility: whisper ? "private" : "public" });
    setBody("");
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={listRef}
        aria-live="polite"
        className="flex max-h-72 min-h-[128px] flex-col gap-1 overflow-y-auto rounded-md border border-border bg-input/10 p-2 text-sm"
      >
        {messages.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("table.noMessages")}</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="flex flex-col gap-0.5 py-0.5">
              <div className="flex items-baseline gap-2 text-[10px] text-muted-foreground">
                <span className={m.userId === userId ? "font-medium text-foreground" : "font-medium"}>{m.displayName}</span>
                <span>{new Date(m.createdAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}</span>
                {m.visibility === "private" && <span className="rounded bg-arcane/15 px-1 text-arcane">{t("table.whisperTag")}</span>}
              </div>
              <p className="whitespace-pre-wrap break-words text-sm">{m.body}</p>
            </div>
          ))
        )}
      </div>
      <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t("table.message")}
          aria-label={t("table.message")}
          maxLength={2000}
          className="min-w-0 flex-1 rounded-md border border-border px-3 py-2 text-sm"
        />
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          <input type="checkbox" checked={whisper} onChange={(e) => setWhisper(e.target.checked)} />
          {t("table.whisper")}
        </label>
        <Button type="submit" size="sm" disabled={table.status !== "open" || !body.trim()}>
          <Send className="mr-1 size-3.5" />
          {t("table.send")}
        </Button>
      </form>
    </div>
  );
}
