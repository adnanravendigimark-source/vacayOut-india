import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { listPublishedForSitemap } from "@/lib/places/repo";
import { listPublishedItineraries } from "@/lib/itineraries/service";
import { listPublishedGuides } from "@/lib/guides/service";
import { listPostsForSitemap } from "@/lib/blog/service";
import { BLOG_PATH, blogPostPath, guidePath, itineraryPath, placePath } from "@/lib/cache/paths";

// Built from published places only; cached for an hour (crawlers don't need it fresher).
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = site.url.replace(/\/$/, "");
  const [rows, its, guides, posts] = await Promise.all([listPublishedForSitemap(), listPublishedItineraries(), listPublishedGuides(), listPostsForSitemap()]);
  const entries: MetadataRoute.Sitemap = [{ url: `${base}/`, changeFrequency: "weekly", priority: 1 }];
  for (const r of rows) {
    const path = placePath(r);
    if (path) entries.push({ url: `${base}${path}`, lastModified: r.updatedAt, changeFrequency: "monthly", priority: r.kind === "state" ? 0.8 : 0.6 });
  }
  for (const it of its) entries.push({ url: `${base}${itineraryPath(it.slug)}`, lastModified: it.publishedAt ?? undefined, changeFrequency: "monthly", priority: 0.6 });
  for (const g of guides) entries.push({ url: `${base}${guidePath(g.slug)}`, lastModified: g.publishedAt ?? undefined, changeFrequency: "monthly", priority: 0.6 });
  entries.push({ url: `${base}${BLOG_PATH}`, lastModified: posts[0]?.updatedAt, changeFrequency: "weekly", priority: 0.7 });
  for (const p of posts) entries.push({ url: `${base}${blogPostPath(p.slug)}`, lastModified: p.updatedAt, changeFrequency: "monthly", priority: 0.6 });
  return entries;
}
