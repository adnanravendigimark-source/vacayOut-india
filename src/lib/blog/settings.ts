import { z } from "zod";
import { isSafeHref, isSafeImageUrl } from "./html";

/** Copy and SEO for the /blog listing page. Stored as one JSON row; blanks fall back to these defaults. */
export type BlogSettings = {
  eyebrow: string;
  heading: string;
  subheading: string;
  listHeading: string;
  listSubheading: string;
  emptyStateText: string;
  heroImage: string;
  heroImageAlt: string;
  ctaHeading: string;
  ctaBody: string;
  ctaButtonText: string;
  ctaButtonHref: string;
  quickAnswerLabel: string;
  tocLabel: string;
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  noIndex: boolean;
  noFollow: boolean;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
};

export const BLOG_DEFAULTS: BlogSettings = {
  eyebrow: "VacayOut Journal",
  heading: "India Travel Blog",
  subheading: "Honest, researched stories and tips for travelling India — when to go, how to get there, what it costs and what locals wish you knew.",
  listHeading: "Latest Articles",
  listSubheading: "Travel tips, guides and everything you need to plan a trip across India.",
  emptyStateText: "No articles yet — check back soon.",
  heroImage: "",
  heroImageAlt: "",
  ctaHeading: "Plan your India trip with AI",
  ctaBody: "Day-by-day plans built from verified destination guides.",
  ctaButtonText: "Start planning →",
  ctaButtonHref: "/chat",
  quickAnswerLabel: "Quick Answer",
  tocLabel: "In This Guide",
  metaTitle: "India Travel Blog — Tips, Guides & Stories | VacayOut",
  metaDescription: "Practical India travel advice: best times to visit, getting around, budgets, food and culture, written and checked by the VacayOut team.",
  canonicalUrl: "",
  noIndex: false,
  noFollow: false,
  ogTitle: "",
  ogDescription: "",
  ogImage: "",
};

const t = (max: number) => z.string().trim().max(max);

export const blogSettingsSchema = z.object({
  eyebrow: t(60),
  heading: t(120),
  subheading: t(400),
  listHeading: t(80),
  listSubheading: t(300),
  emptyStateText: t(200),
  heroImage: t(1000).refine((v) => v === "" || isSafeImageUrl(v), "Hero image must be an https:// URL or an uploaded image."),
  heroImageAlt: t(300),
  ctaHeading: t(120),
  ctaBody: t(300),
  ctaButtonText: t(60),
  ctaButtonHref: t(500).refine((v) => v === "" || isSafeHref(v), "Button link must be a path like /chat or a full https:// URL."),
  quickAnswerLabel: t(40),
  tocLabel: t(40),
  metaTitle: t(200),
  metaDescription: t(400),
  canonicalUrl: t(500).refine((v) => v === "" || /^https:\/\//.test(v), "Canonical URL must start with https://"),
  noIndex: z.boolean(),
  noFollow: z.boolean(),
  ogTitle: t(200),
  ogDescription: t(400),
  ogImage: t(1000).refine((v) => v === "" || isSafeImageUrl(v), "Social image must be an https:// URL or an uploaded image."),
});

/** Stored data merged over the defaults; a blank text field means "use the default". */
export function resolveBlogSettings(stored: Record<string, unknown> | null | undefined): BlogSettings {
  const out = { ...BLOG_DEFAULTS };
  for (const key of Object.keys(BLOG_DEFAULTS) as (keyof BlogSettings)[]) {
    const v = stored?.[key];
    if (typeof BLOG_DEFAULTS[key] === "boolean") {
      if (typeof v === "boolean") (out[key] as boolean) = v;
    } else if (typeof v === "string" && v.trim()) {
      (out[key] as string) = v;
    }
  }
  return out;
}
