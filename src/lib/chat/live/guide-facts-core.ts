import type { PublishedSnapshot } from "@/lib/db/schema";

/** Pure helpers for ./guide-facts.ts (no database). */
export type Dest = { key: string; name: string; placeId: string };

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Published destinations named in the text, longest names first, at most `max`. */
export function namedIn(text: string, list: Dest[], max = 2): Dest[] {
  let t = ` ${text.toLowerCase()} `;
  const out: Dest[] = [];
  for (const d of list) {
    const re = new RegExp(`(^|[^\\p{L}])${esc(d.key)}(?=[^\\p{L}]|$)`, "u");
    if (!re.test(t)) continue;
    out.push(d);
    t = t.replace(re, "$1 ");
    if (out.length >= max) break;
  }
  return out;
}

const firstSentence = (s: string) => (s.match(/^[^.!?\n]{10,220}[.!?]/)?.[0] ?? s.slice(0, 200)).trim();
const text = (body: unknown): string => (body && typeof body === "object" && typeof (body as { text?: unknown }).text === "string" ? (body as { text: string }).text : "");
const itemsOf = (body: unknown): { title?: string; body?: string }[] =>
  body && typeof body === "object" && Array.isArray((body as { items?: unknown }).items) ? ((body as { items: { title?: string; body?: string }[] }).items) : [];

/** Facts for one destination: key facts (title: value), then best time and how to reach if not already there. */
export function factsFromSnapshot(name: string, snap: Pick<PublishedSnapshot, "sections">, budget: number): string {
  const sec = (k: string) => snap.sections.find((x) => x.key === k)?.body;
  const parts: string[] = [];
  for (const it of itemsOf(sec("key_facts")).slice(0, 6)) {
    if (it.title && it.body) parts.push(`${it.title}: ${it.body.replace(/\s+/g, " ").slice(0, 90)}`);
  }
  const has = (re: RegExp) => parts.some((p) => re.test(p));
  const best = text(sec("best_time"));
  if (best && !has(/best time|season/i)) parts.push(`Best time: ${firstSentence(best)}`);
  const reach = text(sec("how_to_reach"));
  if (reach && !has(/airport|rail|reach/i)) parts.push(`Getting there: ${firstSentence(reach)}`);
  const kept: string[] = [];
  let len = name.length + 3;
  for (const p of parts.map((x) => x.replace(/[.;\s]+$/, ""))) {
    if (len + p.length + 2 > budget) break;
    kept.push(p);
    len += p.length + 2;
  }
  return kept.length ? `${name} — ${kept.join("; ")}.` : "";
}

