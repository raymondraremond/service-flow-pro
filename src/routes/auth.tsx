import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { toast, Toaster } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/app" });
  }, [loading, user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/app`,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/app" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  const signInGoogle = async () => {
    const res = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/app`,
    });
    if (res.error) toast.error("Google sign-in failed");
  };

  return (
    <div className="grid min-h-screen place-items-center bg-zinc-950 px-4 text-white">
      <Toaster theme="dark" position="top-center" />
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900/60 p-7 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid size-10 place-items-center rounded-full bg-emerald-500/15 text-emerald-300">✝</div>
          <h1 className="text-xl font-semibold">Church Media</h1>
          <p className="mt-1 text-sm text-white/60">
            {mode === "signin" ? "Sign in to control the service." : "Create your operator account."}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <Field label="Display name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-emerald-400/50"
                placeholder="Jane Doe"
                maxLength={80}
              />
            </Field>
          )}
          <Field label="Email">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-emerald-400/50"
              placeholder="you@church.org"
              maxLength={255}
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-emerald-400/50"
              placeholder="••••••••"
            />
          </Field>
          <button
            type="submit"
            disabled={busy}
            className="mt-2 w-full rounded-lg bg-emerald-500 px-3 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50"
          >
            {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-white/40">
          <div className="h-px flex-1 bg-white/10" />
          OR
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <button
          onClick={signInGoogle}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-medium hover:bg-white/10"
        >
          Continue with Google
        </button>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-5 w-full text-center text-xs text-white/50 hover:text-white"
        >
          {mode === "signin" ? "No account? Create one" : "Have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/50">{label}</span>
      {children}
    </label>
  );
}
