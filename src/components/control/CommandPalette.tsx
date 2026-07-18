import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { updatePresentation } from "@/hooks/usePresentation";
import { fetchVerse } from "@/lib/bible";
import { toast } from "sonner";

type Action = {
  id: string;
  label: string;
  hint?: string;
  section: string;
  run: () => void | Promise<void>;
};

export function CommandPalette({ sessionId }: { sessionId: string | null }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [songs, setSongs] = useState<Array<{ id: string; title: string; artist: string | null }>>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [cursor, setCursor] = useState(0);

  // Global open shortcut (⌘K / Ctrl+K)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQ("");
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  // Load songs when palette opens
  useEffect(() => {
    if (!open) return;
    supabase
      .from("songs")
      .select("id,title,artist")
      .order("title")
      .limit(200)
      .then(({ data }) => setSongs(data ?? []));
  }, [open]);

  const castSong = async (songId: string, title: string) => {
    if (!sessionId) return;
    const { data } = await supabase
      .from("song_slides")
      .select("content")
      .eq("song_id", songId)
      .order("position");
    await updatePresentation(sessionId, {
      mode: "slide",
      current_song_id: songId,
      current_slide_index: 0,
      payload: { song_title: title, slides: (data ?? []).map((s) => s.content) },
    });
    toast.success(`Live: ${title}`);
  };

  const actions = useMemo<Action[]>(() => {
    if (!sessionId) return [];
    const quick: Action[] = [
      { id: "black", label: "Black screen", hint: "B", section: "Screen",
        run: () => updatePresentation(sessionId, { mode: "black" }) },
      { id: "logo", label: "Logo / Welcome screen", hint: "L", section: "Screen",
        run: () => updatePresentation(sessionId, { mode: "logo" }) },
      { id: "clear", label: "Clear (blank)", hint: "Esc", section: "Screen",
        run: () => updatePresentation(sessionId, { mode: "blank" }) },
      { id: "clear-alert", label: "Clear live alert", section: "Overlay",
        run: () => updatePresentation(sessionId, { overlay: {} }) },
    ];
    const songActions: Action[] = songs.map((s) => ({
      id: `song-${s.id}`,
      label: s.title,
      hint: s.artist ?? "song",
      section: "Songs",
      run: () => castSong(s.id, s.title),
    }));
    // Bible verse cast if query matches a reference-ish pattern
    const verseTry: Action[] = /\d/.test(q) && /[a-z]/i.test(q)
      ? [{
          id: `verse-${q}`,
          label: `Cast verse: ${q}`,
          section: "Bible",
          hint: "WEB translation",
          run: async () => {
            try {
              const v = await fetchVerse(q, "web");
              await updatePresentation(sessionId, {
                mode: "verse",
                current_song_id: null,
                current_slide_index: 0,
                payload: { verse_ref: `${v.reference} · ${v.translation_name}`, verse_text: v.text },
              });
              toast.success(`Live: ${v.reference}`);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Lookup failed");
            }
          },
        }]
      : [];
    return [...verseTry, ...quick, ...songActions];
  }, [sessionId, songs, q]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return actions;
    return actions.filter((a) =>
      (a.label + " " + (a.hint ?? "") + " " + a.section).toLowerCase().includes(s)
    );
  }, [actions, q]);

  useEffect(() => {
    setCursor(0);
  }, [q]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-24 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl"
      >
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setCursor((c) => Math.min(c + 1, filtered.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setCursor((c) => Math.max(c - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              const a = filtered[cursor];
              if (a) {
                a.run();
                setOpen(false);
              }
            }
          }}
          placeholder="Search songs, cast verse (e.g. John 3:16), or run action…"
          className="w-full border-b border-white/10 bg-transparent px-4 py-3.5 text-sm outline-none placeholder:text-white/40"
        />
        <div className="max-h-[50vh] overflow-auto py-1">
          {filtered.length === 0 && (
            <div className="p-6 text-center text-sm text-white/40">No matches</div>
          )}
          {filtered.map((a, i) => (
            <button
              key={a.id}
              onMouseEnter={() => setCursor(i)}
              onClick={() => {
                a.run();
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm ${
                i === cursor ? "bg-emerald-500/15 text-emerald-100" : "text-white/80 hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/50">
                  {a.section}
                </span>
                <span className="truncate">{a.label}</span>
              </div>
              {a.hint && (
                <span className="ml-3 shrink-0 text-[11px] text-white/40">{a.hint}</span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-white/10 px-4 py-2 text-[11px] text-white/40">
          <span>↑↓ navigate · ↵ run · Esc close</span>
          <span>⌘K</span>
        </div>
      </div>
    </div>
  );
}
