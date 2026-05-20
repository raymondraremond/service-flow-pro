import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePresentation, useSession } from "@/hooks/usePresentation";

export const Route = createFileRoute("/stage/$slug")({
  component: Stage,
});

// Stage display / confidence monitor for the worship leader.
// Shows: CURRENT slide huge, NEXT slide preview, live clock, alert banner.
function Stage() {
  const { slug } = Route.useParams();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    supabase
      .from("presentation_sessions")
      .select("id,is_active")
      .eq("slug", slug)
      .maybeSingle()
      .then(({ data }) => {
        if (!data || !data.is_active) setNotFound(true);
        else setSessionId(data.id);
      });
  }, [slug]);

  const { state } = usePresentation(sessionId);
  const session = useSession(sessionId);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (notFound) {
    return (
      <div className="grid h-screen w-screen place-items-center bg-black text-white/40">
        Session not found
      </div>
    );
  }

  const slides = state?.payload?.slides ?? [];
  const idx = state?.current_slide_index ?? 0;
  const total = slides.length;
  const current =
    state?.mode === "slide"
      ? slides[idx] ?? ""
      : state?.mode === "verse"
      ? state.payload?.verse_text ?? ""
      : state?.mode === "logo"
      ? session?.theme?.welcome || "WELCOME"
      : state?.mode === "black"
      ? "— BLACK SCREEN —"
      : state?.mode === "countdown"
      ? state.payload?.countdown_message || "Countdown running"
      : "—";
  const next = state?.mode === "slide" ? slides[idx + 1] ?? null : null;
  const caption =
    state?.mode === "slide"
      ? state.payload?.song_title
      : state?.mode === "verse"
      ? state.payload?.verse_ref
      : null;
  const alert = state?.overlay?.alert?.trim();

  return (
    <div className="flex h-screen w-screen flex-col bg-black text-white">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-3 text-sm">
        <div className="flex items-center gap-3">
          <span className="rounded bg-emerald-500 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-black">
            Stage
          </span>
          <span className="uppercase tracking-wider text-white/50">
            {state?.mode ?? "blank"}
          </span>
          {state?.mode === "slide" && total > 0 && (
            <span className="text-white/40">
              {idx + 1} / {total}
            </span>
          )}
        </div>
        <div className="font-mono text-xl tabular-nums">
          {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </div>
      </div>

      {/* Current slide — huge */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-6xl text-center">
          <div
            className="whitespace-pre-line font-medium leading-[1.2] tracking-tight"
            style={{ fontSize: "clamp(40px, 7vw, 120px)" }}
          >
            {current}
          </div>
          {caption && (
            <div className="mt-8 text-base uppercase tracking-[0.4em] text-white/40">
              {caption}
            </div>
          )}
        </div>
      </div>

      {/* Next slide preview */}
      <div className="border-t border-white/10 bg-zinc-950/80 px-6 py-4">
        <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-400">
          Next ↓
        </div>
        <div className="line-clamp-3 whitespace-pre-line text-xl leading-snug text-white/65">
          {next ?? <span className="italic text-white/30">— end of song —</span>}
        </div>
      </div>

      {alert && (
        <div className="bg-red-600 px-6 py-3 text-center text-base font-semibold tracking-wide">
          ⚠ {alert}
        </div>
      )}
    </div>
  );
}
