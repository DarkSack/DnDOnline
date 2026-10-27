import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api, type CampaignDetail, type Invite } from "@/services/api";
import { useAuth } from "@/services/use-auth";
import { useI18n } from "@/services/i18n";

export default function CampaignDetailPage() {
  const { id: campaignId = "" } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { t, tError } = useI18n();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<CampaignDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<CampaignDetail>(`/api/campaigns/${campaignId}`).then(setDetail, (e: { code?: string }) => setLoadError(tError(e.code ?? "internal")));
    // tError cambia con el idioma; recargar por eso no hace falta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loadError) {
    return (
      <div className="mx-auto flex min-h-svh max-w-4xl flex-col gap-4 p-4 sm:p-6">
        <Link to="/dashboard" className="text-xs text-muted-foreground hover:underline">
          {t("common.back")}
        </Link>
        <p role="alert" className="text-sm text-destructive">
          {loadError}
        </p>
      </div>
    );
  }
  if (!detail) return <p className="p-6 text-sm text-muted-foreground">{t("common.loading")}</p>;

  const { campaign, role, members } = detail;
  const manages = role === "dm" || role === "co_dm";
  const removeMember = async (userId: string) => {
    await api(`/api/campaigns/${campaignId}/members/${userId}`, { method: "DELETE" });
    if (userId === user?.id) navigate("/dashboard");
    else load();
  };

  return (
    <div className="mx-auto flex min-h-svh max-w-4xl flex-col gap-4 p-4 sm:gap-6 sm:p-6">
      <Link to="/dashboard" className="text-xs text-muted-foreground hover:underline">
        {t("common.back")}
      </Link>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl">{campaign.name}</h1>
          {campaign.description && <p className="text-sm text-muted-foreground">{campaign.description}</p>}
        </div>
        <Button asChild>
          <Link to={`/campaigns/${campaignId}/mesa`}>{t("camp.enterTable")}</Link>
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("camp.members")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <ul className="flex flex-col gap-2">
              {members.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate">
                    {m.displayName} <span className="text-xs text-muted-foreground">· {t(`role.${m.role}`)}</span>
                  </span>
                  {manages && m.id !== campaign.ownerId && m.id !== user?.id && (
                    <button className="text-xs text-destructive hover:underline" onClick={() => removeMember(m.id)}>
                      {t("camp.kick")}
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {user?.id !== campaign.ownerId && (
              <Button variant="outline" size="sm" onClick={() => user && removeMember(user.id)}>
                {t("camp.leave")}
              </Button>
            )}
          </CardContent>
        </Card>
        {manages && <InvitesCard campaignId={campaignId} />}
      </div>
    </div>
  );
}

function InvitesCard({ campaignId }: { campaignId: string }) {
  const { t, tError, locale } = useI18n();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [role, setRole] = useState<"player" | "spectator">("player");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const load = useCallback(
    () => api<{ invites: Invite[] }>(`/api/campaigns/${campaignId}/invites`).then((r) => setInvites(r.invites)),
    [campaignId],
  );
  useEffect(() => {
    load();
  }, [load]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await api(`/api/campaigns/${campaignId}/invites`, { body: { role } });
      await load();
    } catch (err) {
      setError(tError((err as { code?: string }).code ?? "internal"));
    } finally {
      setPending(false);
    }
  };
  const revoke = async (code: string) => {
    await api(`/api/campaigns/${campaignId}/invites/${code}`, { method: "DELETE" });
    await load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("camp.invites")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <form onSubmit={create} className="flex flex-wrap items-end gap-2">
          <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
            {t("camp.inviteAs")}
            <select value={role} onChange={(e) => setRole(e.target.value as "player" | "spectator")} className="rounded-md border border-border px-3 py-2 text-sm">
              <option value="player">{t("role.player")}</option>
              <option value="spectator">{t("role.spectator")}</option>
            </select>
          </label>
          <Button type="submit" size="sm" disabled={pending}>
            {t("camp.invite")}
          </Button>
        </form>
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
        {invites.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("camp.noInvites")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {invites.map((i) => (
              <li key={i.code} className="rounded-md border border-border bg-input/20 p-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <code className="select-all font-mono text-base tracking-widest">{i.code}</code>
                  <button className="text-xs text-destructive hover:underline" onClick={() => revoke(i.code)}>
                    {t("camp.revoke")}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t(`role.${i.role}`)} · {i.uses ?? 0}/{i.maxUses} {t("camp.uses")} · {t("camp.expires")} {new Date(i.expiresAt).toLocaleString(locale)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
