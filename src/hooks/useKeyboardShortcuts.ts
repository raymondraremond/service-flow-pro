import { useEffect } from "react";

type Handlers = {
  onNext?: () => void;
  onPrev?: () => void;
  onBlack?: () => void;
  onLogo?: () => void;
  onClear?: () => void;
};

export function useKeyboardShortcuts(h: Handlers, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        h.onNext?.();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        h.onPrev?.();
      } else if (e.key.toLowerCase() === "b") {
        h.onBlack?.();
      } else if (e.key.toLowerCase() === "l") {
        h.onLogo?.();
      } else if (e.key.toLowerCase() === "c" || e.key === "Escape") {
        h.onClear?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [h, enabled]);
}
