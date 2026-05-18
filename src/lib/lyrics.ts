// Split pasted lyrics into slides.
// Splits on blank lines. Drops common section labels like "Verse 1", "Chorus:" if alone.
const SECTION_LABEL = /^\s*(verse|chorus|bridge|pre[-\s]?chorus|intro|outro|tag|refrain|interlude|coda|ending)(\s*\d+)?\s*[:.)]?\s*$/i;

export function splitLyricsIntoSlides(raw: string): string[] {
  if (!raw) return [];
  const normalized = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!normalized) return [];

  const blocks = normalized.split(/\n{2,}/);
  const slides: string[] = [];

  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) continue;
    // strip a leading section label line if present
    if (lines.length > 1 && SECTION_LABEL.test(lines[0])) lines.shift();
    if (lines.length === 0) continue;
    slides.push(lines.join("\n"));
  }
  return slides.length ? slides : [normalized];
}
