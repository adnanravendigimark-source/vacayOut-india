/**
 * Pure parsers for the free research sources the content builder uses:
 * Wikivoyage wikitext (destinations, See/Do listings, section prose) and
 * Wikidata entity JSON (coordinates, altitude, official site, photo).
 * No I/O — the fetchers live in sources.ts — so everything here is unit-tested.
 */

export type WikiSection = { title: string; level: number; text: string };

/** Splits wikitext into sections by "== Heading ==" lines. Text before the first heading is the "Lead". */
export function splitSections(raw: string): WikiSection[] {
  const out: WikiSection[] = [];
  let cur: WikiSection = { title: "Lead", level: 1, text: "" };
  for (const line of raw.split("\n")) {
    const m = /^(={2,4})\s*([^=].*?)\s*\1\s*$/.exec(line);
    if (m) {
      out.push(cur);
      cur = { title: m[2].trim(), level: m[1].length, text: "" };
    } else cur.text += line + "\n";
  }
  out.push(cur);
  return out;
}

/** Text of a level-2 section including its subsections. */
export function sectionText(raw: string, titles: readonly string[]): string {
  const want = titles.map((t) => t.toLowerCase());
  const secs = splitSections(raw);
  let on = false;
  let text = "";
  for (const s of secs) {
    if (s.level <= 2) on = want.includes(s.title.toLowerCase());
    if (on) text += (s.level > 2 ? `\n${s.title}:\n` : "") + s.text;
  }
  return text;
}

/** Finds the matching "}}" for a template starting at `start` ("{{"). Returns the index after it, or -1. */
function templateEnd(s: string, start: number): number {
  let depth = 0;
  for (let i = start; i < s.length - 1; i++) {
    if (s[i] === "{" && s[i + 1] === "{") {
      depth++;
      i++;
    } else if (s[i] === "}" && s[i + 1] === "}") {
      depth--;
      i++;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

export type Template = { name: string; params: Record<string, string>; start: number; end: number };

/** Top-level templates in a piece of wikitext, with their named parameters. */
export function templates(s: string): Template[] {
  const out: Template[] = [];
  let i = s.indexOf("{{");
  while (i !== -1) {
    const end = templateEnd(s, i);
    if (end === -1) break;
    const body = s.slice(i + 2, end - 2);
    const parts: string[] = [];
    let depth = 0;
    let buf = "";
    for (let j = 0; j < body.length; j++) {
      const two = body.slice(j, j + 2);
      if (two === "{{" || two === "[[") {
        depth++;
        buf += two;
        j++;
      } else if (two === "}}" || two === "]]") {
        depth--;
        buf += two;
        j++;
      } else if (body[j] === "|" && depth === 0) {
        parts.push(buf);
        buf = "";
      } else buf += body[j];
    }
    parts.push(buf);
    const params: Record<string, string> = {};
    for (const p of parts.slice(1)) {
      const eq = p.indexOf("=");
      if (eq > 0) params[p.slice(0, eq).trim().toLowerCase()] = p.slice(eq + 1).trim();
    }
    out.push({ name: parts[0].trim().toLowerCase(), params, start: i, end });
    i = s.indexOf("{{", end);
  }
  return out;
}

/** Wikitext → readable plain text: links, bold/italic, refs, files, comments and non-listing templates removed. */
export function toPlain(s: string): string {
  let t = s
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<ref[^>]*\/>/gi, "")
    .replace(/<ref[\s\S]*?<\/ref>/gi, "");
  // Listings become "Name: content" so their facts are quotable.
  for (const tp of templates(t).reverse()) {
    let rep = "";
    if (LISTING.has(tp.name) || tp.name === "marker") {
      const name = linkText(tp.params.name ?? "");
      const content = tp.params.content ?? "";
      rep = [name, content].filter(Boolean).join(": ");
    } else if (tp.name === "station" || tp.name === "rint" || tp.name === "iata" || tp.name === "lang" || tp.name === "nowrap") {
      // Inline templates whose first positional value is readable text (station names, airport codes).
      rep = linkText(positional(t.slice(tp.start + 2, tp.end - 2), tp.name === "lang" ? 2 : 1) ?? "");
    }
    t = t.slice(0, tp.start) + rep + t.slice(tp.end);
  }
  return t
    .replace(/\[\[(?:file|image):[^\]]*(\[\[[^\]]*\]\][^\]]*)*\]\]/gi, "")
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, "$1")
    .replace(/\[https?:\/\/\S+\s+([^\]]+)\]/g, "$1")
    .replace(/\[https?:\/\/\S+\]/g, "")
    .replace(/'{2,}/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/^[*#:;]+\s*/gm, "• ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** The n-th unnamed parameter of a template body ("station|Mysuru Junction|city=india" → 1: "Mysuru Junction"). */
function positional(body: string, n: number): string | null {
  const parts = body.split("|").filter((p) => !/^\s*[a-z0-9_-]+\s*=/i.test(p));
  return parts[n]?.trim() || null;
}

function linkText(s: string) {
  return s.replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, "$1").replace(/'{2,}/g, "").trim();
}

function linkTarget(s: string) {
  const m = /\[\[([^|\]]+)/.exec(s);
  return m ? m[1].trim() : null;
}

const LISTING = new Set(["see", "do", "buy", "eat", "drink", "sleep", "go", "listing"]);

function num(v: string | undefined) {
  if (!v) return null;
  const n = Number(v.trim());
  return Number.isFinite(n) && v.trim() !== "" ? n : null;
}

export type WikiDestination = { name: string; article: string | null; description: string; lat: number | null; lng: number | null; image: string | null; wikidata: string | null; group: "city" | "other" };

/** Destinations listed under Cities/Towns and Other destinations of a region or state article. */
export function parseDestinations(raw: string): WikiDestination[] {
  const out: WikiDestination[] = [];
  const groups: [WikiDestination["group"], string[]][] = [
    ["city", ["Cities", "Towns", "Cities and towns", "Towns and villages"]],
    ["other", ["Other destinations"]],
  ];
  for (const [group, titles] of groups) {
    const text = sectionText(raw, titles);
    for (const item of text.split(/\n(?=\*)/)) {
      if (!item.trimStart().startsWith("*")) continue;
      const marker = templates(item).find((t) => t.name === "marker");
      let name: string;
      let article: string | null;
      let rest: string;
      if (marker) {
        name = linkText(marker.params.name ?? "");
        article = linkTarget(marker.params.name ?? "");
        rest = item.slice(marker.end);
      } else {
        const m = /\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/.exec(item);
        if (!m) continue;
        name = (m[2] ?? m[1]).trim();
        article = m[1].trim();
        rest = item.slice((m.index ?? 0) + m[0].length);
      }
      if (!name) continue;
      out.push({
        name,
        article,
        description: toPlain(rest.replace(/^\s*(&mdash;|—|–|-|:)\s*/, "")).replace(/^•\s*/, "").slice(0, 400),
        lat: num(marker?.params.lat),
        lng: num(marker?.params.long ?? marker?.params.lng),
        image: (marker?.params.image ?? "").trim() || null,
        wikidata: /^Q\d+$/.test(marker?.params.wikidata ?? "") ? marker!.params.wikidata : null,
        group,
      });
    }
  }
  const seen = new Set<string>();
  return out.filter((d) => !seen.has(d.name.toLowerCase()) && seen.add(d.name.toLowerCase()));
}

/** Region article links from a state's Regionlist, for states whose towns are listed one level down. */
export function parseRegions(raw: string): { name: string; article: string; items: string[]; description: string }[] {
  const t = templates(sectionText(raw, ["Regions"])).find((x) => x.name === "regionlist");
  if (!t) return [];
  const out = [];
  for (let i = 1; i <= 20; i++) {
    const n = t.params[`region${i}name`];
    if (!n) continue;
    const article = linkTarget(n) ?? linkText(n);
    out.push({
      name: linkText(n),
      article,
      items: (t.params[`region${i}items`] ?? "").split(",").map((s) => linkText(s)).filter(Boolean),
      description: toPlain(t.params[`region${i}description`] ?? "").slice(0, 400),
    });
  }
  return out;
}

export type WikiListing = { type: "see" | "do"; name: string; content: string; lat: number | null; lng: number | null; image: string | null; wikidata: string | null; url: string | null };

/** "See" and "Do" listings of a destination article (prices and hours are deliberately ignored). */
export function parseListings(raw: string): WikiListing[] {
  const out: WikiListing[] = [];
  for (const [type, titles] of [
    ["see", ["See"]],
    ["do", ["Do"]],
  ] as const) {
    for (const t of templates(sectionText(raw, titles))) {
      const kind = t.name === "listing" ? (t.params.type ?? "").toLowerCase() : t.name;
      if (kind !== "see" && kind !== "do") continue;
      const name = linkText(t.params.name ?? "");
      if (!name || name.length > 120) continue;
      out.push({
        type: kind === "see" ? "see" : type,
        name,
        content: toPlain(t.params.content ?? "").slice(0, 1200),
        lat: num(t.params.lat),
        lng: num(t.params.long ?? t.params.lng),
        image: (t.params.image ?? "").trim() || null,
        wikidata: /^Q\d+$/.test(t.params.wikidata ?? "") ? t.params.wikidata : null,
        url: /^https:\/\//.test(t.params.url ?? "") ? t.params.url : null,
      });
    }
  }
  return out;
}

export type WikidataInfo = { id: string; lat: number | null; lng: number | null; altitudeM: number | null; website: string | null; image: string | null; enwiki: string | null; enwikivoyage: string | null };

/** The few Wikidata properties the builder uses. */
export function parseWikidata(json: unknown, id: string): WikidataInfo | null {
  const e = (json as { entities?: Record<string, unknown> })?.entities?.[id] as
    | { claims?: Record<string, { mainsnak?: { datavalue?: { value?: unknown } }; rank?: string }[]>; sitelinks?: Record<string, { title?: string }> }
    | undefined;
  if (!e) return null;
  const first = (p: string) => {
    const cs = e.claims?.[p] ?? [];
    const c = cs.find((x) => x.rank === "preferred") ?? cs.find((x) => x.rank !== "deprecated");
    return c?.mainsnak?.datavalue?.value;
  };
  const coord = first("P625") as { latitude?: number; longitude?: number } | undefined;
  const elev = first("P2044") as { amount?: string; unit?: string } | undefined;
  const metres = elev?.amount && /Q11573$/.test(elev.unit ?? "") ? Math.round(Number(elev.amount)) : null;
  const site = first("P856");
  const img = first("P18");
  return {
    id,
    lat: typeof coord?.latitude === "number" ? coord.latitude : null,
    lng: typeof coord?.longitude === "number" ? coord.longitude : null,
    altitudeM: metres !== null && Number.isFinite(metres) && metres >= 0 && metres < 9000 ? metres : null,
    website: typeof site === "string" && /^https?:\/\//.test(site) ? site.replace(/^http:/, "https:") : null,
    image: typeof img === "string" ? img : null,
    enwiki: e.sitelinks?.enwiki?.title ?? null,
    enwikivoyage: e.sitelinks?.enwikivoyage?.title ?? null,
  };
}

/** India's bounding box (the content format rejects anything outside it). */
export function inIndia(lat: number | null, lng: number | null): boolean {
  return lat !== null && lng !== null && lat >= 6 && lat <= 38 && lng >= 68 && lng <= 98;
}
