import type { Metadata } from "next";
import { cache } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icons/icon";
import { ItineraryPlanView } from "@/components/itineraries/itinerary-plan";
import { getPublishedItinerary, resolveStopLinks } from "@/lib/itineraries/service";
import { SLUG_RE } from "@/lib/places/slug";
import { TRIP_TYPES } from "@/lib/places/trip-types";
import { routes } from "@/lib/routes";
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
const load = cache(async (slug: string) => (SLUG_RE.test(slug) ? getPublishedItinerary(slug) : null));

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const it = await load((await params).slug);
  if (!it) return {};
  return {
    title: { absolute: it.seoTitle },
    description: it.seoDescription,
    alternates: { canonical: `/itineraries/${it.slug}` },
    openGraph: { title: it.seoTitle, description: it.seoDescription, images: it.hero && it.hero.kind === "photo" ? [{ url: it.hero.url, alt: it.hero.alt }] : undefined },
  };
}

/** A published itinerary. Only the frozen snapshot is shown; drafts are 404. */
export default async function ItineraryPage({ params }: Params) {
  const it = await load((await params).slug);
  if (!it) notFound();
  // Stops link only to guides that are published right now.
  const links = await resolveStopLinks(it.plan.days.flatMap((d) => d.stops.flatMap((s) => (s.placeSlug ? [s.placeSlug] : []))), it.place.stateSlug);
  const placeHref = (ref: string) => links[ref] ?? null;
  const types = TRIP_TYPES.filter((t) => it.tripTypes.includes(t.key));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: it.title,
    description: it.seoDescription,
    url: `${site.url}/itineraries/${it.slug}`,
    itinerary: { "@type": "ItemList", itemListElement: it.plan.days.map((d, i) => ({ "@type": "ListItem", position: i + 1, name: d.title })) },
  };
  return (
    <article className="bg-[#FBFAF7]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <header className={`relative overflow-hidden ${it.hero ? "min-h-[20rem] bg-ink text-white" : "bg-[#F1EEE7] text-ink"}`}>
        {it.hero ? (
          <>
            <Image src={it.hero.url} alt={it.hero.alt} fill priority sizes="100vw" className="object-cover" />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/25" />
          </>
        ) : null}
        <div className={`container-site relative flex flex-col justify-end ${it.hero ? "min-h-[20rem] pb-8 pt-16" : "py-10"}`}>
          <nav aria-label="Breadcrumb" className={`text-sm ${it.hero ? "text-white/90" : "text-muted"}`}>
            <Link href="/itineraries" className="hover:underline">Itineraries</Link> › {it.place.name}
          </nav>
          <span className={`mt-4 inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${it.hero ? "bg-white/15 backdrop-blur-md" : "bg-white"}`}>
            <Icon name="clock" size={12} /> {it.durationDays} days{types.length ? ` · ${types.map((t) => t.label).join(", ")}` : ""}
          </span>
          <h1 className="mt-3 font-serif text-[clamp(2rem,5vw,3.5rem)] font-medium leading-[1.08]">{it.title}</h1>
          <p className={`mt-3 max-w-2xl text-[1.0625rem] leading-relaxed ${it.hero ? "text-white/90" : "text-muted"}`}>{it.summary}</p>
          {it.hero ? (
            <p className="mt-4 text-xs text-white/80">
              {it.hero.kind === "ai_generated" ? "AI-generated illustration — not a photograph of the place." : <>Photo: {it.hero.attribution ?? "—"} · {it.hero.license}{it.hero.sourceUrl ? <> · <a href={it.hero.sourceUrl} target="_blank" rel="nofollow noopener noreferrer" className="underline">source</a></> : null}</>}
            </p>
          ) : null}
        </div>
      </header>

      <div className="container-site grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <ItineraryPlanView plan={it.plan} placeHref={placeHref} />
        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          {it.place.path ? (
            <Link href={it.place.path} className="block rounded-2xl border border-line bg-white p-5 shadow-card hover:border-coral">
              <p className="text-xs font-semibold uppercase tracking-wider text-coral">Destination guide</p>
              <p className="mt-1 font-serif text-xl font-medium text-ink">{it.place.name}</p>
              <p className="mt-1 text-sm text-muted">Best time, getting there, where to stay, etiquette and safety.</p>
            </Link>
          ) : null}
          <div className="rounded-2xl border border-line bg-[#F1EEE7] p-5">
            <p className="font-semibold text-ink">Make it yours</p>
            <p className="mt-1 text-sm text-muted">Change the pace, budget or dates with our AI planner.</p>
            <Link href={routes.chatWithPrompt(`Customise the VacayOut "${it.title}" itinerary for me`)} className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-black">
              <Icon name="sparkles" size={14} /> Customise with AI
            </Link>
          </div>
        </aside>
      </div>
    </article>
  );
}
