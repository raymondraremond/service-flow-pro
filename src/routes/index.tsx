import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid h-screen place-items-center bg-black text-white/50">Loading…</div>;
  return <Navigate to={user ? "/app" : "/auth"} />;
}
