import type { Metadata } from "next";
import { Suspense } from "react";
import { BlogIndex, BlogIndexWithQuery, type BlogIndexCopy } from "@/components/blog/blog-index";
import { getBlogSettings, listPublishedPosts } from "@/lib/blog/service";
import { site } from "@/lib/site";

// Cached on the CDN; an admin save refreshes it at once, this is only the fallback timer.
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const s = await getBlogSettings();
  const title = s.ogTitle || s.metaTitle;
  const description = s.ogDescription || s.metaDescription;
  return {
    title: { absolute: s.metaTitle },
    description: s.metaDescription,
    alternates: { canonical: s.canonicalUrl || "/blog" },
    robots: { index: !s.noIndex, follow: !s.noFollow },
    openGraph: { type: "website", url: "/blog", title, description, images: s.ogImage || s.heroImage ? [{ url: s.ogImage || s.heroImage }] : undefined },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function BlogPage() {
  const [posts, s] = await Promise.all([listPublishedPosts(), getBlogSettings()]);
  const copy: BlogIndexCopy = {
    eyebrow: s.eyebrow,
    heading: s.heading,
    subheading: s.subheading,
    listHeading: s.listHeading,
    listSubheading: s.listSubheading,
    emptyStateText: s.emptyStateText,
    cta: { heading: s.ctaHeading, body: s.ctaBody, buttonText: s.ctaButtonText, buttonHref: s.ctaButtonHref },
  };
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: s.heading,
    url: `${site.url}/blog`,
    blogPost: posts.slice(0, 20).map((p) => ({ "@type": "BlogPosting", headline: p.title, url: `${site.url}/blog/${p.slug}`, datePublished: p.publishDate })),
  };
  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      {/* The fallback is the full, unfiltered list — what crawlers and the first paint see. */}
      <Suspense fallback={<BlogIndex posts={posts} copy={copy} />}>
        <BlogIndexWithQuery posts={posts} copy={copy} />
      </Suspense>
    </div>
  );
}
