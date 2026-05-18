import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { splitLyricsIntoSlides } from "@/lib/lyrics";
import { toast, Toaster } from "sonner";

export const Route = createFileRoute("/app/songs/$songId")({
  component: Page,
});

function Page() {
  return (
    <AppShell>
      <Toaster theme="dark" position="top-center" />
      <Editor />
    </AppShell>
  );
}

function Editor() {
  const { songId } = Route.useParams();
  const navigate = useNavigate();

  const song = useQuery({
    queryKey: ["song", songId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("songs")
        .select("id,title,artist,number")
        .eq("id", songId)
        .single();
      if (error) throw error;
      return data;
    },
  });
  const slidesQ = useQuery({
    queryKey: ["song-slides", songId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("song_slides")
        .select("id,position,content")
        .eq("song_id", songId)
        .order("position");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [slides, setSlides] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (song.data) {
      setTitle(song.data.title);
      setArtist(song.data.artist ?? "");
    }
  }, [song.data]);
  useEffect(() => {
    if (slidesQ.data) setSlides(slidesQ.data.map((s) => s.content));
  }, [slidesQ.data]);

  if (song.isLoading) return <div className="p-6 text-sm text-white/50">Loading…</div>;

  const updateSlide = (i: number, v: string) =>
    setSlides((arr) => arr.map((s, idx) => (idx === i ? v : s)));
  const removeSlide = (i: number) => setSlides((arr) => arr.filter((_, idx) => idx !== i));
  const addSlide = () => setSlides((arr) => [...arr, ""]);
  const move = (i: number, dir: -1 | 1) => {
    setSlides((arr) => {
      const j = i + dir;
      if (j < 0 || j >= arr.length) return arr;
      const copy = [...arr];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  };

  const reSplit = () => {
    const joined = slides.join("\n\n");
    setSlides(splitLyricsIntoSlides(joined));
  };

  const save = async () => {
    if (!title.trim()) {
      toast.error("Title required");
      return;
    }
    setBusy(true);
    try {
      const { error: e1 } = await supabase
        .from("songs")
        .update({ title: title.trim(), artist: artist.trim() || null })
        .eq("id", songId);
      if (e1) throw e1;
      // Replace slides atomically: delete then insert.
      const { error: eDel } = await supabase.from("song_slides").delete().eq("song_id", songId);
      if (eDel) throw eDel;
      const cleaned = slides.map((s) => s.trim()).filter(Boolean);
      if (cleaned.length) {
        const { error: eIns } = await supabase
          .from("song_slides")
          .insert(cleaned.map((content, i) => ({ song_id: songId, position: i, content })));
        if (eIns) throw eIns;
      }
      toast.success("Saved");
      navigate({ to: "/app/songs" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-5">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit Song</h1>
        <div className="flex gap-2">
          <button
            onClick={() => navigate({ to: "/app/songs" })}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/5"
          >
            Back
          </button>
          <button
            onClick={save}
            disabled={busy}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-emerald-400/50"
        />
        <input
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          placeholder="Artist"
          className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-emerald-400/50"
        />
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60">Slides ({slides.length})</h2>
        <div className="flex gap-2">
          <button onClick={reSplit} className="rounded-md border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5">
            Re-split on blank lines
          </button>
          <button onClick={addSlide} className="rounded-md border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5">
            + Add Slide
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {slides.map((s, i) => (
          <div key={i} className="rounded-lg border border-white/10 bg-zinc-950 p-3">
            <div className="mb-2 flex items-center justify-between text-xs text-white/40">
              <span className="font-bold">SLIDE {i + 1}</span>
              <div className="flex gap-1">
                <button onClick={() => move(i, -1)} className="rounded px-2 py-0.5 hover:bg-white/10">↑</button>
                <button onClick={() => move(i, 1)} className="rounded px-2 py-0.5 hover:bg-white/10">↓</button>
                <button
                  onClick={() => removeSlide(i)}
                  className="rounded px-2 py-0.5 text-red-300 hover:bg-red-500/10"
                >
                  ✕
                </button>
              </div>
            </div>
            <textarea
              value={s}
              onChange={(e) => updateSlide(i, e.target.value)}
              rows={Math.max(s.split("\n").length, 3)}
              className="w-full resize-y rounded-md border border-white/10 bg-black px-3 py-2 text-sm leading-relaxed outline-none focus:border-emerald-400/50"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
