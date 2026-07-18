import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useState } from "react";
import {
  ensureDefaultSession,
  updatePresentation,
  usePresentation,
  useSession,
} from "@/hooks/usePresentation";
import { BigButton } from "@/components/control/BigButton";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { QuickCast } from "@/components/control/QuickCast";
import { AlertBar } from "@/components/control/AlertBar";
import { CountdownPanel } from "@/components/control/CountdownPanel";
import { ThemePanel } from "@/components/control/ThemePanel";
import { MediaCast } from "@/components/control/MediaCast";
import { MotionPanel } from "@/components/control/MotionPanel";
import { CommandPalette } from "@/components/control/CommandPalette";
import { toast, Toaster } from "sonner";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

function Dashboard() {
  return (
    <AppShell>
      <Toaster theme="dark" position="top-center" />
      <DashboardInner />
    </AppShell>
  );
}

function DashboardInner() {
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionSlug, setSessionSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    ensureDefaultSession(user.id)
      .then((s) => {
        setSessionId(s.id);
        setSessionSlug(s.slug);
      })
      .catch((e) => toast.error(e.message ?? "Could not start session"));
  }, [user]);

  const { state, connected } = usePresentation(sessionId);
  const session = useSession(sessionId);
  const [search, setSearch] = useState("");
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<"control" | "alerts" | "theme">("control");

  const songs = useQuery({
    queryKey: ["songs", search],
    queryFn: async () => {
      const q = supabase.from("songs").select("id,title,artist,number").order("title").limit(50);
      const { data, error } = search
        ? await q.or(`title.ilike.%${search}%,artist.ilike.%${search}%`)
        : await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const slidesQ = useQuery({
    queryKey: ["slides", selectedSongId],
    enabled: !!selectedSongId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("song_slides")
        .select("id,position,content")
        .eq("song_id", selectedSongId!)
        .order("position");
      if (error) throw error;
      return data ?? [];
    },
  });
  const selectedSong = useMemo(
    () => songs.data?.find((s) => s.id === selectedSongId) ?? null,
    [songs.data, selectedSongId]
  );

  const goLive = async (slideIndex: number) => {
    if (!sessionId || !selectedSong || !slidesQ.data) return;
    await updatePresentation(sessionId, {
      mode: "slide",
      current_song_id: selectedSong.id,
      current_slide_index: slideIndex,
      payload: {
        song_title: selectedSong.title,
        slides: slidesQ.data.map((s) => s.content),
      },
    });
  };

  const totalSlides = state?.payload?.slides?.length ?? 0;
  const next = () => {
    if (!sessionId || !state || state.mode !== "slide") return;
    const idx = Math.min(state.current_slide_index + 1, Math.max(totalSlides - 1, 0));
    updatePresentation(sessionId, { current_slide_index: idx });
  };
  const prev = () => {
    if (!sessionId || !state || state.mode !== "slide") return;
    const idx = Math.max(state.current_slide_index - 1, 0);
    updatePresentation(sessionId, { current_slide_index: idx });
  };
  const black = () => sessionId && updatePresentation(sessionId, { mode: "black" });
  const logo = () => sessionId && updatePresentation(sessionId, { mode: "logo" });
  const clear = () => sessionId && updatePresentation(sessionId, { mode: "blank" });

  useKeyboardShortcuts({ onNext: next, onPrev: prev, onBlack: black, onLogo: logo, onClear: clear });

  return (
    <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[320px_1fr_380px]">
      {/* Song picker */}
      <section className="rounded-xl border border-white/10 bg-zinc-900/40 p-3">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">Songs</h2>
          <Link to="/app/songs" className="text-xs text-emerald-400 hover:underline">
            Manage →
          </Link>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title or artist…"
          className="mb-3 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-emerald-400/50"
        />
        <div className="max-h-[60vh] space-y-1 overflow-auto">
          {songs.isLoading && <div className="p-3 text-sm text-white/40">Loading…</div>}
          {songs.data?.length === 0 && (
            <div className="p-3 text-sm text-white/40">
              No songs yet.{" "}
              <Link to="/app/songs" className="text-emerald-400 hover:underline">
                Add one →
              </Link>
            </div>
          )}
          {songs.data?.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedSongId(s.id)}
              className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                selectedSongId === s.id ? "bg-emerald-500/15 text-emerald-200" : "hover:bg-white/5"
              }`}
            >
              <div className="font-medium">{s.title}</div>
              {s.artist && <div className="text-xs text-white/40">{s.artist}</div>}
            </button>
          ))}
        </div>
      </section>

      {/* Slide grid */}
      <section className="rounded-xl border border-white/10 bg-zinc-900/40 p-3">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">
            {selectedSong ? selectedSong.title : "Select a song"}
          </h2>
          <div className="flex items-center gap-2 text-xs text-white/40">
            <span className={`size-2 rounded-full ${connected ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`} />
            {connected ? "Live" : "Reconnecting…"}
          </div>
        </div>
        {!selectedSong && (
          <div className="grid h-64 place-items-center text-sm text-white/40">
            Pick a song to load its slides.
          </div>
        )}
        {selectedSong && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {slidesQ.data?.map((s, idx) => {
              const isLive =
                state?.mode === "slide" &&
                state.current_song_id === selectedSong.id &&
                state.current_slide_index === idx;
              return (
                <button
                  key={s.id}
                  onClick={() => goLive(idx)}
                  className={`h-32 rounded-lg border p-3 text-left text-xs leading-tight whitespace-pre-line transition-all ${
                    isLive
                      ? "border-emerald-400/60 bg-emerald-500/15 ring-2 ring-emerald-400/40"
                      : "border-white/10 bg-zinc-950 hover:border-white/30"
                  }`}
                >
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white/40">
                    {idx + 1}
                  </div>
                  <div className="line-clamp-5 text-white/85">{s.content}</div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Right column */}
      <section className="space-y-4">
        <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-3">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-white/70">Now Live</h2>
          <div className="rounded-lg border border-white/10 bg-black p-4 text-white">
            <div className="mb-2 flex items-center justify-between text-xs text-white/50">
              <span className="uppercase tracking-wider">{state?.mode ?? "blank"}</span>
              {state?.mode === "slide" && totalSlides > 0 && (
                <span>{(state.current_slide_index ?? 0) + 1} / {totalSlides}</span>
              )}
            </div>
            <div className="min-h-24 whitespace-pre-line text-lg font-medium leading-snug">
              {state?.mode === "slide"
                ? state.payload?.slides?.[state.current_slide_index] ?? ""
                : state?.mode === "verse"
                ? state.payload?.verse_text ?? ""
                : state?.mode === "countdown"
                ? `⏱ ${state.payload?.countdown_message ?? "Countdown"}`
                : state?.mode === "logo"
                ? "[ LOGO SCREEN ]"
                : state?.mode === "black"
                ? "[ BLACK SCREEN ]"
                : "[ BLANK ]"}
            </div>
            {state?.payload?.song_title && state.mode === "slide" && (
              <div className="mt-2 text-xs uppercase tracking-wider text-white/40">{state.payload.song_title}</div>
            )}
            {state?.overlay?.alert && (
              <div className="mt-3 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                ⚠ Alert: {state.overlay.alert}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <BigButton onClick={prev}>◀ Prev</BigButton>
          <BigButton variant="primary" onClick={next}>Next ▶</BigButton>
          <BigButton variant="danger" onClick={black} active={state?.mode === "black"}>Black (B)</BigButton>
          <BigButton onClick={logo} active={state?.mode === "logo"}>Logo (L)</BigButton>
          <BigButton variant="ghost" onClick={clear} className="col-span-2">Clear (Esc)</BigButton>
        </div>

        {/* Tabs: Control / Alerts / Theme */}
        <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-1">
          <div className="grid grid-cols-3 gap-1 text-xs">
            {(["control", "alerts", "theme"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setRightTab(t)}
                className={`rounded-md px-2 py-1.5 font-semibold uppercase tracking-wider ${
                  rightTab === t
                    ? "bg-emerald-500/15 text-emerald-200"
                    : "text-white/50 hover:bg-white/5"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {rightTab === "control" && (
          <>
            <QuickCast sessionId={sessionId} />
            <MediaCast sessionId={sessionId} />
            <CountdownPanel sessionId={sessionId} />
          </>
        )}
        {rightTab === "alerts" && (
          <AlertBar sessionId={sessionId} current={state?.overlay} />
        )}
        {rightTab === "theme" && (
          <>
            <ThemePanel sessionId={sessionId} theme={session?.theme} />
            <MotionPanel sessionId={sessionId} theme={session?.theme} />
          </>
        )}

        {sessionSlug && (
          <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-3 text-xs">
            <div className="mb-2 font-semibold uppercase tracking-wider text-white/50">
              Outputs
            </div>
            <div className="space-y-1.5">
              <OutputLink
                label="Projector"
                href={`/live/${sessionSlug}`}
                hint="Audience screen"
              />
              <OutputLink
                label="Stage Display"
                href={`/stage/${sessionSlug}`}
                hint="Confidence monitor (current + next + clock)"
              />
            </div>
          </div>
        )}
      </section>
      <CommandPalette sessionId={sessionId} />
    </div>
  );
}

function OutputLink({ label, href, hint }: { label: string; href: string; hint: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="block rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 hover:border-emerald-400/40"
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold text-emerald-400">{label} ↗</span>
        <span className="text-[10px] text-white/30">{href}</span>
      </div>
      <div className="text-[11px] text-white/40">{hint}</div>
    </a>
  );
}
