import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { PostImage } from "@/components/blog/post-image";
import { PostSidebar } from "@/components/blog/post-sidebar";
import { Icon } from "@/components/icons/icon";
import { extractTableOfContents } from "@/lib/blog/html";
import { authorParts, formatPostDate, SLUG_RE } from "@/lib/blog/post";
import { getBlogSettings, getPublishedPost, getRecommendedPlace, listPublishedPosts, resolveRedirect } from "@/lib/blog/service";
import { site } from "@/lib/site";

export const revalidate = 3600;

// Not pre-built: each post is rendered on its first visit, then served from the CDN cache
// until an admin save refreshes it (or the hour is up).
export function generateStaticParams() {
  return [];
}

type Params = { params: Promise<{ slug: string }> };

// cache(): generateMetadata and the page share one database read per render.
const load = cache(async (slug: string) => (SLUG_RE.test(slug) ? getPublishedPost(slug) : null));

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const post = await load((await params).slug);
  if (!post) return {};
  const title = post.ogTitle || post.metaTitle || post.title;
  const description = post.ogDescription || post.metaDescription || post.excerpt;
  const image = post.ogImage || post.image;
  return {
    title: { absolute: post.metaTitle || post.title },
    description: post.metaDescription || post.excerpt,
    alternates: { canonical: post.canonicalUrl || `/blog/${post.slug}` },
    robots: { index: !post.noIndex, follow: !post.noFollow },
    authors: post.author ? [{ name: authorParts(post.author, site.name).name }] : undefined,
    openGraph: {
      type: "article",
      url: `/blog/${post.slug}`,
      title,
      description,
      publishedTime: post.publishDate,
      modifiedTime: post.updatedAt,
      images: image ? [{ url: image, alt: post.imageAlt }] : undefined,
    },
    twitter: { card: "summary_large_image", title, description, images: image ? [image] : undefined },
  };
}

export default async function BlogPostPage({ params }: Params) {
  const { slug } = await params;
  const post = await load(slug);
  if (!post) {
    const target = SLUG_RE.test(slug) ? await resolveRedirect(slug) : null;
    if (target) permanentRedirect(`/blog/${target}`);
    notFound();
  }
  const [settings, all, place] = await Promise.all([getBlogSettings(), listPublishedPosts(), getRecommendedPlace(post.recommendedPlaceId)]);
  const hasQuick = Boolean(post.quickAnswer.trim());
  const { toc: headingToc, html } = extractTableOfContents(post.content, hasQuick ? ["quick-answer"] : []);
  const toc = hasQuick ? [{ id: "quick-answer", text: settings.quickAnswerLabel, level: 2 as const }, ...headingToc] : headingToc;
  const author = authorParts(post.author, `${site.name} Team`);
  const recent = all.filter((p) => p.slug !== post.slug).slice(0, 4);
  const ctaExternal = /^https?:\/\//.test(post.ctaButtonHref);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.metaDescription || post.excerpt,
      ...(post.image ? { image: [post.image] } : {}),
      datePublished: post.publishDate,
      dateModified: post.updatedAt,
      author: post.author ? { "@type": "Person", name: author.name, ...(author.role ? { jobTitle: author.role } : {}) } : { "@type": "Organization", name: site.name },
      publisher: { "@type": "Organization", name: site.name, url: site.url },
      mainEntityOfPage: { "@type": "WebPage", "@id": `${site.url}/blog/${post.slug}` },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: site.url },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${site.url}/blog` },
        { "@type": "ListItem", position: 3, name: post.title, item: `${site.url}/blog/${post.slug}` },
      ],
    },
  ];

  return (
    <article className="min-h-screen bg-canvas">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="container-site pt-6">
        <nav aria-label="Breadcrumb" className="text-xs font-medium text-muted">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li><Link href="/" className="transition-colors hover:text-coral">Home</Link></li>
            <li aria-hidden className="text-line">&gt;</li>
            <li><Link href="/blog" className="transition-colors hover:text-coral">Blog</Link></li>
            <li aria-hidden className="text-line">&gt;</li>
            <li className="line-clamp-1 font-semibold text-ink" aria-current="page">{post.title}</li>
          </ol>
        </nav>

        <header className="mt-5">
          {post.category ? <span className="inline-block rounded-md bg-coral-soft px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-coral">{post.category}</span> : null}
          <h1 className="mt-3.5 max-w-4xl font-serif text-3xl font-semibold leading-tight text-ink sm:text-4xl lg:text-5xl">{post.title}</h1>
          {post.excerpt ? <p className="mt-3.5 max-w-3xl text-sm leading-relaxed text-muted sm:text-base">{post.excerpt}</p> : null}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-muted">
            <span className="inline-flex items-center gap-1.5"><Icon name="calendar" size={16} className="text-coral" /><time dateTime={post.publishDate}>{formatPostDate(post.publishDate)}</time></span>
            {post.readTime ? <span className="inline-flex items-center gap-1.5"><Icon name="clock" size={16} className="text-coral" />{post.readTime}</span> : null}
            <span className="inline-flex items-center gap-2">
              <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-full bg-coral text-[10px] font-bold text-white">{author.initials}</span>
              <span className="font-semibold text-ink">By {author.name}</span>
              {author.role ? <span className="text-muted">· {author.role}</span> : null}
            </span>
          </div>
          {post.image ? (
            <figure className="mt-6">
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-line bg-sand shadow-sm sm:aspect-[21/10]">
                <PostImage src={post.image} alt={post.imageAlt || post.title} sizes="(min-width: 1320px) 1240px, 100vw" preload className="object-cover" />
              </div>
              {post.imageCredit ? <figcaption className="mt-2 text-right text-[11px] text-muted">{post.imageCredit}</figcaption> : null}
            </figure>
          ) : null}
        </header>

        <div className="mt-10 pb-20 lg:grid lg:grid-cols-[1fr_300px] lg:gap-10">
          <div className="min-w-0">
            {hasQuick ? (
              <div id="quick-answer" className="flex scroll-mt-24 gap-3.5 rounded-2xl border border-amber-300/80 bg-gradient-to-br from-amber-50 via-white to-orange-50/50 p-6 shadow-sm">
                <div aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/20 text-amber-800">
                  <Icon name="bulb" size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-800">{settings.quickAnswerLabel}</p>
                  <p className="mt-1 text-sm font-medium leading-relaxed text-ink/80">{post.quickAnswer}</p>
                </div>
              </div>
            ) : null}

            {/* Stored HTML is sanitised on every save (src/lib/blog/html.ts). */}
            <div className="rich-content mt-8 max-w-none text-[1.0625rem] leading-relaxed text-ink/85" dangerouslySetInnerHTML={{ __html: html }} />

            {place ? (
              <Link href={place.href} className="group mt-10 flex items-center gap-4 rounded-2xl border border-line bg-white p-4 shadow-card transition hover:border-coral/40 hover:shadow-card-hover">
                <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-sand">
                  {place.image ? <PostImage src={place.image.url} alt={place.image.alt} sizes="120px" className="object-cover transition group-hover:scale-105" /> : null}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-coral">Recommended destination{place.stateName && place.stateName !== place.name ? ` · ${place.stateName}` : ""}</p>
                  <p className="mt-1 font-serif text-lg font-semibold text-ink group-hover:text-coral">{place.name}</p>
                  {place.summary ? <p className="mt-0.5 line-clamp-2 text-xs text-muted">{place.summary}</p> : null}
                </div>
                <span aria-hidden className="ml-auto hidden text-coral transition-transform group-hover:translate-x-1 sm:block">→</span>
              </Link>
            ) : null}

            {post.ctaHeading ? (
              <div className="mt-12 flex flex-col items-center justify-between gap-5 rounded-2xl border border-line bg-gradient-to-br from-coral-soft via-white to-sand/60 p-6 text-center shadow-sm sm:flex-row sm:text-left">
                <div className="flex items-center gap-4">
                  <div aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-coral-soft text-coral">
                    <Icon name="ticket" size={24} />
                  </div>
                  <div>
                    <p className="font-serif text-base font-semibold text-ink">{post.ctaHeading}</p>
                    {post.ctaBody ? <p className="mt-0.5 text-xs text-muted">{post.ctaBody}</p> : null}
                  </div>
                </div>
                {post.ctaButtonText && post.ctaButtonHref ? (
                  ctaExternal ? (
                    <a href={post.ctaButtonHref} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-coral px-5 py-2.5 text-xs font-bold text-white shadow-coral transition hover:scale-[1.02] hover:bg-coral-hover">{post.ctaButtonText}</a>
                  ) : (
                    <Link href={post.ctaButtonHref} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-coral px-5 py-2.5 text-xs font-bold text-white shadow-coral transition hover:scale-[1.02] hover:bg-coral-hover">{post.ctaButtonText}</Link>
                  )
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="mt-12 lg:mt-0">
            <PostSidebar toc={toc} tocLabel={settings.tocLabel} recent={recent} cta={{ heading: settings.ctaHeading, body: settings.ctaBody, buttonText: settings.ctaButtonText, buttonHref: settings.ctaButtonHref }} />
          </div>
        </div>
      </div>
    </article>
  );
}
