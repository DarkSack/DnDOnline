import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api, type CampaignSummary } from "@/services/api";
import { useI18n } from "@/services/i18n";
import { AppHeader } from "@/app/components/layout/AppHeader";
import { CharactersCard } from "@/app/components/character/CharactersCard";
import { listMyCharacters } from "@/services/characters";

export default function DashboardPage() {
  const { t, tError } = useI18n();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<CampaignSummary[] | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    api<{ campaigns: CampaignSummary[] }>("/api/campaigns").then(
      (r) => setCampaigns(r.campaigns),
      () => setCampaigns([]),
    );
  }, []);

  const onJoin = async (e: FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoining(true);
    setJoinError(null);
    try {
      const { campaignId } = await api<{ campaignId: string }>(`/api/invites/${encodeURIComponent(joinCode.trim().toUpperCase())}/accept`, { body: {} });
      navigate(`/campaigns/${campaignId}`);
    } catch (err) {
      setJoinError(tError((err as { code?: string }).code ?? "internal"));
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-svh max-w-4xl flex-col gap-4 p-4 sm:gap-6 sm:p-6">
      <AppHeader />

      <Card>
        <CardHeader>
          <CardTitle>{t("camp.join")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onJoin} className="flex flex-col gap-2 sm:flex-row">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder={t("camp.code")}
              aria-label={t("camp.code")}
              maxLength={20}
              autoComplete="off"
              className="flex-1 rounded-md border border-border px-3 py-2 font-mono text-sm uppercase tracking-widest"
            />
            <Button type="submit" disabled={joining || !joinCode.trim()}>
              {joining ? t("camp.joining") : t("camp.joinCta")}
            </Button>
          </form>
          {joinError && (
            <p role="alert" className="mt-2 text-xs text-destructive">
              {joinError}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t("camp.mine")}</CardTitle>
          <Button size="sm" asChild>
            <Link to="/campaigns/new">{t("camp.new")}</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {campaigns === null ? (
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("camp.none")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {campaigns.map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/campaigns/${c.id}`}
                    className="flex items-center justify-between gap-3 rounded-md border border-border bg-input/20 px-3 py-2 text-sm hover:bg-input/40"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{c.name}</span>
                      {c.description && <span className="block truncate text-xs text-muted-foreground">{c.description}</span>}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{t(`role.${c.role}`)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <CharactersCard
        title="char.mine"
        load={listMyCharacters}
        empty="char.none"
        aside={(c) => c.campaignName ?? t("char.noCampaign")}
        newHref="/characters/new"
      />
    </div>
  );
}
