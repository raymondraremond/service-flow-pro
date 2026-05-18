import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="grid h-screen place-items-center bg-black text-white/60">
        Loading…
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-white">
      <header className="flex items-center justify-between border-b border-white/10 bg-zinc-950/80 px-5 py-3 backdrop-blur">
        <div className="flex items-center gap-6">
          <Link to="/app" className="text-sm font-bold uppercase tracking-widest">
            Media<span className="text-emerald-400">.</span>
          </Link>
          <nav className="flex gap-1 text-sm">
            <NavLink to="/app">Live</NavLink>
            <NavLink to="/app/songs">Songs</NavLink>
            <NavLink to="/app/services">Services</NavLink>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-xs text-white/60">
          <span className="hidden sm:inline">{user.email}</span>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth" });
            }}
            className="rounded-md border border-white/10 px-3 py-1.5 hover:bg-white/5"
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="rounded-md px-3 py-1.5 text-white/70 hover:bg-white/5 hover:text-white"
      activeProps={{ className: "bg-white/10 text-white" }}
    >
      {children}
    </Link>
  );
}
