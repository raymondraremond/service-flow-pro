import { useEffect, useState } from "react";
import { updateTheme, type SessionTheme } from "@/hooks/usePresentation";
import { toast } from "sonner";

const PRESET_BG = ["#000000", "#0c1024", "#0f1f1a", "#1a0f1f", "#1f150c", "#0c1a1f"];
const PRESET_ACCENT = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#a78bfa", "#ec4899"];

export function ThemePanel({
  sessionId,
  theme,
}: {
  sessionId: string | null;
  theme: SessionTheme | undefined;
}) {
  const [local, setLocal] = useState<SessionTheme>(theme ?? {});
  useEffect(() => setLocal(theme ?? {}), [theme]);

  const save = async (patch: SessionTheme) => {
    if (!sessionId) return;
    const next = { ...local, ...patch };
    setLocal(next);
    try {
      await updateTheme(sessionId, next);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-3">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/70">
        Theme
      </h3>

      <div className="mb-3">
        <div className="mb-1 text-[10px] uppercase tracking-wider text-white/40">Background</div>
        <div className="flex gap-1.5">
          {PRESET_BG.map((c) => (
            <button
              key={c}
              onClick={() => save({ bg: c })}
              className={`size-7 rounded-md border-2 transition ${
                (local.bg ?? "#000000") === c ? "border-emerald-400" : "border-white/10"
              }`}
              style={{ background: c }}
              title={c}
            />
          ))}
        </div>
      </div>

      <div className="mb-3">
        <div className="mb-1 text-[10px] uppercase tracking-wider text-white/40">Accent</div>
        <div className="flex gap-1.5">
          {PRESET_ACCENT.map((c) => (
            <button
              key={c}
              onClick={() => save({ accent: c })}
              className={`size-7 rounded-md border-2 transition ${
                (local.accent ?? "#10b981") === c ? "border-white" : "border-white/10"
              }`}
              style={{ background: c }}
              title={c}
            />
          ))}
        </div>
      </div>

      <div className="mb-3">
        <div className="mb-1 text-[10px] uppercase tracking-wider text-white/40">Font</div>
        <div className="flex gap-1">
          {(["sans", "serif", "display"] as const).map((f) => (
            <button
              key={f}
              onClick={() => save({ font: f })}
              className={`flex-1 rounded-md border px-2 py-1.5 text-xs capitalize ${
                (local.font ?? "sans") === f
                  ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-200"
                  : "border-white/10 text-white/60 hover:bg-white/5"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1 text-[10px] uppercase tracking-wider text-white/40">
          Welcome text (Logo screen)
        </div>
        <input
          value={local.welcome ?? ""}
          onChange={(e) => setLocal({ ...local, welcome: e.target.value })}
          onBlur={() => save({ welcome: local.welcome })}
          placeholder="WELCOME"
          className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-xs outline-none focus:border-emerald-400/50"
        />
      </div>
    </div>
  );
}
