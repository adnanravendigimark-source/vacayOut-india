import { z } from "zod";
import { cleanArticleHtml, estimateReadTime, excerptFromContent, isSafeHref, isSafeImageUrl } from "./html";

/**
 * The blog post as the admin edits it and the public page reads it. Pure: shared by the
 * editor (client), the server actions and tests.
 */
export type BlogStatus = "draft" | "published";

export type BlogPostInput = {
  slug: string;
  status: BlogStatus;
  title: string;
  category: string;
  quickAnswer: string;
  readTime: string;
  author: string;
  /** YYYY-MM-DD */
  publishDate: string;
  image: string;
  imageAlt: string;
  imageCredit: string;
  content: string;
  recommendedPlaceId: string | null;
  ctaHeading: string;
  ctaBody: string;
  ctaButtonText: string;
  ctaButtonHref: string;
  metaTitle: string;
  metaDescription: string;
  focusKeyword: string;
  canonicalUrl: string;
  noIndex: boolean;
  noFollow: boolean;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
};

export type BlogPost = BlogPostInput & { id: string; excerpt: string; updatedAt: string };

/** Card data for listings (no article body). */
export type BlogCard = Pick<BlogPost, "slug" | "title" | "category" | "excerpt" | "readTime" | "publishDate" | "image" | "imageAlt">;

export const DEFAULT_CTA = {
  heading: "Ready to plan your trip?",
  body: "Tell our AI planner where you want to go and get a day-by-day plan for India in minutes.",
  buttonText: "Plan a trip with AI",
  buttonHref: "/chat",
} as const;

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const text = (max: number) => z.string().trim().max(max);
const optionalUrl = (check: (v: string) => boolean, msg: string) =>
  z
    .string()
    .trim()
    .max(1000)
    .refine((v) => v === "" || check(v), msg);

export const blogPostSchema = z.object({
  slug: z.string().trim().min(1, "URL slug is required.").max(120).regex(SLUG_RE, "Slug can only contain lowercase letters, numbers and single hyphens."),
  status: z.enum(["draft", "published"]),
  title: text(200).min(3, "Title is required."),
  category: text(60),
  quickAnswer: text(1000),
  readTime: text(40),
  author: text(120),
  publishDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Publish date is required.").refine((v) => !Number.isNaN(Date.parse(v)), "Publish date isn’t a real date."),
  image: optionalUrl(isSafeImageUrl, "Hero image must be an https:// URL or an uploaded image."),
  imageAlt: text(300),
  imageCredit: text(300),
  content: z.string().max(400_000, "The article is too long."),
  recommendedPlaceId: z.string().uuid().nullable(),
  ctaHeading: text(120),
  ctaBody: text(400),
  ctaButtonText: text(60),
  ctaButtonHref: optionalUrl(isSafeHref, "Button link must be a path like /chat or a full https:// URL."),
  metaTitle: text(200),
  metaDescription: text(400),
  focusKeyword: text(120),
  canonicalUrl: optionalUrl((v) => /^https:\/\//.test(v), "Canonical URL must start with https://"),
  noIndex: z.boolean(),
  noFollow: z.boolean(),
  ogTitle: text(200),
  ogDescription: text(400),
  ogImage: optionalUrl(isSafeImageUrl, "Social image must be an https:// URL or an uploaded image."),
});

export type ParsedPost = BlogPostInput & { excerpt: string };

/**
 * Validates and normalises a post before it is stored: cleans the HTML, derives the excerpt,
 * fills read time, and applies the publish-time requirements (a live post needs a category,
 * cover image + alt text, SEO title/description and some content).
 */
export function parseBlogPost(raw: unknown): { ok: true; value: ParsedPost } | { ok: false; error: string; problems?: string[] } {
  const r = blogPostSchema.safeParse(raw);
  if (!r.success) return { ok: false, error: r.error.issues[0]?.message ?? "Check the form.", problems: r.error.issues.map((i) => i.message) };
  const v = r.data;
  const content = cleanArticleHtml(v.content);
  const value: ParsedPost = {
    ...v,
    content,
    excerpt: excerptFromContent(content),
    readTime: v.readTime || estimateReadTime(content),
  };
  if (value.status === "published") {
    const missing: string[] = [];
    if (!value.category) missing.push("Category is required to publish.");
    if (!value.image) missing.push("A hero image is required to publish.");
    if (value.image && !value.imageAlt) missing.push("Hero image alt text is required to publish.");
    if (!value.metaTitle) missing.push("SEO title is required to publish (SEO & Preview tab).");
    if (!value.metaDescription) missing.push("Meta description is required to publish (SEO & Preview tab).");
    if (!value.excerpt) missing.push("Write the article before publishing.");
    if (missing.length) return { ok: false, error: missing[0], problems: missing };
  }
  return { ok: true, value };
}

/** "Name / Role" → parts for the byline. */
export function authorParts(author: string, fallback: string) {
  const [namePart, rolePart] = (author || "").split("/").map((s) => s.trim());
  const name = namePart || fallback;
  const initials =
    name
      .replace(/^(Dr|Mr|Mrs|Ms|Prof)\.?\s+/i, "")
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "VO";
  return { name, role: rolePart || "", initials };
}

export function formatPostDate(iso: string) {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export function blankPost(today: string): BlogPostInput {
  return {
    slug: "",
    status: "draft",
    title: "",
    category: "",
    quickAnswer: "",
    readTime: "",
    author: "",
    publishDate: today,
    image: "",
    imageAlt: "",
    imageCredit: "",
    content: "",
    recommendedPlaceId: null,
    ctaHeading: DEFAULT_CTA.heading,
    ctaBody: DEFAULT_CTA.body,
    ctaButtonText: DEFAULT_CTA.buttonText,
    ctaButtonHref: DEFAULT_CTA.buttonHref,
    metaTitle: "",
    metaDescription: "",
    focusKeyword: "",
    canonicalUrl: "",
    noIndex: false,
    noFollow: false,
    ogTitle: "",
    ogDescription: "",
    ogImage: "",
  };
}
