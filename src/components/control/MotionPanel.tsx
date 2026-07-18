import { useEffect, useState } from "react";
import { updateTheme, type SessionTheme } from "@/hooks/usePresentation";
import { MOTION_PRESETS, MOTION_CATEGORIES, type MotionPreset } from "@/lib/motionBackgrounds";
import { toast } from "sonner";

export function MotionPanel({
  sessionId,
  theme,
}: {
  sessionId: string | null;
  theme: SessionTheme | undefined;
}) {
  const [cat, setCat] = useState<MotionPreset["category"]>("Worship");
  const [url, setUrl] = useState("");
  const [dim, setDim] = useState<number>(theme?.bg_video_dim ?? 0.45);

  useEffect(() => {
    setDim(theme?.bg_video_dim ?? 0.45);
  }, [theme?.bg_video_dim]);

  const apply = async (patch: SessionTheme) => {
    if (!sessionId) return;
    try {
      await updateTheme(sessionId, { ...(theme ?? {}), ...patch });
      if (patch.bg_video_url === "") toast.success("Motion cleared");
      else if (patch.bg_video_url) toast.success("Motion live");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const current = theme?.bg_video_url ?? "";
  const filtered = MOTION_PRESETS.filter((p) => p.category === cat);

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white/70">
          Motion Backgrounds
        </h3>
        {current && (
          <button
            onClick={() => apply({ bg_video_url: "" })}
            className="rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-red-300 hover:bg-red-500/10"
          >
            Clear
          </button>
        )}
      </div>

      <div className="mb-2 flex flex-wrap gap-1 text-[10px]">
        {MOTION_CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`rounded-md px-2 py-1 font-semibold uppercase tracking-wider ${
              cat === c
                ? "bg-emerald-500/15 text-emerald-200"
                : "text-white/50 hover:bg-white/5"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        {filtered.map((p) => {
          const active = current === p.url;
          return (
            <button
              key={p.id}
              onClick={() => apply({ bg_video_url: p.url })}
              className={`group relative aspect-video overflow-hidden rounded-lg border transition ${
                active
                  ? "border-emerald-400 ring-2 ring-emerald-400/40"
                  : "border-white/10 hover:border-white/30"
              }`}
              title={p.label}
            >
              <video
                src={p.url}
                muted
                loop
                playsInline
                autoPlay
                preload="metadata"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1 text-left text-[10px] font-semibold text-white">
                {p.label}
              </div>
              {active && (
                <div className="absolute right-1 top-1 rounded bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold uppercase text-black">
                  Live
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="mb-3">
        <div className="mb-1 text-[10px] uppercase tracking-wider text-white/40">
          Dim overlay ({Math.round(dim * 100)}%)
        </div>
        <input
          type="range"
          min={0}
          max={0.85}
          step={0.05}
          value={dim}
          onChange={(e) => setDim(parseFloat(e.target.value))}
          onMouseUp={() => apply({ bg_video_dim: dim })}
          onTouchEnd={() => apply({ bg_video_dim: dim })}
          className="w-full accent-emerald-400"
        />
      </div>

      <div>
        <div className="mb-1 text-[10px] uppercase tracking-wider text-white/40">
          Custom video URL (mp4 / webm)
        </div>
        <div className="flex gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…/loop.mp4"
            className="flex-1 rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-xs outline-none focus:border-emerald-400/50"
          />
          <button
            onClick={() => url.trim() && apply({ bg_video_url: url.trim() })}
            disabled={!url.trim()}
            className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-black hover:bg-emerald-400 disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
