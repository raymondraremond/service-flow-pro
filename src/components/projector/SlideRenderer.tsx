import type { PresentationState } from "@/hooks/usePresentation";
import { useEffect, useState } from "react";

export function SlideRenderer({ state }: { state: PresentationState | null }) {
  // Key changes when content changes -> triggers fade
  const k = state
    ? `${state.mode}-${state.current_slide_index}-${state.updated_at}`
    : "empty";

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <FadeLayer k={k}>
        <Inner state={state} />
      </FadeLayer>
    </div>
  );
}

function Inner({ state }: { state: PresentationState | null }) {
  if (!state || state.mode === "blank" || state.mode === "black") return <BlackScreen />;
  if (state.mode === "logo") return <LogoScreen />;
  if (state.mode === "slide") {
    const slides = state.payload?.slides ?? [];
    const text = slides[state.current_slide_index] ?? "";
    return <TextSlide text={text} caption={state.payload?.song_title} />;
  }
  if (state.mode === "verse") {
    return <TextSlide text={state.payload?.verse_text ?? ""} caption={state.payload?.verse_ref} />;
  }
  if (state.mode === "media") {
    const url = state.payload?.image_url;
    if (url) {
      return (
        <div className="flex h-screen w-screen items-center justify-center bg-black">
          <img src={url} alt="" className="max-h-full max-w-full object-contain" />
        </div>
      );
    }
    return <TextSlide text={state.payload?.announcement ?? ""} />;
  }
  return <BlackScreen />;
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
      className={`absolute inset-0 transition-opacity duration-300 ${show ? "opacity-100" : "opacity-0"}`}
    >
      {content}
    </div>
  );
}

function BlackScreen() {
  return <div className="h-screen w-screen bg-black" />;
}

function LogoScreen() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-black text-white">
      <div className="text-center">
        <div className="mx-auto mb-6 grid size-24 place-items-center rounded-full border-2 border-white/30">
          <span className="text-4xl">✝</span>
        </div>
        <div className="text-2xl font-light tracking-[0.4em] opacity-80">WELCOME</div>
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
    <div className="flex h-screen w-screen items-center justify-center bg-black p-[6vw] text-white">
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
