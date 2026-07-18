import { useState } from "react";
import { updatePresentation } from "@/hooks/usePresentation";
import { toast } from "sonner";

export function MediaCast({ sessionId }: { sessionId: string | null }) {
  const [url, setUrl] = useState("");

  const send = async () => {
    if (!sessionId || !url.trim()) return;
    try {
      await updatePresentation(sessionId, {
        mode: "media",
        current_song_id: null,
        current_slide_index: 0,
        payload: { image_url: url.trim() },
      });
      toast.success("Media live");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/60">
        Cast image / media URL
      </div>
      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="https://…/image.jpg"
          className="flex-1 rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-emerald-400/50"
        />
        <button
          onClick={send}
          disabled={!sessionId || !url.trim()}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50"
        >
          Go Live
        </button>
      </div>
      <div className="mt-1.5 text-[11px] text-white/40">
        Paste any public image URL — displayed fullscreen on the projector.
      </div>
    </div>
  );
}
