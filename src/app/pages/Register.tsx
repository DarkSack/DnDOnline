import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/services/use-auth";

export default function RegisterPage() {
  const { signUpWithPassword } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    const { error } = await signUpWithPassword(email, password);
    setPending(false);
    if (error) {
      setError(error);
      return;
    }
    // Si Supabase requiere verificación por email, no habrá sesión aún.
    // Si el email confirm está desactivado, onAuthStateChange nos llevará al dashboard.
    setCheckEmail(true);
    setTimeout(() => navigate("/dashboard", { replace: true }), 800);
  };

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Crear cuenta</CardTitle>
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
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-md border border-border bg-input/30 px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
              />
            </label>
            {error && <p className="text-xs text-destructive">{error}</p>}
            {checkEmail && (
              <p className="text-xs text-muted-foreground">
                Cuenta creada. Si tu proyecto requiere verificación por email,
                revisa tu bandeja de entrada.
              </p>
            )}
            <Button type="submit" disabled={pending}>
              {pending ? "Creando…" : "Registrarme"}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Inicia sesión
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
