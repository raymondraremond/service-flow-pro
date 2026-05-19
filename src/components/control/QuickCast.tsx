import { useState } from "react";
import { updatePresentation } from "@/hooks/usePresentation";
import { fetchVerse, TRANSLATIONS } from "@/lib/bible";
import { toast } from "sonner";

export function QuickCast({ sessionId }: { sessionId: string | null }) {
  const [tab, setTab] = useState<"verse" | "text">("verse");
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-3">
      <div className="mb-3 flex gap-1 text-xs">
        <TabBtn active={tab === "verse"} onClick={() => setTab("verse")}>Bible</TabBtn>
        <TabBtn active={tab === "text"} onClick={() => setTab("text")}>Announcement</TabBtn>
      </div>
      {tab === "verse" ? <VersePanel sessionId={sessionId} /> : <TextPanel sessionId={sessionId} />}
    </div>
  );
}

function TabBtn({ active, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      {...p}
      className={`rounded-md px-3 py-1.5 font-semibold uppercase tracking-wider ${
        active ? "bg-emerald-500/15 text-emerald-200" : "text-white/50 hover:bg-white/5"
      }`}
    />
  );
}

function VersePanel({ sessionId }: { sessionId: string | null }) {
  const [ref, setRef] = useState("John 3:16");
  const [translation, setTranslation] = useState("web");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!sessionId) return;
    setBusy(true);
    try {
      const v = await fetchVerse(ref, translation);
      await updatePresentation(sessionId, {
        mode: "verse",
        current_song_id: null,
        current_slide_index: 0,
        payload: { verse_ref: `${v.reference} · ${v.translation_name}`, verse_text: v.text },
      });
      toast.success(`Live: ${v.reference}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <input
        value={ref}
        onChange={(e) => setRef(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && send()}
        placeholder="e.g. John 3:16 or Psalm 23:1-6"
        className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-emerald-400/50"
      />
      <div className="flex gap-2">
        <select
          value={translation}
          onChange={(e) => setTranslation(e.target.value)}
          className="flex-1 rounded-lg border border-white/10 bg-zinc-950 px-2 py-2 text-xs outline-none"
        >
          {TRANSLATIONS.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
        <button
          onClick={send}
          disabled={busy || !sessionId}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50"
        >
          {busy ? "…" : "Go Live"}
        </button>
      </div>
    </div>
  );
}

function TextPanel({ sessionId }: { sessionId: string | null }) {
  const [text, setText] = useState("");
  const [caption, setCaption] = useState("");
  const send = async () => {
    if (!sessionId || !text.trim()) return;
    await updatePresentation(sessionId, {
      mode: "verse", // re-use verse renderer for arbitrary text + caption
      current_song_id: null,
      current_slide_index: 0,
      payload: { verse_text: text.trim(), verse_ref: caption.trim() || undefined },
    });
    toast.success("Announcement live");
  };
  return (
    <div className="space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder="Welcome! Service starts at 10am…"
        className="w-full resize-none rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-emerald-400/50"
      />
      <div className="flex gap-2">
        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Caption (optional)"
          className="flex-1 rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-xs outline-none focus:border-emerald-400/50"
        />
        <button
          onClick={send}
          disabled={!sessionId || !text.trim()}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50"
        >
          Go Live
        </button>
      </div>
    </div>
  );
}
