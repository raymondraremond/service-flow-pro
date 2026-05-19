// Free, no-key Bible API: https://bible-api.com (public domain translations)
// Default translation: World English Bible (web). Supports kjv, bbe, etc.

export type BibleVerse = {
  reference: string;
  text: string;
  translation_name: string;
};

export async function fetchVerse(
  reference: string,
  translation: string = "web"
): Promise<BibleVerse> {
  const q = encodeURIComponent(reference.trim());
  const res = await fetch(`https://bible-api.com/${q}?translation=${translation}`);
  if (!res.ok) throw new Error("Verse not found");
  const data = await res.json();
  if (!data?.text) throw new Error("Verse not found");
  return {
    reference: data.reference ?? reference,
    text: String(data.text).trim().replace(/\s+\n/g, "\n").replace(/\n+/g, " "),
    translation_name: data.translation_name ?? translation.toUpperCase(),
  };
}

export const TRANSLATIONS = [
  { id: "web", label: "WEB (World English)" },
  { id: "kjv", label: "KJV (King James)" },
  { id: "bbe", label: "BBE (Basic English)" },
  { id: "oeb-us", label: "OEB (Open English)" },
  { id: "asv", label: "ASV (American Standard)" },
];
