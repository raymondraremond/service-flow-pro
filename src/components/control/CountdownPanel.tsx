import { useState } from "react";
import { updatePresentation } from "@/hooks/usePresentation";
import { toast } from "sonner";

export function CountdownPanel({ sessionId }: { sessionId: string | null }) {
  const [minutes, setMinutes] = useState(5);
  const [message, setMessage] = useState("Service starts in");

  const start = async (m: number) => {
    if (!sessionId) return;
    const target = new Date(Date.now() + m * 60_000).toISOString();
    await updatePresentation(sessionId, {
      mode: "countdown",
      current_song_id: null,
      current_slide_index: 0,
      payload: { countdown_to: target, countdown_message: message.trim() },
    });
    toast.success(`Countdown started: ${m} min`);
  };

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/70">
        Countdown
      </h3>
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Message"
        className="mb-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-xs outline-none focus:border-emerald-400/50"
      />
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          max={120}
          value={minutes}
          onChange={(e) => setMinutes(parseInt(e.target.value) || 1)}
          className="w-16 rounded-lg border border-white/10 bg-zinc-950 px-2 py-2 text-center text-sm outline-none focus:border-emerald-400/50"
        />
        <span className="text-xs text-white/50">min</span>
        <div className="flex-1" />
        <button
          onClick={() => start(minutes)}
          disabled={!sessionId}
          className="rounded-md bg-emerald-500 px-4 py-1.5 text-xs font-bold text-black hover:bg-emerald-400 disabled:opacity-40"
        >
          Start
        </button>
      </div>
      <div className="mt-2 flex gap-1">
        {[1, 5, 10, 15].map((m) => (
          <button
            key={m}
            onClick={() => start(m)}
            className="flex-1 rounded-md border border-white/10 px-2 py-1 text-[11px] text-white/60 hover:bg-white/5 hover:text-white"
          >
            {m}m
          </button>
        ))}
      </div>
    </div>
  );
}
