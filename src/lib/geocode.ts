import "server-only";
import { hit } from "@/lib/limiter";
import { validPoint } from "@/lib/map";

/**
 * Coordinate lookup for admins via OpenStreetMap Nominatim. Their usage
 * policy allows light, attributed use with an identifying User-Agent and at
 * most one request per second — enforced here for the whole site.
 */
export type GeoResult = { name: string; display: string; lat: number; lng: number; state: string | null; osmType: string | null };

export async function geocode(query: string, fetchImpl: typeof fetch = fetch): Promise<GeoResult[]> {
  const q = query.replace(/\s+/g, " ").trim().slice(0, 120);
  if (q.length < 2) return [];
  if (!(await hit("geo:nominatim", 1, 1)).ok) throw new Error("Please wait a second and try again.");
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.search = new URLSearchParams({ q, format: "jsonv2", countrycodes: "in", limit: "5", "accept-language": "en", addressdetails: "1" }).toString();
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://vacayout.in";
  const res = await fetchImpl(url, { headers: { "user-agent": `VacayOut/1.0 (${site}; admin coordinate lookup)`, referer: site }, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`Map search failed (${res.status}).`);
  const rows = (await res.json()) as { name?: string; display_name?: string; lat?: string; lon?: string; addresstype?: string; type?: string; address?: { state?: string; territory?: string } }[];
  return rows
    .map((r) => ({
      name: (r.name || r.display_name || "").slice(0, 120),
      display: (r.display_name || "").slice(0, 240),
      lat: Number(r.lat),
      lng: Number(r.lon),
      state: (r.address?.state || r.address?.territory || null)?.slice(0, 80) ?? null,
      osmType: (r.addresstype || r.type || null)?.slice(0, 40) ?? null,
    }))
    .filter((r) => validPoint(r.lat, r.lng))
    .map((r) => ({ ...r, lat: Math.round(r.lat * 1e6) / 1e6, lng: Math.round(r.lng * 1e6) / 1e6 }));
}
