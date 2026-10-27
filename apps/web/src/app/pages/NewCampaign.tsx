import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/services/api";
import { useI18n } from "@/services/i18n";

const FIELD = "rounded-md border border-border px-3 py-2 text-sm";

export default function NewCampaignPage() {
  const { t, tError } = useI18n();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const { id } = await api<{ id: string }>("/api/campaigns", { body: { name: name.trim(), description: description.trim() } });
      navigate(`/campaigns/${id}`, { replace: true });
    } catch (err) {
      setError(tError((err as { code?: string }).code ?? "internal"));
      setPending(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-svh max-w-lg flex-col gap-4 p-4 sm:p-6">
      <Link to="/dashboard" className="text-xs text-muted-foreground hover:underline">
        {t("common.back")}
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>{t("camp.new")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              {t("camp.name")}
              <input required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} className={FIELD} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              {t("camp.description")}
              <textarea rows={3} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} className={FIELD} />
            </label>
            {error && (
              <p role="alert" className="text-xs text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" disabled={pending || !name.trim()}>
              {pending ? t("camp.creating") : t("camp.create")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
