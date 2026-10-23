import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { listPublishedForSitemap } from "@/lib/places/repo";

// Built from published places only, on each request (cheap: one indexed query).
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = site.url.replace(/\/$/, "");
  const rows = await listPublishedForSitemap();
  const entries: MetadataRoute.Sitemap = [{ url: `${base}/`, changeFrequency: "weekly", priority: 1 }];
  for (const r of rows) {
    const path = r.kind === "state" ? `/india/${r.slug}` : r.stateSlug ? `/india/${r.stateSlug}/${r.slug}` : null;
    if (path) entries.push({ url: `${base}${path}`, lastModified: r.updatedAt, changeFrequency: "monthly", priority: r.kind === "state" ? 0.8 : 0.6 });
  }
  return entries;
}
