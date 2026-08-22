import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/services/use-auth";
import { createCampaign } from "@/services/campaigns";

export default function NewCampaignPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setPending(true);
    setError(null);
    try {
      const campaign = await createCampaign({
        name: name.trim(),
        description: description.trim() || null,
        dmId: user.id,
      });
      navigate(`/campaigns/${campaign.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear");
      setPending(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-svh max-w-lg flex-col gap-4 p-4 sm:p-6">
      <Link
        to="/dashboard"
        className="text-xs text-muted-foreground hover:underline"
      >
        ← Volver
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Nueva campaña</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Nombre
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-md border border-border bg-input/30 px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Descripción (opcional)
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-md border border-border bg-input/30 px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
              />
            </label>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" disabled={pending || !name.trim()}>
              {pending ? "Creando…" : "Crear campaña"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
