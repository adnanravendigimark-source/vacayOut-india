import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { BlogIndex, BlogIndexWithQuery, type BlogIndexCopy } from "@/components/blog/blog-index";
import { PostImage } from "@/components/blog/post-image";
import { Icon } from "@/components/icons/icon";
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
    <div className="min-h-screen bg-canvas">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <section className="relative overflow-hidden bg-dark-surface text-white">
        <div className="absolute inset-0">
          {s.heroImage ? <PostImage src={s.heroImage} alt={s.heroImageAlt} sizes="100vw" preload className="object-cover object-center opacity-35" /> : null}
          <div className="absolute inset-0 bg-gradient-to-t from-dark-surface via-dark-surface/80 to-transparent" />
          <div aria-hidden className="absolute -right-24 -top-24 size-80 rounded-full bg-coral/20 blur-3xl" />
        </div>
        <div className="container-site relative py-16 text-center sm:py-20 sm:text-left">
          <nav aria-label="Breadcrumb" className="text-xs font-medium text-white/70">
            <ol className="flex items-center justify-center gap-1.5 sm:justify-start">
              <li><Link href="/" className="transition-colors hover:text-white">Home</Link></li>
              <li aria-hidden className="text-white/40">&gt;</li>
              <li className="font-semibold text-white" aria-current="page">Blog</li>
            </ol>
          </nav>
          <span className="mt-4 inline-block rounded-md border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-coral">{s.eyebrow}</span>
          <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">{s.heading}</h1>
          <div className="mx-auto mt-5 flex max-w-xs items-center justify-center gap-3 sm:mx-0 sm:justify-start" aria-hidden>
            <span className="h-px flex-1 bg-white/30" />
            <Icon name="compass" size={20} className="text-coral" />
            <span className="h-px flex-1 bg-white/30" />
          </div>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/85 sm:mx-0 sm:text-base">{s.subheading}</p>
        </div>
      </section>
      {/* The fallback is the full, unfiltered list — what crawlers and the first paint see. */}
      <Suspense fallback={<BlogIndex posts={posts} copy={copy} />}>
        <BlogIndexWithQuery posts={posts} copy={copy} />
      </Suspense>
    </div>
  );
}
