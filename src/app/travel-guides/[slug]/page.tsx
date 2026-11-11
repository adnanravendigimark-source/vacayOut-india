import type { Metadata } from "next";
import { cache } from "react";
import Image from "@/components/media/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GuideArticle, guideAnchor } from "@/components/guides/guide-article";
import { getPublishedGuide, listPublishedGuides } from "@/lib/guides/service";
import { guideText } from "@/lib/guides/body";
import { Icon } from "@/components/icons/icon";
import { TRIP_TYPES } from "@/lib/places/trip-types";
import { resolveStopLinks } from "@/lib/itineraries/service";
import { kindLabel } from "@/lib/places/kinds";
import { SLUG_RE } from "@/lib/places/slug";
import { site } from "@/lib/site";

export const revalidate = 3600;

// Not pre-built: each page is rendered on its first visit, then served from the CDN cache
// (ISR) until the hour is up or an admin publishes. Without this export Next renders the
// route on every request.
export function generateStaticParams() {
  return [];
}

type Params = { params: Promise<{ slug: string }> };

// cache(): generateMetadata and the page share one database read per render.
const load = cache(async (slug: string) => (SLUG_RE.test(slug) ? getPublishedGuide(slug) : null));

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const g = await load((await params).slug);
  if (!g) return {};
  return {
    title: { absolute: g.seoTitle },
    description: g.seoDescription,
    alternates: { canonical: `/travel-guides/${g.slug}` },
    openGraph: { type: "article", title: g.seoTitle, description: g.seoDescription, images: g.hero && g.hero.kind === "photo" ? [{ url: g.hero.url, alt: g.hero.alt }] : undefined },
  };
}

const when = (d: Date | null) => (d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" }) : null);
const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

/** A published travel guide. Only the frozen snapshot is shown; drafts are 404. */
export default async function GuidePage({ params }: Params) {
  const g = await load((await params).slug);
  if (!g) notFound();
  // Linked places are shown only while they are published.
  const refs = g.places.filter((p) => p.stateSlug).map((p) => (p.kind === "state" ? `${p.slug}/${p.slug}` : `${p.stateSlug}/${p.slug}`));
  const [links, all] = await Promise.all([resolveStopLinks(refs, null), listPublishedGuides().catch(() => [])]);
  const linked = g.places.map((p, i) => ({ ...p, href: p.kind === "state" ? `/india/${p.slug}` : (links[refs[i]] ?? null) })).filter((p) => p.href);
  // More guides: same place first, then the same state.
  const others = all.filter((x) => x.slug !== g.slug);
  const related = [
    ...others.filter((x) => x.place.slug === g.place.slug),
    ...others.filter((x) => x.place.slug !== g.place.slug && g.place.stateName && x.place.stateName === g.place.stateName),
  ].slice(0, 3);
  const sources = [...new Map((g.sources ?? []).filter((x) => /^https?:\/\//.test(x.url)).map((x) => [x.url, x])).values()];
  const minutes = Math.max(1, Math.round(guideText(g.title, g.body).split(/\s+/).length / 200));
  const types = TRIP_TYPES.filter((t) => g.tripTypes.includes(t.key));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: g.title,
    description: g.seoDescription,
    url: `${site.url}/travel-guides/${g.slug}`,
    ...(g.publishedAt ? { datePublished: g.publishedAt.toISOString() } : {}),
    ...(g.hero && g.hero.kind === "photo" ? { image: g.hero.url } : {}),
  };
  return (
    <article className="bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      {/* Title block on white, then the photo */}
      <header className="container-site pt-6 sm:pt-8">
        <nav aria-label="Breadcrumb" className="text-xs text-muted">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li><Link href="/" className="hover:text-ink">Home</Link></li>
            <li aria-hidden className="text-[#C9C4BA]">/</li>
            <li><Link href="/travel-guides" className="hover:text-ink">Travel guides</Link></li>
            <li aria-hidden className="text-[#C9C4BA]">/</li>
            <li>{g.place.path ? <Link href={g.place.path} className="hover:text-ink">{g.place.name}</Link> : g.place.name}</li>
          </ol>
        </nav>
        <div className="mt-6 max-w-3xl">
          {types.length ? (
            <div className="flex flex-wrap gap-2">
              {types.slice(0, 3).map((t) => (
                <Link key={t.key} href="/travel-guides" className="rounded-full bg-coral-soft px-3 py-1 text-[0.6875rem] font-bold uppercase tracking-wider text-coral hover:bg-coral hover:text-white">{t.label}</Link>
              ))}
            </div>
          ) : null}
          <h1 className="mt-4 font-serif text-[clamp(2rem,4.6vw,3.25rem)] font-bold leading-[1.08] tracking-tight text-ink">{g.title}</h1>
          <p className="mt-4 text-[1.0625rem] leading-relaxed text-[#5F5F5F] sm:text-lg">{g.summary}</p>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.8125rem] text-muted">
            <span className="flex items-center gap-2 font-semibold text-ink">
              <span aria-hidden className="flex size-7 items-center justify-center rounded-full bg-ink text-[0.625rem] font-bold text-white">VO</span>
              VacayOut editors
            </span>
            {when(g.publishedAt) ? <span className="flex items-center gap-1.5"><Icon name="calendar" size={14} />Updated {when(g.publishedAt)}</span> : null}
            <span className="flex items-center gap-1.5"><Icon name="clock" size={14} />{minutes} min read</span>
            {sources.length ? <a href="#sources" className="flex items-center gap-1.5 hover:text-ink"><Icon name="shield" size={14} />{sources.length} sources checked</a> : null}
          </div>
        </div>
        {g.hero ? (
          <figure className="mt-8">
            <div className="relative aspect-[16/9] overflow-hidden rounded-3xl bg-sand sm:aspect-[21/9]">
              <Image src={g.hero.url} alt={g.hero.alt} fill priority sizes="(min-width: 1280px) 1200px, 100vw" className="object-cover" />
            </div>
            <figcaption className="mt-2 text-xs text-muted">
              {g.hero.kind === "ai_generated" ? "AI-generated illustration — not a photograph of the place." : <>Photo: {g.hero.attribution ?? "—"} · {g.hero.license}</>}
            </figcaption>
          </figure>
        ) : null}
      </header>

      <div className="container-site grid gap-12 py-10 sm:py-14 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-16">
        <div className="min-w-0 max-w-[46rem]">
          <GuideArticle body={g.body} />

          {sources.length ? (
            <section id="sources" aria-labelledby="sources-h" className="mt-12 scroll-mt-28 border-t border-line-subtle pt-8">
              <h2 id="sources-h" className="font-serif text-xl font-semibold text-ink">Sources</h2>
              <p className="mt-1 text-[0.8125rem] text-muted">Facts in this guide were checked against these pages before an editor approved it.</p>
              <ol className="mt-4 space-y-2 text-sm">
                {sources.map((x, i) => (
                  <li key={x.url} className="flex gap-3">
                    <span className="w-5 shrink-0 text-right text-muted">{i + 1}.</span>
                    <a href={x.url} target="_blank" rel="nofollow noopener noreferrer" className="min-w-0 text-ink underline decoration-line underline-offset-4 hover:text-coral hover:decoration-coral">
                      {x.title || x.site || host(x.url)} <span className="text-xs text-muted">· {x.site || host(x.url)}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
          <nav aria-label="In this guide" className="rounded-2xl border border-line p-5">
            <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-muted">In this guide</p>
            <ol className="mt-3 space-y-1">
              {g.body.sections.map((s, i) => (
                <li key={i}>
                  <a href={`#${guideAnchor(i)}`} className="flex gap-2.5 rounded-lg px-2 py-1.5 text-sm text-ink transition-colors hover:bg-[#F6F4EF] hover:text-coral">
                    <span className="w-4 shrink-0 font-semibold text-coral">{i + 1}</span>
                    {s.heading}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          {linked.length ? (
            <div className="rounded-2xl border border-line p-5">
              <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-muted">Places in this guide</p>
              <ul className="mt-3 space-y-1">
                {linked.map((p) => (
                  <li key={`${p.stateSlug}/${p.slug}`}>
                    <Link href={p.href!} className="group flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-[#F6F4EF]">
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-ink group-hover:text-coral">{p.name}</span>
                        <span className="text-xs text-muted">{kindLabel(p.kind)}</span>
                      </span>
                      <Icon name="arrowRight" size={14} className="shrink-0 text-muted group-hover:text-coral" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="rounded-2xl bg-[#1B4332] p-5 text-white">
            <p className="font-serif text-lg font-semibold">Plan this trip</p>
            <p className="mt-1 text-[0.8125rem] text-white/80">Get a day-by-day plan for {g.place.name} built from our reviewed guides.</p>
            <Link href="/plan" className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-ink transition-colors hover:bg-coral hover:text-white">
              <Icon name="sparkles" size={13} />
              Plan with AI
            </Link>
          </div>
        </aside>
      </div>

      {related.length ? (
        <section className="border-t border-line-subtle bg-white py-12">
          <div className="container-site">
            <h2 className="font-serif text-2xl font-bold text-ink">More guides{g.place.stateName ? ` for ${g.place.stateName}` : ""}</h2>
            <div className="mt-6 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => (
                <Link key={r.slug} href={`/travel-guides/${r.slug}`} className="group block">
                  <div className="relative aspect-[3/2] overflow-hidden rounded-2xl bg-sand">
                    {r.hero ? <Image src={r.hero.url} alt="" fill sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 95vw" className="object-cover transition-transform duration-500 group-hover:scale-105" /> : null}
                  </div>
                  <h3 className="mt-4 line-clamp-2 font-serif text-lg font-bold leading-snug text-ink group-hover:text-coral">{r.title}</h3>
                  <p className="mt-1.5 line-clamp-2 text-[0.8125rem] leading-relaxed text-[#5F5F5F]">{r.summary}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </article>
  );
}
