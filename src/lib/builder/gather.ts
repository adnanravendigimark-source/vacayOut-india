import "server-only";
import { bestCommonsPhoto } from "@/lib/media/import";
import { slugify } from "@/lib/places/slug";
import { fetchArticle, fetchWikidata, wikidataIdOf, type Article } from "./sources";
import { sentencesOf, type Sentence } from "./sentences";
import { inIndia, parseDestinations, parseListings, sectionText, toPlain, type WikiDestination, type WikidataInfo } from "./wiki";
import type { PlaceDraft, Source } from "./pack";

/**
 * Research for one build step, from free sources only. Returns the places to
 * write (with coordinates and a Commons photo when one exists), the numbered
 * source sentences and the sources they come from.
 */

export type Research = { drafts: PlaceDraft[]; sentences: Sentence[]; sources: Record<string, Source>; notes: string[] };

/** Destinations the state article lists, best first (cities, then other destinations). */
export type Candidate = Pick<WikiDestination, "name" | "article" | "lat" | "lng" | "wikidata" | "image" | "description"> & { group?: WikiDestination["group"] };

const commonsTitle = (img: string | null | undefined) => {
  const t = (img ?? "").replace(/^(?:File|Image):/i, "").trim();
  return t && /\.(jpe?g|png|webp)$/i.test(t) ? `File:${t}` : null;
};

const sourceOf = (a: Article, label: string): Source => ({
  url: a.url,
  title: `${label} — ${a.site === "wikivoyage" ? "Wikivoyage" : "Wikipedia"}`.slice(0, 200),
  authority: a.site === "wikivoyage" ? "travel_platform" : "reference",
});

/** A freely licensed Commons photo that names the place (search fallback when Wikidata has none). */
async function searchPhoto(name: string, where: string): Promise<string | null> {
  try {
    const f = await bestCommonsPhoto(`${name} ${where}`, name);
    return commonsTitle(f?.title);
  } catch {
    return null;
  }
}

/** Lead section (text before the first heading) as plain text. */
const lead = (raw: string) => toPlain(sectionText(raw, ["Lead"]));

/** State article → candidate destinations. */
export async function stateCandidates(stateName: string): Promise<{ article: Article | null; candidates: Candidate[] }> {
  const article = await fetchArticle("wikivoyage", stateName);
  if (!article) return { article: null, candidates: [] };
  return { article, candidates: parseDestinations(article.raw).filter((d) => d.article) };
}

async function wikidataFor(id: string | null, a: Article | null): Promise<WikidataInfo | null> {
  const qid = id ?? (a ? await wikidataIdOf(a.site, a.title) : null);
  return qid ? fetchWikidata(qid) : null;
}

/** Research the state page itself. */
export async function gatherState(input: { stateKey: string; stateName: string; wv: Article | null }): Promise<Research | { error: string }> {
  const wv = input.wv ?? (await fetchArticle("wikivoyage", input.stateName));
  const wd = await wikidataFor(null, wv);
  const wp = await fetchArticle("wikipedia", wd?.enwiki ?? input.stateName);
  if (!wv && !wp) return { error: `No Wikivoyage or Wikipedia article for ${input.stateName}` };
  const sources: Record<string, Source> = {};
  const sentences: Sentence[] = [];
  const add = (a: Article, id: string, label: string, plain: string, max: number) => {
    sources[id] = sourceOf(a, label);
    sentences.push(...sentencesOf(plain, id, sentences.length + 1, max));
  };
  const S = input.stateKey.toUpperCase().replace(/-/g, "_");
  if (wv) {
    add(wv, `${S}_WV`, input.stateName, [lead(wv.raw), toPlain(sectionText(wv.raw, ["Understand"]))].join("\n"), 30);
    const regions = parseRegionsText(wv.raw);
    if (regions) sentences.push(...sentencesOf(regions, `${S}_WV`, sentences.length + 1, 12));
    for (const [titles, max] of [[["Get in"], 14], [["Get around"], 10], [["Eat", "Eat and drink"], 8], [["Respect"], 6], [["Stay safe", "Stay healthy"], 6], [["Climate"], 6]] as const)
      sentences.push(...sentencesOf(toPlain(sectionText(wv.raw, [...titles])), `${S}_WV`, sentences.length + 1, max));
  }
  if (wp) add(wp, `${S}_WP`, input.stateName, lead(wp.raw), 18);
  const lat = wd?.lat ?? null;
  const lng = wd?.lng ?? null;
  if (!inIndia(lat, lng)) return { error: `No map position found for ${input.stateName}` };
  const image = commonsTitle(wd?.image) ?? (await searchPhoto(input.stateName, "India"));
  return {
    drafts: [{ ref: "D", key: input.stateKey, name: input.stateName, kind: "state", lat: lat!, lng: lng!, ...(wd?.id ? { wikidataId: wd.id } : {}), image, location: "India" }],
    sentences,
    sources,
    notes: [],
  };
}

/** "Region: description" lines from the Regions section, so region facts are quotable. */
function parseRegionsText(raw: string): string {
  const t = sectionText(raw, ["Regions"]);
  const out: string[] = [];
  for (const m of t.matchAll(/region\d+name\s*=\s*([^|\n]+)[\s\S]*?region\d+description\s*=\s*([^|\n}]+)/g)) {
    const name = toPlain(m[1]).trim();
    const desc = toPlain(m[2]).trim();
    if (name && desc) out.push(`${name}: ${desc}${/[.!?]$/.test(desc) ? "" : "."}`);
  }
  return out.join("\n");
}

/** Research one destination and up to `maxSights` of its sights. */
export async function gatherDestination(input: {
  stateKey: string;
  stateName: string;
  candidate: Candidate;
  maxSights: number;
  /** Slugs already used in this state, and Wikidata ids already in VacayOut: these are never written again. */
  takenSlugs: Set<string>;
  takenWikidata: Set<string>;
}): Promise<Research | { error: string }> {
  const c = input.candidate;
  const wv = await fetchArticle("wikivoyage", c.article ?? c.name);
  const wd = await wikidataFor(c.wikidata, wv);
  if (wd?.id && input.takenWikidata.has(wd.id)) return { error: `${c.name} is already in VacayOut` };
  const wp = await fetchArticle("wikipedia", wd?.enwiki ?? c.name);
  if (!wv && !wp) return { error: `No Wikivoyage or Wikipedia article for ${c.name}` };
  const lat = c.lat ?? wd?.lat ?? null;
  const lng = c.lng ?? wd?.lng ?? null;
  if (!inIndia(lat, lng)) return { error: `No map position found for ${c.name}` };
  const slug = slugify(c.name);
  if (!slug || input.takenSlugs.has(slug)) return { error: `${c.name} is already in VacayOut` };
  input.takenSlugs.add(slug);
  const key = `${input.stateKey}/${slug}`;
  const P = slug.toUpperCase().replace(/-/g, "_").slice(0, 40);
  const location = `${input.stateName}, India`;
  const drafts: PlaceDraft[] = [
    { ref: "D", key, name: c.name, kind: "city", lat: lat!, lng: lng!, ...(wd?.id ? { wikidataId: wd.id } : {}), image: commonsTitle(wd?.image) ?? commonsTitle(c.image) ?? (await searchPhoto(c.name, input.stateName)), location },
  ];
  if (wd?.id) input.takenWikidata.add(wd.id);
  const sources: Record<string, Source> = {};
  const sentences: Sentence[] = [];
  const notes: string[] = [];
  const add = (id: string, plain: string, max: number) => sentences.push(...sentencesOf(plain, id, sentences.length + 1, max));

  if (wv) {
    sources[`${P}_WV`] = sourceOf(wv, c.name);
    add(`${P}_WV`, [lead(wv.raw), toPlain(sectionText(wv.raw, ["Understand"]))].join("\n"), 24);
    for (const [titles, max] of [[["Get in"], 12], [["Get around"], 8], [["Do"], 10], [["Eat"], 6], [["Respect"], 4], [["Stay safe", "Stay healthy"], 5], [["Climate"], 5]] as const)
      add(`${P}_WV`, toPlain(sectionText(wv.raw, [...titles])), max);
  }
  if (wp) {
    sources[`${P}_WP`] = sourceOf(wp, c.name);
    add(`${P}_WP`, lead(wp.raw), 14);
  }

  // Sights: "See" listings, the ones with a Wikidata item (notable) first.
  if (wv && input.maxSights > 0) {
    const listings = parseListings(wv.raw)
      .filter((l) => l.type === "see" && l.content.length >= 60)
      .sort((a, b) => Number(Boolean(b.wikidata)) - Number(Boolean(a.wikidata)) || b.content.length - a.content.length);
    let n = 0;
    for (const l of listings) {
      if (n >= input.maxSights) break;
      const s = slugify(l.name);
      if (!s || input.takenSlugs.has(s) || (l.wikidata && input.takenWikidata.has(l.wikidata))) continue;
      const swd = l.wikidata ? await fetchWikidata(l.wikidata).catch(() => null) : null;
      const slat = l.lat ?? swd?.lat ?? null;
      const slng = l.lng ?? swd?.lng ?? null;
      if (!inIndia(slat, slng)) continue;
      const image = commonsTitle(swd?.image) ?? commonsTitle(l.image);
      const swp = swd?.enwiki ? await fetchArticle("wikipedia", swd.enwiki).catch(() => null) : null;
      if (!swp && l.content.length < 200) continue; // too little to write a page from
      n++;
      input.takenSlugs.add(s);
      if (swd?.id) input.takenWikidata.add(swd.id);
      const ref = `P${n}`;
      drafts.push({ ref, key: `${input.stateKey}/${s}`, name: l.name, kind: "attraction", parent: key, lat: slat!, lng: slng!, ...(swd?.id ? { wikidataId: swd.id } : {}), image, location: `${c.name}, ${input.stateName}` });
      if (wv) add(`${P}_WV`, `${l.name}:\n${l.content}`, 5);
      if (swp) {
        const id = `${P}_${s.toUpperCase().replace(/-/g, "_").slice(0, 30)}_WP`;
        sources[id] = sourceOf(swp, l.name);
        add(id, lead(swp.raw), 10);
      }
    }
  }
  if (sentences.length < 8) return { error: `Too little source material for ${c.name}` };
  return { drafts, sentences, sources, notes };
}
