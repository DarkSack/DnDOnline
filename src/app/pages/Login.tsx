import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/services/use-auth";

export default function LoginPage() {
  const { signInWithPassword, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    const { error } = await signInWithPassword(email, password);
    setPending(false);
    if (error) setError(error);
    else navigate("/dashboard", { replace: true });
  };

  const onGoogle = async () => {
    setPending(true);
    setError(null);
    const { error } = await signInWithGoogle();
    if (error) {
      setError(error);
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Iniciar sesión</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Email
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-md border border-border bg-input/30 px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Contraseña
              <input
                type="password"
                autoComplete="current-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-md border border-border bg-input/30 px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
              />
            </label>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" disabled={pending}>
              {pending ? "Entrando…" : "Entrar"}
            </Button>
          </form>
          <Button
            type="button"
            variant="outline"
            onClick={onGoogle}
            disabled={pending}
          >
            Continuar con Google
          </Button>
          <p className="text-xs text-muted-foreground">
            ¿No tienes cuenta?{" "}
            <Link to="/register" className="text-primary hover:underline">
              Regístrate
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
