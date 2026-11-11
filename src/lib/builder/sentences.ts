/**
 * Source text → numbered sentences. The writing model may only cite these
 * numbers, and each cited sentence becomes a fact's quote VERBATIM, so a
 * quote can never be made up. Pure: unit-tested.
 */

export type Sentence = { n: number; source: string; text: string; heading: string | null };

/** Words before a full stop that don't end a sentence. */
const ABBREV = /\b(?:approx|ca|c|e\.g|i\.e|etc|km|kms|mt|mts|no|nos|rs|st|dr|mr|mrs|ms|jr|sr|vs|ft|hrs|min|sq|govt|dept|ave|rd|nh|sh|ac|a\.c)\.$/i;

/** Splits a paragraph into sentences (keeps the full stop). Conservative: an odd split only costs a citation. */
export function splitSentences(paragraph: string): string[] {
  const out: string[] = [];
  let buf = "";
  const parts = paragraph.split(/(?<=[.!?])\s+(?=["'“(]?[A-Z0-9])/);
  for (const p of parts) {
    buf = buf ? `${buf} ${p}` : p;
    if (ABBREV.test(buf) || /\b[A-Z]\.$/.test(buf)) continue;
    out.push(buf.trim());
    buf = "";
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

/**
 * Numbered sentences from plain text (the output of wiki.ts toPlain). Lines
 * ending in ":" are treated as headings. Very short or very long fragments
 * and leftover markup are skipped.
 */
export function sentencesOf(plain: string, source: string, startAt: number, max: number): Sentence[] {
  const out: Sentence[] = [];
  let heading: string | null = null;
  for (const raw of plain.split(/\n+/)) {
    const line = raw.replace(/^•\s*/, "").replace(/\s+/g, " ").trim();
    if (!line) continue;
    if (line.length < 60 && /:$/.test(line)) {
      heading = line.slice(0, -1);
      continue;
    }
    for (const s of splitSentences(line)) {
      if (out.length >= max) return out;
      if (s.length < 25 || s.length > 600) continue;
      if (/[{}[\]|]|https?:|\(\s*\)/.test(s)) continue;
      out.push({ n: startAt + out.length, source, text: s, heading });
    }
  }
  return out;
}

/** "S12 [Get in] text" lines for the prompt. */
export function sentenceList(ss: Sentence[]): string {
  return ss.map((s) => `S${s.n}${s.heading ? ` [${s.heading}]` : ""} ${s.text}`).join("\n");
}
