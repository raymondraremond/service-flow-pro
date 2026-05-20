import type { PresentationState, SessionTheme } from "@/hooks/usePresentation";
import { useEffect, useState } from "react";

type Props = { state: PresentationState | null; theme?: SessionTheme };

export function SlideRenderer({ state, theme }: Props) {
  const bg = theme?.bg ?? "#000000";
  const accent = theme?.accent ?? "#10b981";
  const fontClass =
    theme?.font === "serif"
      ? "font-serif"
      : theme?.font === "display"
      ? "tracking-tight"
      : "font-sans";

  const k = state
    ? `${state.mode}-${state.current_slide_index}-${state.updated_at}`
    : "empty";

  return (
    <div
      className={`relative h-screen w-screen overflow-hidden ${fontClass}`}
      style={{ background: bg }}
    >
      <FadeLayer k={k}>
        <Inner state={state} theme={theme} accent={accent} />
      </FadeLayer>
      <AlertOverlay overlay={state?.overlay} />
    </div>
  );
}

function Inner({
  state,
  theme,
  accent,
}: {
  state: PresentationState | null;
  theme?: SessionTheme;
  accent: string;
}) {
  if (!state || state.mode === "blank") return null;
  if (state.mode === "black") return <div className="h-screen w-screen bg-black" />;
  if (state.mode === "logo") return <LogoScreen welcome={theme?.welcome} accent={accent} />;
  if (state.mode === "countdown") {
    return (
      <CountdownScreen
        target={state.payload?.countdown_to}
        message={state.payload?.countdown_message}
        accent={accent}
      />
    );
  }
  if (state.mode === "slide") {
    const slides = state.payload?.slides ?? [];
    const text = slides[state.current_slide_index] ?? "";
    return <TextSlide text={text} caption={state.payload?.song_title} />;
  }
  if (state.mode === "verse") {
    return (
      <TextSlide
        text={state.payload?.verse_text ?? ""}
        caption={state.payload?.verse_ref}
      />
    );
  }
  if (state.mode === "media") {
    const url = state.payload?.image_url;
    if (url) {
      return (
        <div className="flex h-screen w-screen items-center justify-center">
          <img src={url} alt="" className="max-h-full max-w-full object-contain" />
        </div>
      );
    }
    return <TextSlide text={state.payload?.announcement ?? ""} />;
  }
  return null;
}

function FadeLayer({ k, children }: { k: string; children: React.ReactNode }) {
  const [show, setShow] = useState(true);
  const [content, setContent] = useState(children);
  useEffect(() => {
    setShow(false);
    const t = setTimeout(() => {
      setContent(children);
      setShow(true);
    }, 140);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k]);
  return (
    <div
      className={`absolute inset-0 transition-opacity duration-300 ${
        show ? "opacity-100" : "opacity-0"
      }`}
    >
      {content}
    </div>
  );
}

function LogoScreen({ welcome, accent }: { welcome?: string; accent: string }) {
  return (
    <div className="flex h-screen w-screen items-center justify-center text-white">
      <div className="text-center">
        <div
          className="mx-auto mb-8 grid size-28 place-items-center rounded-full border-2"
          style={{ borderColor: `${accent}80` }}
        >
          <span className="text-5xl" style={{ color: accent }}>✝</span>
        </div>
        <div className="text-3xl font-light tracking-[0.4em] opacity-90">
          {welcome?.trim() || "WELCOME"}
        </div>
      </div>
    </div>
  );
}

function CountdownScreen({
  target,
  message,
  accent,
}: {
  target?: string;
  message?: string;
  accent: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  const ms = target ? Math.max(0, new Date(target).getTime() - now) : 0;
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const display =
    h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      : `${m}:${String(s).padStart(2, "0")}`;
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center text-white">
      <div className="mb-6 text-xl uppercase tracking-[0.45em] opacity-70">
        {message?.trim() || "Service starts in"}
      </div>
      <div
        className="font-light leading-none tabular-nums"
        style={{ fontSize: "22vw", color: ms === 0 ? accent : "white" }}
      >
        {display}
      </div>
    </div>
  );
}

function TextSlide({ text, caption }: { text: string; caption?: string }) {
  const lines = text.split("\n");
  const lineCount = Math.max(lines.length, 1);
  const longest = Math.max(...lines.map((l) => l.length), 1);
  let size = 96;
  if (lineCount > 4 || longest > 40) size = 80;
  if (lineCount > 6 || longest > 60) size = 60;
  if (lineCount > 8 || longest > 90) size = 46;
  if (lineCount > 12 || longest > 140) size = 36;

  return (
    <div className="flex h-screen w-screen items-center justify-center p-[6vw] text-white">
      <div className="max-w-[88vw] text-center">
        <div
          className="whitespace-pre-line font-medium leading-[1.25] tracking-tight"
          style={{ fontSize: `${size}px`, textShadow: "0 2px 16px rgba(0,0,0,0.6)" }}
        >
          {text}
        </div>
        {caption ? (
          <div className="mt-12 text-2xl uppercase tracking-[0.35em] text-white/55">
            {caption}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AlertOverlay({ overlay }: { overlay?: { alert?: string; alert_kind?: string } }) {
  const text = overlay?.alert?.trim();
  if (!text) return null;
  const urgent = overlay?.alert_kind === "urgent";
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 p-[2vw]">
      <div
        className={`mx-auto max-w-[92vw] rounded-2xl px-8 py-5 text-center text-white shadow-2xl backdrop-blur ${
          urgent ? "animate-pulse bg-red-600/90" : "bg-black/70"
        }`}
        style={{ fontSize: "2.4vw", lineHeight: 1.3 }}
      >
        {urgent && <span className="mr-3 inline-block">⚠</span>}
        {text}
      </div>
    </div>
  );
}
