"use server";

import { revalidatePath } from "next/cache";
import { desc, eq } from "drizzle-orm";
import { isUniqueViolation } from "@/lib/admin/action-state";
import { audit } from "@/lib/audit";
import { requireAdmin, requireUser } from "@/lib/auth/guard";
import { parseBlogPost } from "@/lib/blog/post";
import { createPost, deletePost, saveBlogSettings, updatePost } from "@/lib/blog/service";
import { blogSettingsSchema } from "@/lib/blog/settings";
import { BLOG_PATH, blogPostPath } from "@/lib/cache/paths";
import { getDb } from "@/lib/db";
import { media } from "@/lib/db/schema";
import { EXT, MAX_IMAGE_BYTES, sniffImage } from "@/lib/media/sniff";
import { storeImage } from "@/lib/media/storage";

const UUID = /^[0-9a-f-]{36}$/;

export type SavePostResult = { ok: boolean; message: string; problems?: string[]; id?: string; slug?: string };

/** Public pages that show a post: the listing, the post itself, any old URL, and the sitemap. */
function refreshBlog(slugs: (string | null | undefined)[]) {
  revalidatePath(BLOG_PATH);
  for (const s of slugs) if (s) revalidatePath(blogPostPath(s));
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin/blog");
}

/** Create (id = null) or update a post. The payload is the editor's whole post object. */
export async function savePostAction(id: string | null, payload: unknown): Promise<SavePostResult> {
  const user = await requireUser();
  if (id !== null && !UUID.test(id)) return { ok: false, message: "Unknown post." };
  const parsed = parseBlogPost(payload);
  if (!parsed.ok) return { ok: false, message: parsed.error, problems: parsed.problems };
  try {
    const r = id ? await updatePost(id, parsed.value, user.id) : await createPost(parsed.value, user.id);
    if (!r.ok) return { ok: false, message: r.message };
    refreshBlog([r.slug, r.previousSlug]);
    revalidatePath(`/admin/blog/${r.id}`);
    const live = parsed.value.status === "published";
    return { ok: true, id: r.id, slug: r.slug, message: live ? "Saved — live on the site now." : "Saved as a draft. It isn’t visible on the site." };
  } catch (err) {
    if (isUniqueViolation(err)) return { ok: false, message: "A post with this slug already exists." };
    throw err;
  }
}

/** Only admins delete (editors can unpublish by saving as a draft). */
export async function deletePostAction(id: string): Promise<{ ok: boolean; message: string }> {
  const user = await requireAdmin();
  if (!UUID.test(id)) return { ok: false, message: "Unknown post." };
  const slugs = await deletePost(id, user.id);
  if (!slugs) return { ok: false, message: "This post no longer exists." };
  refreshBlog(slugs);
  return { ok: true, message: "Post deleted." };
}

export async function saveBlogSettingsAction(payload: unknown): Promise<{ ok: boolean; message: string }> {
  const user = await requireUser();
  const parsed = blogSettingsSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." };
  await saveBlogSettings(parsed.data, user.id);
  revalidatePath(BLOG_PATH);
  revalidatePath("/admin/blog/settings");
  return { ok: true, message: "Saved — live at /blog now." };
}

/**
 * Uploads an image for the blog (hero, social or inline). Goes through storeImage like every
 * other image, so it is resized once into WebP renditions. Returns the URL to insert.
 */
export async function uploadBlogImageAction(form: FormData): Promise<{ ok: boolean; message: string; url?: string }> {
  const user = await requireUser();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Choose an image file." };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, message: "Images must be 5 MB or smaller." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImage(bytes);
  if (!type) return { ok: false, message: "Only JPG, PNG or WebP images are allowed." };
  const stored = await storeImage(`blog/${crypto.randomUUID()}.${EXT[type]}`, bytes, type);
  await audit({ actorId: user.id, action: "blog.image_upload", entityType: "blog_image", details: { url: stored.url, bytes: stored.bytes } });
  return { ok: true, message: "Image uploaded.", url: stored.url };
}

export type LibraryImage = { url: string; alt: string; credit: string | null };

/**
 * Recent destination photos for the Media Library picker. Each comes with its credit line,
 * because licensed photos (CC BY / BY-SA) must keep their attribution wherever they appear.
 */
export async function listLibraryImagesAction(): Promise<LibraryImage[]> {
  await requireUser();
  const rows = await getDb()
    .select({ url: media.url, alt: media.alt, attribution: media.attribution, license: media.license, kind: media.kind })
    .from(media)
    .where(eq(media.kind, "photo"))
    .orderBy(desc(media.createdAt))
    .limit(120);
  return rows.map((r) => ({
    url: r.url,
    alt: r.alt,
    credit: r.attribution ? `Photo: ${r.attribution}${r.license ? ` (${r.license})` : ""}` : null,
  }));
}
