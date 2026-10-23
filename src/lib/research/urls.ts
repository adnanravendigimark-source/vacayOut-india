/**
 * URL rules for research sources: normalisation (so one page is one source),
 * "site" (registrable domain, used to judge independence) and a coarse
 * authority label. Pure functions — unit tested.
 */

const TRACKING = /^(utm_|fbclid$|gclid$|mc_|ref$|ref_src$|igshid$|srsltid$)/i;

/** Parses an http(s) URL on a default port with no credentials (the only kind we fetch); null otherwise. Fragment dropped. */
export function webUrl(raw: string): URL | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  if (u.username || u.password) return null;
  if (u.port && u.port !== "80" && u.port !== "443") return null;
  u.hash = "";
  u.hostname = u.hostname.toLowerCase().replace(/\.$/, "");
  if (!u.hostname.includes(".")) return null;
  return u;
}

/** Canonical form used as the source key (one page = one source). Not used for fetching: sites may redirect between forms. */
export function normalizeUrl(raw: string): string | null {
  const u = webUrl(raw);
  if (!u) return null;
  for (const k of [...u.searchParams.keys()]) if (TRACKING.test(k)) u.searchParams.delete(k);
  u.searchParams.sort();
  if (u.pathname !== "/") u.pathname = u.pathname.replace(/\/+$/, "");
  return u.toString();
}

/** Host without a leading "www.". */
export function hostOf(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "");
}

// Two-label public suffixes we meet in Indian travel research (and a few common foreign ones).
const MULTI_SUFFIX = new Set([
  "gov.in", "nic.in", "co.in", "org.in", "net.in", "ac.in", "edu.in", "res.in", "ind.in", "firm.in", "gen.in",
  "co.uk", "org.uk", "gov.uk", "ac.uk", "com.au", "co.nz", "co.jp", "com.sg",
]);

/** Registrable domain, e.g. "himachaltourism.gov.in", "tripadvisor.in". */
export function siteOf(url: string): string {
  const parts = new URL(url).hostname.toLowerCase().split(".");
  if (parts.length <= 2) return parts.join(".");
  const last2 = parts.slice(-2).join(".");
  return MULTI_SUFFIX.has(last2) ? parts.slice(-3).join(".") : last2;
}

const REFERENCE = ["wikipedia.org", "wikivoyage.org", "britannica.com", "unesco.org", "asi.nic.in"];
const MEDIA = [
  "thehindu.com", "indianexpress.com", "hindustantimes.com", "timesofindia.indiatimes.com", "indiatimes.com", "ndtv.com",
  "news18.com", "tribuneindia.com", "deccanherald.com", "livemint.com", "business-standard.com", "theprint.in", "scroll.in",
  "bbc.com", "bbc.co.uk", "cntraveller.in", "cntraveler.com", "lonelyplanet.com", "nationalgeographic.com", "outlookindia.com",
  "outlooktraveller.com",
];
const TRAVEL = [
  "tripadvisor.in", "tripadvisor.com", "makemytrip.com", "goibibo.com", "holidify.com", "thrillophilia.com", "traveltriangle.com",
  "yatra.com", "cleartrip.com", "booking.com", "agoda.com", "irctctourism.com", "redbus.in", "ixigo.com", "trawell.in",
];

export type Authority = "government" | "reference" | "media" | "travel_platform" | "other";

/** Coarse label shown to reviewers. It informs judgement; it never verifies a fact by itself. */
export function authorityOf(url: string): Authority {
  const host = new URL(url).hostname.toLowerCase();
  const site = siteOf(url);
  const matches = (list: string[]) => list.some((d) => host === d || host.endsWith(`.${d}`));
  if (matches(REFERENCE)) return "reference";
  if (host.endsWith(".gov.in") || host.endsWith(".nic.in") || host === "gov.in" || host.endsWith(".gov")) return "government";
  if (matches(MEDIA)) return "media";
  if (matches(TRAVEL) || TRAVEL.includes(site)) return "travel_platform";
  return "other";
}

export const AUTHORITY_LABEL: Record<Authority, string> = {
  government: "Government / official",
  reference: "Reference",
  media: "News / magazine",
  travel_platform: "Travel platform",
  other: "Other website",
};
