import "server-only";
import { parseWikidata, type WikidataInfo } from "./wiki";

/**
 * Fetchers for the free research sources: English Wikivoyage and Wikipedia
 * (raw wikitext of one article) and Wikidata (one entity). Fixed hosts only —
 * titles are URL-encoded, so nothing from a page can redirect a request
 * elsewhere (no SSRF surface). Wikimedia asks for a descriptive User-Agent.
 */

const UA = "VacayOutBuilder/1.0 (+https://vacayout-india.vercel.app; content research)";
const MAX_BYTES = 1_500_000;

export type Site = "wikivoyage" | "wikipedia";
export type Article = { site: Site; title: string; url: string; raw: string };

const HOST: Record<Site, string> = { wikivoyage: "en.wikivoyage.org", wikipedia: "en.wikipedia.org" };

async function get(url: string, accept: string): Promise<Response | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: { "user-agent": UA, accept }, signal: AbortSignal.timeout(20_000), redirect: "follow" });
    if (res.status === 404) return null;
    if (res.ok) return res;
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      continue;
    }
    throw new Error(`${new URL(url).host} answered ${res.status}`);
  }
  throw new Error(`${new URL(url).host} is busy (rate limited) — the step will retry`);
}

async function text(res: Response): Promise<string> {
  const body = await res.text();
  return body.length > MAX_BYTES ? body.slice(0, MAX_BYTES) : body;
}

export const articleUrl = (site: Site, title: string) => `https://${HOST[site]}/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;

/** One article's wikitext, following up to two redirects. Null when the article doesn't exist. */
export async function fetchArticle(site: Site, title: string): Promise<Article | null> {
  let t = title.trim();
  for (let hop = 0; hop < 3 && t; hop++) {
    const res = await get(`https://${HOST[site]}/w/index.php?title=${encodeURIComponent(t)}&action=raw`, "text/plain");
    if (!res) return null;
    const raw = await text(res);
    const redirect = /^#REDIRECT\s*\[\[([^\]|#]+)/i.exec(raw.trim());
    if (redirect) {
      t = redirect[1].trim();
      continue;
    }
    if (!raw.trim()) return null;
    return { site, title: t, url: articleUrl(site, t), raw };
  }
  return null;
}

/** The few Wikidata facts the builder uses (coordinates, photo, sitelinks). */
export async function fetchWikidata(id: string): Promise<WikidataInfo | null> {
  if (!/^Q\d+$/.test(id)) return null;
  const res = await get(`https://www.wikidata.org/wiki/Special:EntityData/${id}.json`, "application/json");
  if (!res) return null;
  try {
    return parseWikidata(JSON.parse(await text(res)), id);
  } catch {
    return null;
  }
}

/** Wikidata id of an article (best effort: null on any problem). */
export async function wikidataIdOf(site: Site, title: string): Promise<string | null> {
  try {
    const res = await get(`https://${HOST[site]}/w/api.php?action=query&prop=pageprops&ppprop=wikibase_item&redirects=1&format=json&titles=${encodeURIComponent(title)}`, "application/json");
    if (!res) return null;
    const j = (await res.json()) as { query?: { pages?: Record<string, { pageprops?: { wikibase_item?: string } }> } };
    const id = Object.values(j.query?.pages ?? {})[0]?.pageprops?.wikibase_item;
    return id && /^Q\d+$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

/** Views of a Wikivoyage article over the last ~12 months (traveller interest), or null when the stats API is unavailable. */
export async function wikivoyageViews(title: string, now = new Date()): Promise<number | null> {
  const ym = (d: Date) => `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}01`;
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const start = new Date(Date.UTC(end.getUTCFullYear() - 1, end.getUTCMonth(), 1));
  try {
    const res = await fetch(`https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikivoyage/all-access/user/${encodeURIComponent(title.replace(/ /g, "_"))}/monthly/${ym(start)}/${ym(end)}`, {
      headers: { "user-agent": UA, accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 404) return 0;
    if (!res.ok) return null;
    const j = (await res.json()) as { items?: { views?: number }[] };
    return (j.items ?? []).reduce((n, i) => n + (i.views ?? 0), 0);
  } catch {
    return null;
  }
}
