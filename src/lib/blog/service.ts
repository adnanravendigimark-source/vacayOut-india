import "server-only";
import { and, desc, eq, ne } from "drizzle-orm";
import { audit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { blogPosts, blogRedirects, blogSettings, placeVersions, places, type PublishedSnapshot } from "@/lib/db/schema";
import { placePath } from "@/lib/cache/paths";
import type { BlogCard, BlogPost, ParsedPost } from "./post";
import { resolveBlogSettings, type BlogSettings } from "./settings";

/**
 * Blog persistence. Public readers (list/get published) only ever see status = "published";
 * everything else is for the admin. Slug renames leave a redirect row so old links 301.
 */

type Row = typeof blogPosts.$inferSelect;

function toPost(r: Row): BlogPost {
  return {
    id: r.id,
    slug: r.slug,
    status: r.status,
    title: r.title,
    category: r.category,
    excerpt: r.excerpt,
    quickAnswer: r.quickAnswer,
    readTime: r.readTime,
    author: r.author,
    publishDate: r.publishDate,
    image: r.image,
    imageAlt: r.imageAlt,
    imageCredit: r.imageCredit,
    content: r.content,
    recommendedPlaceId: r.recommendedPlaceId,
    ctaHeading: r.ctaHeading,
    ctaBody: r.ctaBody,
    ctaButtonText: r.ctaButtonText,
    ctaButtonHref: r.ctaButtonHref,
    metaTitle: r.metaTitle,
    metaDescription: r.metaDescription,
    focusKeyword: r.focusKeyword,
    canonicalUrl: r.canonicalUrl,
    noIndex: r.noIndex,
    noFollow: r.noFollow,
    ogTitle: r.ogTitle,
    ogDescription: r.ogDescription,
    ogImage: r.ogImage,
    updatedAt: r.updatedAt.toISOString(),
  };
}

const cardColumns = {
  slug: blogPosts.slug,
  title: blogPosts.title,
  category: blogPosts.category,
  excerpt: blogPosts.excerpt,
  readTime: blogPosts.readTime,
  publishDate: blogPosts.publishDate,
  image: blogPosts.image,
  imageAlt: blogPosts.imageAlt,
};

// ---------------- Public ----------------

/** Published posts, newest first (cards only — no article bodies). */
export async function listPublishedPosts(): Promise<BlogCard[]> {
  return getDb().select(cardColumns).from(blogPosts).where(eq(blogPosts.status, "published")).orderBy(desc(blogPosts.publishDate), desc(blogPosts.createdAt));
}

/** For the sitemap: published, indexable posts. */
export async function listPostsForSitemap() {
  return getDb()
    .select({ slug: blogPosts.slug, updatedAt: blogPosts.updatedAt })
    .from(blogPosts)
    .where(and(eq(blogPosts.status, "published"), eq(blogPosts.noIndex, false)))
    .orderBy(desc(blogPosts.publishDate));
}

export async function getPublishedPost(slug: string): Promise<BlogPost | null> {
  const [r] = await getDb()
    .select()
    .from(blogPosts)
    .where(and(eq(blogPosts.slug, slug), eq(blogPosts.status, "published")))
    .limit(1);
  return r ? toPost(r) : null;
}

/** Where an old (renamed) slug now lives, if that post is published. */
export async function resolveRedirect(oldSlug: string): Promise<string | null> {
  const [r] = await getDb()
    .select({ slug: blogPosts.slug })
    .from(blogRedirects)
    .innerJoin(blogPosts, eq(blogPosts.id, blogRedirects.postId))
    .where(and(eq(blogRedirects.oldSlug, oldSlug), eq(blogPosts.status, "published")))
    .limit(1);
  return r?.slug ?? null;
}

export type RecommendedPlace = { name: string; summary: string | null; href: string; image: { url: string; alt: string } | null; stateName: string | null };

/** The destination card under an article; null unless the place is still published as its own page. */
export async function getRecommendedPlace(placeId: string | null): Promise<RecommendedPlace | null> {
  if (!placeId) return null;
  const [r] = await getDb()
    .select({ kind: places.kind, slug: places.slug, snapshot: placeVersions.snapshot })
    .from(places)
    .innerJoin(placeVersions, eq(placeVersions.id, places.publishedVersionId))
    .where(and(eq(places.id, placeId), eq(places.status, "published"), eq(places.displayMode, "page")))
    .limit(1);
  if (!r) return null;
  const p = (r.snapshot as PublishedSnapshot).place;
  const href = placePath({ kind: r.kind, slug: r.slug, stateSlug: p.state?.slug ?? null });
  if (!href) return null;
  return { name: p.name, summary: p.summary, href, image: p.hero ? { url: p.hero.url, alt: p.hero.alt } : null, stateName: p.state?.name ?? null };
}

// ---------------- Admin ----------------

export async function listAllPosts() {
  return getDb()
    .select({ id: blogPosts.id, status: blogPosts.status, updatedAt: blogPosts.updatedAt, ...cardColumns })
    .from(blogPosts)
    .orderBy(desc(blogPosts.publishDate), desc(blogPosts.createdAt));
}

export async function getPost(id: string): Promise<BlogPost | null> {
  const [r] = await getDb().select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1);
  return r ? toPost(r) : null;
}

export async function listRedirectsTo(postId: string) {
  return getDb().select({ oldSlug: blogRedirects.oldSlug, createdAt: blogRedirects.createdAt }).from(blogRedirects).where(eq(blogRedirects.postId, postId)).orderBy(desc(blogRedirects.createdAt));
}

/** Published destinations (own pages) for the "Recommended destination" picker. */
export async function listRecommendablePlaces() {
  const rows = await getDb()
    .select({ id: places.id, name: places.name, kind: places.kind })
    .from(places)
    .where(and(eq(places.status, "published"), eq(places.displayMode, "page")))
    .orderBy(places.name);
  return rows;
}

export type SaveResult = { ok: true; id: string; slug: string; previousSlug: string | null } | { ok: false; message: string };

/** True when the slug is free for this post (not another post's slug, and not someone else's old URL). */
async function slugTaken(slug: string, exceptId: string | null) {
  const db = getDb();
  const [p] = await db
    .select({ id: blogPosts.id })
    .from(blogPosts)
    .where(exceptId ? and(eq(blogPosts.slug, slug), ne(blogPosts.id, exceptId)) : eq(blogPosts.slug, slug))
    .limit(1);
  if (p) return true;
  const [r] = await db.select({ postId: blogRedirects.postId }).from(blogRedirects).where(eq(blogRedirects.oldSlug, slug)).limit(1);
  return Boolean(r && r.postId !== exceptId);
}

export async function createPost(v: ParsedPost, actorId: string): Promise<SaveResult> {
  if (await slugTaken(v.slug, null)) return { ok: false, message: "A post with this slug already exists (or used to live there)." };
  const [row] = await getDb()
    .insert(blogPosts)
    .values({ ...v, createdBy: actorId, updatedBy: actorId })
    .returning({ id: blogPosts.id });
  await audit({ actorId, action: "blog.create", entityType: "blog_post", entityId: row.id, details: { slug: v.slug, status: v.status } });
  return { ok: true, id: row.id, slug: v.slug, previousSlug: null };
}

export async function updatePost(id: string, v: ParsedPost, actorId: string): Promise<SaveResult> {
  const db = getDb();
  const [current] = await db.select({ slug: blogPosts.slug, status: blogPosts.status }).from(blogPosts).where(eq(blogPosts.id, id)).limit(1);
  if (!current) return { ok: false, message: "This post no longer exists." };
  const renamed = current.slug !== v.slug;
  if (renamed && (await slugTaken(v.slug, id))) return { ok: false, message: "A post with this slug already exists (or used to live there)." };

  await db.transaction(async (tx) => {
    await tx.update(blogPosts).set({ ...v, updatedBy: actorId, updatedAt: new Date() }).where(eq(blogPosts.id, id));
    if (renamed) {
      // The new slug is live again, so it can't also be a redirect; the old one now points here.
      await tx.delete(blogRedirects).where(eq(blogRedirects.oldSlug, v.slug));
      await tx.insert(blogRedirects).values({ oldSlug: current.slug, postId: id }).onConflictDoUpdate({ target: blogRedirects.oldSlug, set: { postId: id, createdAt: new Date() } });
    }
    await audit({ actorId, action: "blog.update", entityType: "blog_post", entityId: id, details: { slug: v.slug, status: v.status, ...(renamed ? { from: current.slug } : {}) } }, tx);
  });
  return { ok: true, id, slug: v.slug, previousSlug: renamed ? current.slug : null };
}

/** Deletes the post and its redirects. Returns every slug that served it, for cache refresh. */
export async function deletePost(id: string, actorId: string): Promise<string[] | null> {
  const db = getDb();
  const [p] = await db.select({ slug: blogPosts.slug }).from(blogPosts).where(eq(blogPosts.id, id)).limit(1);
  if (!p) return null;
  const old = await db.select({ oldSlug: blogRedirects.oldSlug }).from(blogRedirects).where(eq(blogRedirects.postId, id));
  await db.transaction(async (tx) => {
    await tx.delete(blogPosts).where(eq(blogPosts.id, id));
    await audit({ actorId, action: "blog.delete", entityType: "blog_post", entityId: id, details: { slug: p.slug } }, tx);
  });
  return [p.slug, ...old.map((o) => o.oldSlug)];
}

// ---------------- Listing-page settings ----------------

export async function getBlogSettings(): Promise<BlogSettings> {
  const [r] = await getDb().select({ data: blogSettings.data }).from(blogSettings).where(eq(blogSettings.id, 1)).limit(1);
  return resolveBlogSettings(r?.data);
}

/** The raw stored values (blank = default) for the settings form. */
export async function getStoredBlogSettings(): Promise<Record<string, unknown>> {
  const [r] = await getDb().select({ data: blogSettings.data }).from(blogSettings).where(eq(blogSettings.id, 1)).limit(1);
  return r?.data ?? {};
}

export async function saveBlogSettings(data: Record<string, unknown>, actorId: string) {
  await getDb()
    .insert(blogSettings)
    .values({ id: 1, data, updatedBy: actorId })
    .onConflictDoUpdate({ target: blogSettings.id, set: { data, updatedBy: actorId, updatedAt: new Date() } });
  await audit({ actorId, action: "blog.settings", entityType: "blog_settings" });
}
