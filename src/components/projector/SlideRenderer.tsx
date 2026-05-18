import type { PresentationState } from "@/hooks/usePresentation";

export function SlideRenderer({ state }: { state: PresentationState | null }) {
  if (!state || state.mode === "blank") return <BlackScreen />;
  if (state.mode === "black") return <BlackScreen />;
  if (state.mode === "logo") return <LogoScreen />;

  if (state.mode === "slide") {
    const slides = state.payload?.slides ?? [];
    const text = slides[state.current_slide_index] ?? "";
    return <TextSlide text={text} />;
  }
  if (state.mode === "verse") {
    return (
      <TextSlide
        text={state.payload?.verse_text ?? ""}
        caption={state.payload?.verse_ref ?? ""}
      />
    );
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
        <div className="text-2xl font-light tracking-widest opacity-80">WELCOME</div>
      </div>
    </div>
  );
}

function TextSlide({ text, caption }: { text: string; caption?: string }) {
  // Auto-scale text size based on line count and longest line length
  const lines = text.split("\n");
  const lineCount = Math.max(lines.length, 1);
  const longest = Math.max(...lines.map((l) => l.length), 1);
  // simple heuristic
  let size = 96;
  if (lineCount > 4 || longest > 40) size = 72;
  if (lineCount > 6 || longest > 60) size = 56;
  if (lineCount > 8 || longest > 80) size = 44;

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-black p-16 text-white">
      <div className="max-w-[90vw] text-center">
        <div
          className="whitespace-pre-line font-medium leading-[1.25] tracking-tight"
          style={{ fontSize: `${size}px` }}
        >
          {text}
        </div>
        {caption ? (
          <div className="mt-10 text-2xl tracking-widest text-white/60">{caption}</div>
        ) : null}
      </div>
    </div>
  );
}
