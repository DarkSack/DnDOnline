import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "@/services/use-auth";

function FullPageSpinner() {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
    </div>
  );
}

export function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageSpinner />;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

export function RequireGuest() {
  const { user, loading } = useAuth();

  if (loading) return <FullPageSpinner />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
