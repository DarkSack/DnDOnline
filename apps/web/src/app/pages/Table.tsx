import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableChat } from "@/app/components/table/TableChat";
import { TableDice } from "@/app/components/table/TableDice";
import { TableBoard } from "@/app/components/board/TableBoard";
import { CombatTracker } from "@/app/components/combat/CombatTracker";
import { api, type CampaignDetail } from "@/services/api";
import { useAuth } from "@/services/use-auth";
import { useI18n, type I18nKey } from "@/services/i18n";
import { useTable, type TableStatus } from "@/realtime/use-table";

const PILL: Record<TableStatus, { key: I18nKey; dot: string }> = {
  connecting: { key: "table.connecting", dot: "bg-yellow-500" },
  open: { key: "table.live", dot: "bg-emerald-500" },
  closed: { key: "table.disconnected", dot: "bg-destructive" },
};

export default function TablePage() {
  const { id: campaignId = "" } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { t, tError } = useI18n();
  const table = useTable(campaignId);
  const [detail, setDetail] = useState<CampaignDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    api<CampaignDetail>(`/api/campaigns/${campaignId}`).then(setDetail, (e: { code?: string }) => setLoadError(e.code ?? "internal"));
  }, [campaignId]);

  // Alguien entró por invitación con la mesa abierta: recargar miembros para tener su rol.
  const unknownOnline = detail !== null && table.presence.some((p) => !detail.members.some((m) => m.id === p.id));
  useEffect(() => {
    if (unknownOnline) api<CampaignDetail>(`/api/campaigns/${campaignId}`).then(setDetail, () => {});
  }, [unknownOnline, campaignId]);

  if (loadError) {
    return (
      <div className="mx-auto flex min-h-svh max-w-5xl flex-col gap-4 p-4 sm:p-6">
        <Link to="/dashboard" className="text-xs text-muted-foreground hover:underline">
          {t("common.back")}
        </Link>
        <p role="alert" className="text-sm text-destructive">
          {tError(loadError)}
        </p>
      </div>
    );
  }
  if (!detail) return <p className="p-6 text-sm text-muted-foreground">{t("common.loading")}</p>;

  const online = new Set(table.presence.map((p) => p.id));
  const pill = PILL[table.status];

  return (
    <div className="mx-auto flex min-h-svh max-w-5xl flex-col gap-4 p-4 sm:gap-6 sm:p-6">
      <Link to={`/campaigns/${campaignId}`} className="text-xs text-muted-foreground hover:underline">
        {t("common.back")}
      </Link>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="min-w-0 truncate text-2xl">
          {detail.campaign.name} <span className="text-base text-muted-foreground">· {t("table.title")}</span>
        </h1>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
          <span className={`size-1.5 rounded-full ${pill.dot}`} />
          {t(pill.key)}
        </span>
      </header>
      {table.lastError && (
        <p role="alert" className="text-sm text-destructive">
          {tError(table.lastError)}
        </p>
      )}

      <Card className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-6">
          <h2 className="font-heading text-base font-medium">{t("board.title")}</h2>
          <span className="hidden text-[10px] text-muted-foreground sm:block">{t("board.hint")}</span>
        </div>
        <div className="p-2 sm:p-3">
          <TableBoard table={table} campaignId={campaignId} />
        </div>
      </Card>

      {table.board?.scene && (table.board.manage || table.board.combat) && (
        <Card>
          <CardHeader>
            <CardTitle>{t("combat.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <CombatTracker table={table} />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_220px]">
        <Card>
          <CardHeader>
            <CardTitle>{t("table.chat")}</CardTitle>
          </CardHeader>
          <CardContent>
            <TableChat table={table} userId={user?.id} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("table.dice")}</CardTitle>
          </CardHeader>
          <CardContent>
            <TableDice table={table} canRoll={detail.role !== "spectator"} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("camp.members")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2 text-sm">
              {detail.members.map((m) => (
                <li key={m.id} className="flex items-center gap-2">
                  <span
                    className={`size-2 shrink-0 rounded-full ${online.has(m.id) ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
                    aria-label={online.has(m.id) ? t("camp.online") : undefined}
                  />
                  <span className="min-w-0 truncate">{m.displayName}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{t(`role.${m.role}`)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
