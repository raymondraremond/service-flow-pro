import { useEffect, useState } from "react";
import { updateOverlay, type Overlay } from "@/hooks/usePresentation";
import { toast } from "sonner";

type Props = {
  sessionId: string | null;
  current: Overlay | undefined;
};

const PRESETS = [
  "Parent needed in the nursery",
  "Please silence your phones",
  "Offering bags coming around",
  "Children dismissed to kids' church",
];

export function AlertBar({ sessionId, current }: Props) {
  const [text, setText] = useState("");
  const [urgent, setUrgent] = useState(false);

  useEffect(() => {
    setText(current?.alert ?? "");
    setUrgent(current?.alert_kind === "urgent");
  }, [current?.alert, current?.alert_kind]);

  const isLive = !!current?.alert?.trim();

  const push = async (override?: string, urgentOverride?: boolean) => {
    if (!sessionId) return;
    const t = (override ?? text).trim();
    if (!t) return;
    try {
      await updateOverlay(sessionId, {
        alert: t,
        alert_kind: (urgentOverride ?? urgent) ? "urgent" : "info",
      });
      toast.success("Alert live");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };
  const clear = async () => {
    if (!sessionId) return;
    await updateOverlay(sessionId, {});
    setText("");
    toast.message("Alert cleared");
  };

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white/70">
          Live Alert
        </h3>
        {isLive && (
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-300">
            <span className="size-2 animate-pulse rounded-full bg-red-400" />
            On screen
          </span>
        )}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="Lower-third message…"
        className="w-full resize-none rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-emerald-400/50"
      />
      <div className="mt-2 flex items-center gap-2">
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-white/60">
          <input
            type="checkbox"
            checked={urgent}
            onChange={(e) => setUrgent(e.target.checked)}
            className="accent-red-500"
          />
          Urgent
        </label>
        <div className="flex-1" />
        <button
          onClick={clear}
          disabled={!isLive}
          className="rounded-md border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5 disabled:opacity-40"
        >
          Clear
        </button>
        <button
          onClick={() => push()}
          disabled={!sessionId || !text.trim()}
          className="rounded-md bg-emerald-500 px-4 py-1.5 text-xs font-bold text-black hover:bg-emerald-400 disabled:opacity-40"
        >
          Push
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => {
              setText(p);
              push(p, false);
            }}
            className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-white/60 hover:bg-white/5 hover:text-white"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
