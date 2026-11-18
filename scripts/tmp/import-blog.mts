// Imports the 10 researched blog posts as DRAFTS (never published). Skips slugs that already exist.
// In-article graphics go through storeImage (WebP renditions); share images stay JPEG for link previews.
// Usage: tsx ... scripts/tmp/import-blog.mts [--dry]
import "server-only";
import { readFileSync } from "node:fs";
import { put } from "@vercel/blob";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../../src/lib/db/index.js";
import { blogPosts, places, placeVersions, users } from "../../src/lib/db/schema.js";
import { parseBlogPost } from "../../src/lib/blog/post.js";
import { createPost } from "../../src/lib/blog/service.js";
import { storeImage } from "../../src/lib/media/storage.js";

const DIR = "scripts/tmp/blog";
const DRY = process.argv.includes("--dry");
type Fig = { file: string; alt: string; caption: string };
type P = Record<string, any> & { slug: string; content: string; figs: Record<string, Fig>; cover: string; place: string; cta: Record<string, string> };
const posts: P[] = JSON.parse(readFileSync(`${DIR}/posts.json`, "utf8"));
const db = getDb();
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const [admin] = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin")).limit(1);
if (!admin) throw new Error("No admin user found");

// Published place photos used as covers and in-article photos, with their credits.
const photoSlugs = new Set<string>();
for (const p of posts) { photoSlugs.add(p.cover); photoSlugs.add(p.place); for (const m of p.content.matchAll(/\{\{photo:([a-z0-9-]+)\}\}/g)) photoSlugs.add(m[1]); }
const rows = await db.select({ id: places.id, slug: places.slug, snap: placeVersions.snapshot }).from(places).innerJoin(placeVersions, eq(placeVersions.id, places.publishedVersionId)).where(and(eq(places.status, "published"), inArray(places.slug, [...photoSlugs])));
const bySlug = new Map(rows.map((r) => [r.slug, { id: r.id, hero: (r.snap as any).place.hero as { url: string; alt: string; kind: string; attribution: string | null; license: string } | null }]));
const credit = (h: { attribution: string | null; license: string }) => `Photo: ${(h.attribution ?? "Unknown").replace(/ via Wikimedia Commons$/, "")} · ${h.license} · via Wikimedia Commons`;
const hero = (slug: string) => {
  const h = bySlug.get(slug)?.hero;
  if (!h || h.kind !== "photo") throw new Error(`No published photo for ${slug}`);
  return h;
};

const existing = new Set((await db.select({ slug: blogPosts.slug }).from(blogPosts)).map((r) => r.slug));
for (const p of posts) {
  if (existing.has(p.slug)) { console.log(`SKIP ${p.slug}: already exists`); continue; }
  const uid = () => crypto.randomUUID().slice(0, 8);
  let content = p.content;
  for (const [key, f] of Object.entries(p.figs)) {
    const bytes = new Uint8Array(readFileSync(`${DIR}/${p.slug}/${f.file}`));
    const url = DRY ? `https://example.com/${p.slug}/${f.file}` : (await storeImage(`blog/${p.slug}/${key}-${uid()}.jpg`, bytes, "image/jpeg")).url;
    content = content.replace(`{{fig:${key}}}`, `<figure><img src="${esc(url)}" alt="${esc(f.alt)}" /><figcaption>${esc(f.caption)}</figcaption></figure>`);
  }
  content = content.replace(/\{\{photo:([a-z0-9-]+)\}\}/g, (_m, s: string) => {
    const h = hero(s);
    return `<figure><img src="${esc(h.url)}" alt="${esc(h.alt)}" /><figcaption>${esc(`${h.alt}. ${credit(h)}`)}</figcaption></figure>`;
  });
  if (/\{\{/.test(content)) throw new Error(`Unfilled placeholder in ${p.slug}`);
  const shareBytes = readFileSync(`${DIR}/${p.slug}/share-1200x630.jpg`);
  const ogImage = DRY ? `https://example.com/${p.slug}/share.jpg` : (await put(`blog/${p.slug}/share-${uid()}.jpg`, shareBytes, { access: "public", contentType: "image/jpeg", addRandomSuffix: true, cacheControlMaxAge: 31536000 })).url;
  const cover = hero(p.cover);
  const place = bySlug.get(p.place);
  const parsed = parseBlogPost({
    slug: p.slug, status: "draft", title: p.title, category: p.category, quickAnswer: p.quickAnswer, readTime: "", author: p.author, publishDate: p.publishDate,
    image: cover.url, imageAlt: cover.alt, imageCredit: credit(cover), content,
    recommendedPlaceId: place?.id ?? null, ...p.cta,
    metaTitle: p.metaTitle, metaDescription: p.metaDescription, focusKeyword: p.focusKeyword, canonicalUrl: "", noIndex: false, noFollow: false,
    ogTitle: p.ogTitle, ogDescription: p.ogDescription, ogImage,
  });
  if (!parsed.ok) throw new Error(`${p.slug}: ${parsed.error} ${parsed.problems?.join("; ") ?? ""}`);
  const imgs = (parsed.value.content.match(/<img /g) ?? []).length, figs = (content.match(/<img /g) ?? []).length;
  if (imgs !== figs) throw new Error(`${p.slug}: sanitiser dropped ${figs - imgs} image(s)`);
  const words = parsed.value.content.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  if (DRY) { console.log(`DRY ${p.slug}: ok | ${imgs} images | ${words} words | read ${parsed.value.readTime} | place ${place ? "linked" : "MISSING"}`); continue; }
  const r = await createPost(parsed.value, admin.id);
  console.log(r.ok ? `CREATED draft ${p.slug} (${imgs} images, ${words} words)` : `FAILED ${p.slug}: ${r.message}`);
}
process.exit(0);
