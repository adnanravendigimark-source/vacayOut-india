import type { Metadata } from "next";
import { cache } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GuideArticle, guideAnchor } from "@/components/guides/guide-article";
import { getPublishedGuide } from "@/lib/guides/service";
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

/** A published travel guide. Only the frozen snapshot is shown; drafts are 404. */
export default async function GuidePage({ params }: Params) {
  const g = await load((await params).slug);
  if (!g) notFound();
  // Linked places are shown only while they are published.
  const refs = g.places.filter((p) => p.stateSlug).map((p) => (p.kind === "state" ? `${p.slug}/${p.slug}` : `${p.stateSlug}/${p.slug}`));
  const links = await resolveStopLinks(refs, null);
  const linked = g.places.map((p, i) => ({ ...p, href: p.kind === "state" ? `/india/${p.slug}` : (links[refs[i]] ?? null) })).filter((p) => p.href);
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
    <article className="bg-[#FBFAF7]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <header className={`relative overflow-hidden ${g.hero ? "min-h-[20rem] bg-ink text-white" : "bg-[#F1EEE7] text-ink"}`}>
        {g.hero ? (
          <>
            <Image src={g.hero.url} alt={g.hero.alt} fill priority sizes="100vw" className="object-cover" />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/25" />
          </>
        ) : null}
        <div className={`container-site relative flex flex-col justify-end ${g.hero ? "min-h-[20rem] pb-8 pt-16" : "py-10"}`}>
          <nav aria-label="Breadcrumb" className={`text-sm ${g.hero ? "text-white/90" : "text-muted"}`}>
            <Link href="/travel-guides" className="hover:underline">Travel guides</Link>
            {g.place.path ? <> › <Link href={g.place.path} className="hover:underline">{g.place.name}</Link></> : <> › {g.place.name}</>}
          </nav>
          <h1 className="mt-4 max-w-3xl font-serif text-[clamp(1.75rem,4vw,2.75rem)] font-medium leading-[1.1]">{g.title}</h1>
          <p className={`mt-3 max-w-2xl text-[0.9375rem] leading-relaxed ${g.hero ? "text-white/90" : "text-muted"}`}>{g.summary}</p>
          <p className={`mt-4 text-xs ${g.hero ? "text-white/80" : "text-muted"}`}>
            {when(g.publishedAt) ? <>Updated {when(g.publishedAt)}</> : null}
            {g.hero ? <> · {g.hero.kind === "ai_generated" ? "AI-generated illustration — not a photograph of the place." : <>Photo: {g.hero.attribution ?? "—"} · {g.hero.license}</>}</> : null}
          </p>
        </div>
      </header>

      <div className="container-site grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <GuideArticle body={g.body} />
        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <nav aria-label="In this guide" className="rounded-2xl border border-line bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">In this guide</p>
            <ol className="mt-3 space-y-2 text-sm">
              {g.body.sections.map((s, i) => <li key={i}><a href={`#${guideAnchor(i)}`} className="text-ink hover:text-coral">{s.heading}</a></li>)}
            </ol>
          </nav>
          {linked.length ? (
            <div className="rounded-2xl border border-line bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Places in this guide</p>
              <ul className="mt-3 space-y-2 text-sm">
                {linked.map((p) => (
                  <li key={`${p.stateSlug}/${p.slug}`}><Link href={p.href!} className="font-medium text-ink hover:text-coral">{p.name}</Link> <span className="text-xs text-muted">· {kindLabel(p.kind)}</span></li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>
    </article>
  );
}
