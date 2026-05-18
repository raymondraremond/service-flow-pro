import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useState } from "react";
import { splitLyricsIntoSlides } from "@/lib/lyrics";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast, Toaster } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/app/songs/new")({
  component: Page,
});

const schema = z.object({
  title: z.string().trim().min(1, "Title required").max(200),
  artist: z.string().trim().max(200).optional(),
  lyrics: z.string().trim().min(1, "Paste some lyrics"),
});

function Page() {
  return (
    <AppShell>
      <Toaster theme="dark" position="top-center" />
      <NewSong />
    </AppShell>
  );
}

function NewSong() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [busy, setBusy] = useState(false);

  const slides = splitLyricsIntoSlides(lyrics);

  const save = async () => {
    const parsed = schema.safeParse({ title, artist, lyrics });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (!user) return;
    setBusy(true);
    try {
      const { data: song, error } = await supabase
        .from("songs")
        .insert({ title: parsed.data.title, artist: parsed.data.artist || null, created_by: user.id })
        .select("id")
        .single();
      if (error) throw error;
      const rows = slides.map((content, i) => ({ song_id: song.id, position: i, content }));
      if (rows.length) {
        const { error: e2 } = await supabase.from("song_slides").insert(rows);
        if (e2) throw e2;
      }
      toast.success("Song saved");
      navigate({ to: "/app/songs/$songId", params: { songId: song.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save song");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-5">
      <h1 className="mb-5 text-2xl font-semibold">New Song</h1>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          <Field label="Title *">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-emerald-400/50"
            />
          </Field>
          <Field label="Artist">
            <input
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              maxLength={200}
              className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-emerald-400/50"
            />
          </Field>
          <Field label="Lyrics (separate slides with a blank line)">
            <textarea
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              rows={20}
              className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-relaxed outline-none focus:border-emerald-400/50"
              placeholder={`Amazing grace, how sweet the sound\nThat saved a wretch like me\n\nI once was lost, but now am found\nWas blind, but now I see`}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => navigate({ to: "/app/songs" })}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={busy}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save Song"}
            </button>
          </div>
        </div>
        <aside>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
            Slide Preview ({slides.length})
          </div>
          <div className="space-y-2">
            {slides.map((s, i) => (
              <div key={i} className="rounded-lg border border-white/10 bg-zinc-950 p-3 text-xs whitespace-pre-line">
                <div className="mb-1 font-bold text-white/40">#{i + 1}</div>
                {s}
              </div>
            ))}
            {slides.length === 0 && (
              <div className="rounded-lg border border-dashed border-white/10 p-4 text-center text-xs text-white/40">
                Paste lyrics to preview slides
              </div>
            )}
          </div>
        </aside>
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
