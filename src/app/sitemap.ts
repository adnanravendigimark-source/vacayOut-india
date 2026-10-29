import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { listPublishedForSitemap } from "@/lib/places/repo";
import { listPublishedItineraries } from "@/lib/itineraries/service";
import { listPublishedGuides } from "@/lib/guides/service";

// Built from published places only; cached for an hour (crawlers don't need it fresher).
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = site.url.replace(/\/$/, "");
  const [rows, its, guides] = await Promise.all([listPublishedForSitemap(), listPublishedItineraries(), listPublishedGuides()]);
  const entries: MetadataRoute.Sitemap = [{ url: `${base}/`, changeFrequency: "weekly", priority: 1 }];
  for (const r of rows) {
    const path = r.kind === "state" ? `/india/${r.slug}` : r.stateSlug ? `/india/${r.stateSlug}/${r.slug}` : null;
    if (path) entries.push({ url: `${base}${path}`, lastModified: r.updatedAt, changeFrequency: "monthly", priority: r.kind === "state" ? 0.8 : 0.6 });
  }
  for (const it of its) entries.push({ url: `${base}/itineraries/${it.slug}`, lastModified: it.publishedAt ?? undefined, changeFrequency: "monthly", priority: 0.6 });
  for (const g of guides) entries.push({ url: `${base}/travel-guides/${g.slug}`, lastModified: g.publishedAt ?? undefined, changeFrequency: "monthly", priority: 0.6 });
  return entries;
}
