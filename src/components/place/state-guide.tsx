import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icon, type Name } from "@/components/icons/icon";
import type { PublishedSnapshot, SectionBody, SectionSource, SnapshotImage } from "@/lib/db/schema";
import { routes } from "@/lib/routes";
import { mapPoints } from "@/lib/map";
import { kindLabel } from "@/lib/places/kinds";
import { categoryLabel } from "@/lib/places/categories";
import { zoneOf } from "@/lib/places/states";
import { tripTypeLabel } from "@/lib/places/trip-types";
import type { PlaceRollup, RollupPlace } from "@/lib/places/rollup";
import { PlaceMap } from "@/components/map/place-map";
import { PageAssistant } from "@/components/assistant/page-assistant";
import { buildPack } from "@/lib/assistant/pack";
import { FaqList, SectionBody as SectionBodyView, StatusPill } from "./section-body";
import { HashDialogs } from "./interactive";
import { FilterCards, PlanAiButton } from "./state-guide-client";

/**
 * The state guide. Every state page uses this one template, filled only from the
 * published state record and the published places, itineraries and guides inside it.
 * A part with no data is left out (and so is its link in the menu); nothing is invented.
 */

type Inline = { slug: string; snapshot: PublishedSnapshot };
type Related = { name: string; slug: string; kind: string; summary: string | null; type: "nearby" | "day_trip"; stateSlug: string | null; lat?: number | null; lng?: number | null; hero?: SnapshotImage | null };
type Item = NonNullable<SectionBody["items"]>[number];

const ext = { target: "_blank", rel: "nofollow noopener noreferrer" } as const;
const paragraphs = (text: string | undefined) => (text ?? "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

/** Icon for a fact, by its title. */
function factIcon(title: string | undefined): Name {
  const t = (title ?? "").toLowerCase();
  if (/altitude|height|elevation/.test(t)) return "mountain";
  if (/season|best time|month|monsoon|winter|snow|closed|open/.test(t)) return "calendar";
  if (/time needed|duration|hours|days|length/.test(t)) return "clock";
  if (/fee|price|cost|ticket/.test(t)) return "ticket";
  if (/airport|flight/.test(t)) return "plane";
  if (/rail|train|station/.test(t)) return "train";
  if (/permit|quota|pass\b|documents|rule/.test(t)) return "shield";
  if (/where|location|distance|from|route|start|getting/.test(t)) return "pin";
  if (/festival|fair/.test(t)) return "star";
  if (/difficulty|grade/.test(t)) return "route";
  return "checkCircle";
}

/** Photo credit (author · licence · source) or the AI-illustration notice. */
function Credit({ img }: { img: SnapshotImage }) {
  if (img.kind === "ai_generated") return <p className="text-[0.6875rem] text-white/80">AI-generated illustration — not a photograph of the place.</p>;
  return (
    <p className="text-[0.6875rem] text-white/80">
      {img.attribution ? <>Photo: {img.attribution} · </> : null}
      {img.licenseUrl && /^https?:\/\//.test(img.licenseUrl) ? <a href={img.licenseUrl} {...ext} rel="license nofollow noopener noreferrer" className="underline">{img.license}</a> : img.license}
      {img.sourceUrl && /^https?:\/\//.test(img.sourceUrl) ? <> · <a href={img.sourceUrl} {...ext} className="underline">source</a></> : null}
    </p>
  );
}

function CardCredit({ img }: { img: SnapshotImage }) {
  return (
    <span className="absolute bottom-1.5 right-1.5 max-w-[90%] truncate rounded bg-black/60 px-1.5 py-0.5 text-[0.625rem] text-white">
      {img.kind === "ai_generated" ? "AI illustration" : `${img.attribution ?? "Photo"} · ${img.license}`}
    </span>
  );
}

function Photo({ img, sizes, aspect = "aspect-[4/3]", fallback = "mountain", children }: { img: SnapshotImage | null; sizes: string; aspect?: string; fallback?: Name; children?: ReactNode }) {
  return (
    <div className={`relative ${aspect} w-full overflow-hidden bg-[#ECE8E0]`}>
      {img ? (
        <Image src={img.url} alt={img.alt} fill sizes={sizes} className="object-cover transition-transform duration-500 group-hover:scale-105" />
      ) : (
        <span className="flex size-full items-center justify-center text-[#B8B2A6]"><Icon name={fallback} size={30} /></span>
      )}
      {img ? <CardCredit img={img} /> : null}
      {children}
    </div>
  );
}

function SectionHead({ id, eyebrow, title, intro, more }: { id: string; eyebrow: string; title: string; intro?: string; more?: { href: string; label: string } | null }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider text-coral">{eyebrow}</p>
        <h2 id={`${id}-h`} className="mt-1 font-serif text-2xl font-bold text-ink sm:text-3xl">{title}</h2>
        {intro ? <p className="mt-1 max-w-2xl text-sm text-[#666]">{intro}</p> : null}
      </div>
      {more ? (
        <Link href={more.href} className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-coral hover:underline">
          {more.label} <Icon name="arrowRight" size={14} />
        </Link>
      ) : null}
    </div>
  );
}

/** "Title: body" rows with a sure-or-not badge. */
function FactRows({ items, size = "sm" }: { items: Item[]; size?: "sm" | "xs" }) {
  return (
    <ul className={`space-y-1.5 ${size === "xs" ? "text-[0.75rem]" : "text-[0.8125rem]"} leading-snug text-[#555]`}>
      {items.map((it, i) => (
        <li key={i} className="flex gap-2">
          <Icon name={factIcon(it.title)} size={13} className="mt-0.5 shrink-0 text-[#2D5A3F]" />
          <span className="min-w-0">
            {it.title ? <strong className="font-semibold text-ink">{it.title}: </strong> : null}
            {it.body}
            {it.status ? <StatusPill status={it.status} className="ml-1.5 align-middle" /> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

const isPermit = (it: Item) => /permit|quota/i.test(it.title ?? "");

/** "Summer (mid-April–June): text" → { label: "Summer", when: "mid-April–June", text }. */
function labelled(p: string) {
  const m = /^([^:\n]{3,60}):\s+([\s\S]+)$/.exec(p);
  if (!m) return null;
  const head = m[1].trim();
  const when = /\(([^)]+)\)\s*$/.exec(head);
  const text = m[2].trim();
  return { label: when ? head.slice(0, when.index).trim() : head, when: when ? when[1] : null, text: text.charAt(0).toUpperCase() + text.slice(1) };
}

const SEASON_TONE: { re: RegExp; card: string; tag: string }[] = [
  { re: /monsoon|rain/i, card: "border-amber-200 bg-amber-50/60", tag: "text-amber-800" },
  { re: /winter|snow/i, card: "border-sky-200 bg-sky-50/60", tag: "text-sky-800" },
  { re: /summer|spring/i, card: "border-emerald-200 bg-emerald-50/50", tag: "text-emerald-800" },
];
const seasonTone = (label: string) => SEASON_TONE.find((t) => t.re.test(label)) ?? { card: "border-[#EAE7E0] bg-[#FAF8F5]", tag: "text-coral" };

export function StateGuide({
  snapshot,
  stateSlug,
  rollup,
  inline,
  related,
}: {
  snapshot: PublishedSnapshot;
  stateSlug: string;
  rollup: PlaceRollup;
  inline: Inline[];
  related: Related[];
}) {
  const place = snapshot.place;
  const name = place.name;
  const sec = (key: string) => snapshot.sections.find((s) => s.key === key && (s.body.text?.trim() || s.body.items?.length));
  const items = (key: string) => sec(key)?.body.items ?? [];
  const zone = zoneOf(name);

  const pageOf = (p: RollupPlace): string | null => {
    if (p.displayMode === "parent_section") {
      if (!p.parentSlug) return null;
      if (p.parentKind === "state") return p.parentSlug === place.slug ? `#${p.slug}` : `/india/${p.parentSlug}#${p.slug}`;
      return `/india/${stateSlug}/${p.parentSlug}#${p.slug}`;
    }
    return `/india/${stateSlug}/${p.slug}`;
  };
  const near = (p: RollupPlace) => (p.parentName && p.parentKind !== "state" ? p.parentName : null);

  // ---- Data for each part ----
  const keyFacts = items("key_facts");
  const overview = sec("overview");
  const highlights = items("highlights");
  const regions = items("regions");
  const food = items("food");
  const culture = items("culture_etiquette");
  const reach = sec("how_to_reach");
  const bestTime = sec("best_time");
  const faqs = sec("faqs");
  const safety = items("safety_health");

  const all = [...rollup.destinations, ...rollup.attractions, ...rollup.activities];
  const inside = (id: string) => all.filter((x) => x.parentId === id).length;
  // Cities, then valleys, then towns; within each, the ones with more places inside first.
  const KIND_RANK: Record<string, number> = { city: 0, region: 1, town: 2 };
  const destinations = [...rollup.destinations].sort((a, b) => a.depth - b.depth || (KIND_RANK[a.kind] ?? 3) - (KIND_RANK[b.kind] ?? 3) || inside(b.id) - inside(a.id) || a.name.localeCompare(b.name));
  // Unconfirmed details go last on a card.
  const sure = (list: Item[]) => [...list].sort((a, b) => Number(a.status === "unconfirmed") - Number(b.status === "unconfirmed"));
  const attractions = rollup.attractions
    .filter((a) => pageOf(a))
    .sort((a, b) => Number(!!b.facts?.visit_info) - Number(!!a.facts?.visit_info) || Number(!!b.hero) - Number(!!a.hero) || a.depth - b.depth);
  const activities = rollup.activities.filter((a) => pageOf(a)).sort((a, b) => Number(!!b.hero) - Number(!!a.hero));
  const { itineraries, guides } = rollup;

  // Seasonal access, straight from the places' own visiting info.
  const seasonal = [...rollup.attractions, ...rollup.activities]
    .flatMap((p) => (p.facts?.visit_info?.items ?? []).filter((it) => /^(season|winter|closed)/i.test(it.title ?? "") && it.status !== "unconfirmed").slice(0, 1).map((it) => ({ p, it })))
    .slice(0, 6);

  // How to reach and best time: paragraphs written as "Label: text" become cards.
  const reachParas = paragraphs(reach?.body.text);
  const reachCols = reachParas.map(labelled);
  const reachSplit = reachCols.length > 1 && reachCols.every(Boolean);
  const reachIcon = (label: string): Name => (/air|fly|flight/i.test(label) ? "plane" : /rail|train/i.test(label) ? "train" : /road|bus|drive/i.test(label) ? "bus" : "route");
  const seasonParas = paragraphs(bestTime?.body.text);
  const seasonCards = seasonParas.map(labelled);
  const seasonSplit = seasonCards.length > 1 && seasonCards.every(Boolean);

  // Practical sections not shown elsewhere, in a traveller's order.
  const PRACTICAL: { key: string; title: string; icon: Name }[] = [
    { key: "practical_info", title: "Permits, money & essentials", icon: "fileText" },
    { key: "local_transport", title: "Getting around", icon: "car" },
    { key: "where_to_stay", title: "Where to stay", icon: "bed" },
    { key: "budget", title: "Budget", icon: "coins" },
    { key: "safety_health", title: "Safety & health", icon: "shield" },
    { key: "accessibility", title: "Accessibility", icon: "user" },
    { key: "travel_tips", title: "Travel tips", icon: "bulb" },
    { key: "common_mistakes", title: "Mistakes to avoid", icon: "help" },
  ];
  const practical = PRACTICAL.map((p) => ({ ...p, s: sec(p.key) })).filter((p) => p.s);

  const points = mapPoints([
    { name, lat: place.lat, lng: place.lng, primary: true },
    ...destinations.map((d) => ({ name: d.name, lat: d.lat, lng: d.lng, href: pageOf(d) ?? undefined })),
    ...attractions.map((a) => ({ name: a.name, lat: a.lat, lng: a.lng, href: pageOf(a) ?? undefined })),
  ]);

  // Each destination is linked under the first region that names it.
  const used = new Set<string>();
  const regionTowns = regions.map((r) => {
    const text = `${r.title ?? ""} ${r.body}`.toLowerCase();
    const hit = destinations.filter((d) => !used.has(d.slug) && text.includes(d.name.toLowerCase())).slice(0, 6);
    hit.forEach((d) => used.add(d.slug));
    return hit;
  });

  const sources = [...new Map(snapshot.sections.flatMap((s) => s.sources ?? []).filter((s: SectionSource) => /^https?:\/\//.test(s.url)).map((s) => [s.url, s])).values()];

  const nearbyStates = related.filter((r) => r.kind === "state");

  // Menu: only parts that are on the page.
  const nav = [
    { id: "overview", label: "About", on: !!overview },
    { id: "regions", label: "Regions", on: regions.length > 0 },
    { id: "destinations", label: "Destinations", on: destinations.length > 0 },
    { id: "places", label: "Places to visit", on: attractions.length > 0 },
    { id: "things", label: "Things to do", on: activities.length > 0 },
    { id: "best-time", label: "Best time", on: !!bestTime },
    { id: "reach", label: "How to reach", on: !!reach },
    { id: "itineraries", label: "Itineraries", on: itineraries.length > 0 },
    { id: "guides", label: "Travel guides", on: guides.length > 0 },
    { id: "plan", label: "Practical info", on: practical.length > 0 },
    { id: "faqs", label: "FAQs", on: !!faqs || points.length > 1 },
  ].filter((n) => n.on);

  const jsonLd: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "TouristDestination",
      name,
      description: place.seoDescription,
      ...(place.hero && place.hero.kind === "photo" ? { image: place.hero.url } : {}),
      ...(place.lat != null && place.lng != null ? { geo: { "@type": "GeoCoordinates", latitude: place.lat, longitude: place.lng } } : {}),
      ...(destinations.length ? { containsPlace: destinations.slice(0, 30).map((d) => ({ "@type": "TouristDestination", name: d.name })) } : {}),
    },
  ];
  if (faqs?.body.items?.length) {
    jsonLd.push({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.body.items.map((f) => ({ "@type": "Question", name: f.title, acceptedAnswer: { "@type": "Answer", text: f.body } })) });
  }

  const planPrompt = `Plan a trip to ${name}`;
  const hasStatus = [keyFacts, safety, ...practical.map((p) => p.s?.body.items ?? [])].some((list) => list.some((i) => i.status));

  return (
    <div className="min-h-screen bg-[#FAF9F5] font-sans text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      {/* A. Hero */}
      <section className="relative isolate flex min-h-[480px] w-full items-end overflow-hidden pb-10 sm:min-h-[540px] sm:pb-14 lg:min-h-[600px]">
        <div className="absolute inset-0 -z-20 bg-[#1F3F2C]">
          {place.hero ? <Image src={place.hero.url} alt={place.hero.alt} fill priority sizes="100vw" className="object-cover object-center" /> : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/25" />
        </div>
        <div className="container-site w-full text-white">
          <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-2 text-xs text-white/80">
            <Link href="/" className="transition-colors hover:text-white">Home</Link>
            <span className="text-white/50">/</span>
            <Link href="/india" className="transition-colors hover:text-white">Explore India</Link>
            <span className="text-white/50">/</span>
            <span className="font-medium text-white" aria-current="page">{name}</span>
          </nav>
          <div className="max-w-3xl">
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
              <Icon name="map" size={13} className="text-coral" />
              {zone ? `${zone} India · ` : ""}State guide
            </span>
            <h1 className="font-serif text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">{name}</h1>
            {place.summary ? <p className="mt-3 text-sm font-light leading-relaxed text-white/90 sm:text-base">{place.summary}</p> : null}
            {keyFacts.length ? (
              <ul className="mt-5 flex flex-wrap gap-2 text-xs">
                {keyFacts.slice(0, 4).map((f, i) => (
                  <li key={i} className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-black/40 px-3 py-1.5 text-white/90 backdrop-blur-md">
                    <Icon name={factIcon(f.title)} size={14} className="text-coral" />
                    <span>{f.title ? <strong>{f.title}: </strong> : null}{f.body}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {destinations.length ? (
                <a href="#destinations" className="inline-flex items-center gap-2 rounded-xl bg-coral px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-coral-dark">
                  Explore destinations <Icon name="arrowRight" size={14} />
                </a>
              ) : null}
              <PlanAiButton prompt={planPrompt} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/30 bg-white/20 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-md transition-all hover:bg-white/30">
                <Icon name="sparkles" size={15} className="text-amber-300" /> Plan {name} with AI
              </PlanAiButton>
            </div>
          </div>
          {place.hero ? <div className="mt-6 flex justify-end"><Credit img={place.hero} /></div> : null}
        </div>
      </section>

      {/* Section menu */}
      {nav.length > 1 ? (
        <nav aria-label="On this page" className="sticky top-[4.5rem] z-30 border-b border-[#E5E2DC] bg-white/95 shadow-xs backdrop-blur-md lg:top-20">
          <div className="container-site flex items-center justify-between gap-4 py-3">
            <ul className="-mx-1 flex min-w-0 items-center gap-5 overflow-x-auto px-1 text-xs font-semibold text-[#555] [scrollbar-width:none]">
              {nav.map((n) => (
                <li key={n.id} className="shrink-0"><a href={`#${n.id}`} className="transition-colors hover:text-coral">{n.label}</a></li>
              ))}
            </ul>
            <PlanAiButton prompt={planPrompt} className="hidden shrink-0 items-center gap-1.5 rounded-lg border border-[#E0DCD4] bg-[#FAF8F5] px-3 py-1 text-xs font-bold text-ink transition-all hover:border-coral hover:text-coral sm:inline-flex">
              <Icon name="sparkles" size={12} className="text-coral" /> AI plan
            </PlanAiButton>
          </div>
        </nav>
      ) : null}

      <main className="container-site space-y-16 py-10 sm:space-y-20 sm:py-14">
        {/* B. About */}
        {overview || keyFacts.length || food.length ? (
          <section id="overview" aria-labelledby="overview-h" className="scroll-mt-36">
            <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-12">
              <div className="space-y-6 lg:col-span-8">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-coral">State overview</p>
                  <h2 id="overview-h" className="mt-1 font-serif text-2xl font-bold text-ink sm:text-3xl">About {name}</h2>
                </div>
                {overview ? (
                  <div className="space-y-4 text-[0.9375rem] leading-relaxed text-[#444] sm:text-base">
                    {paragraphs(overview.body.text).map((p, i) => <p key={i}>{p}</p>)}
                  </div>
                ) : null}
                {highlights.length ? (
                  <ul className="grid gap-2.5 sm:grid-cols-2">
                    {highlights.map((h, i) => (
                      <li key={i} className="flex gap-2.5 rounded-xl border border-[#EAE7E0] bg-white p-3 text-sm leading-relaxed text-[#444]">
                        <Icon name="star" size={15} className="mt-0.5 shrink-0 text-coral" />
                        <span>{h.title ? <strong className="text-ink">{h.title}. </strong> : null}{h.body}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {food.length || culture.length ? (
                  <div id="food" className="scroll-mt-36 rounded-2xl border border-[#E8EDE6] bg-white p-6 shadow-xs">
                    <h3 className="flex items-center gap-2 text-base font-bold text-ink"><Icon name="utensils" size={18} className="text-coral" /> Food, culture & etiquette</h3>
                    <div className="mt-3 grid gap-6 md:grid-cols-2">
                      {food.length ? (
                        <div>
                          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#888]">What to eat</p>
                          <FactRows items={food} />
                        </div>
                      ) : null}
                      {culture.length ? (
                        <div>
                          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#888]">Good to know</p>
                          <FactRows items={culture} />
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>

              <aside className="space-y-4 lg:col-span-4">
                {keyFacts.length ? (
                  <div className="rounded-2xl border border-[#E5E2DC] bg-white p-5 shadow-xs">
                    <h3 className="mb-3 flex items-center gap-2 font-serif text-base font-bold text-ink"><Icon name="fileText" size={16} className="text-coral" /> Quick facts</h3>
                    <FactRows items={keyFacts} />
                  </div>
                ) : null}
                {safety.length ? (
                  <div className="rounded-2xl border border-[#E5E2DC] bg-[#FAF8F5] p-5 shadow-xs">
                    <h3 className="mb-3 flex items-center gap-2 font-serif text-base font-bold text-ink"><Icon name="shield" size={16} className="text-coral" /> Before you go</h3>
                    <FactRows items={safety.slice(0, 3)} />
                    {practical.length ? <a href="#plan" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-coral hover:underline">All practical info <Icon name="arrowRight" size={12} /></a> : null}
                  </div>
                ) : null}
                {hasStatus ? <p className="px-1 text-[0.6875rem] leading-relaxed text-[#888]">Badges show how sure we are: Verified (official source), Seasonal, Estimate, Unconfirmed.</p> : null}
              </aside>
            </div>
          </section>
        ) : null}

        {/* Regions & circuits */}
        {regions.length ? (
          <section id="regions" aria-labelledby="regions-h" className="scroll-mt-36">
            <SectionHead id="regions" eyebrow="Plan by region" title={`Regions of ${name}`} intro={`${name} is not one destination. Pick the region that fits your trip — the towns we cover in each are linked.`} />
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {regions.map((r, i) => {
                const inRegion = regionTowns[i];
                return (
                  <li key={i} className="flex flex-col rounded-xl border border-[#EAE7E0] bg-white p-4 shadow-xs transition-colors hover:border-coral">
                    <span className="text-[0.6875rem] font-bold text-coral">{String(i + 1).padStart(2, "0")}</span>
                    {r.title ? <h3 className="mb-1.5 mt-0.5 text-sm font-bold text-ink">{r.title}</h3> : null}
                    <p className="text-[0.8125rem] leading-relaxed text-[#666]">{r.body}</p>
                    {inRegion.length ? (
                      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[#F0EFEA] pt-3">
                        {inRegion.map((d) => (
                          <Link key={d.slug} href={pageOf(d)!} className="rounded-full bg-[#EEF4F0] px-2.5 py-1 text-[0.6875rem] font-semibold text-[#2D5A3F] hover:bg-[#2D5A3F] hover:text-white">{d.name}</Link>
                        ))}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {/* C. Destinations */}
        {destinations.length ? (
          <section id="destinations" aria-labelledby="destinations-h" className="scroll-mt-36">
            <SectionHead id="destinations" eyebrow="Towns, valleys & hill stations" title={`Destinations in ${name}`} intro="Open any destination for its full guide: what to see, where to stay and how to plan it." />
            <FilterCards
              label="Filter destinations"
              allLabel="All destinations"
              initial={8}
              gridClass="grid w-full grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
              items={destinations.map((d) => {
                const kf = d.facts?.key_facts?.items ?? [];
                const alt = kf.find((f) => /altitude|elevation/i.test(f.title ?? ""));
                const rest = kf.filter((f) => f !== alt).slice(0, 3);
                const where = near(d);
                return {
                  key: d.slug,
                  groups: d.tripTypes.map(tripTypeLabel),
                  node: (
                    <Link href={pageOf(d)!} className="group flex w-full flex-col overflow-hidden rounded-2xl border border-[#EAE7E0] bg-white shadow-xs transition-all hover:border-coral hover:shadow-card">
                      <Photo img={d.hero} sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw">
                        <span className="absolute left-2.5 top-2.5 rounded-md bg-white/95 px-2 py-0.5 text-[0.6875rem] font-bold text-ink shadow-xs">
                          {kindLabel(d.kind)}{d.tripTypes[0] ? ` · ${tripTypeLabel(d.tripTypes[0])}` : ""}
                        </span>
                        {alt ? <span className="absolute right-2.5 top-2.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[0.625rem] font-medium text-white">{alt.body}</span> : null}
                      </Photo>
                      <div className="flex flex-1 flex-col space-y-2 p-4">
                        <h3 className="flex items-center justify-between gap-2 font-serif text-lg font-bold text-ink transition-colors group-hover:text-coral">
                          <span>{d.name}</span>
                          <Icon name="arrowRight" size={14} className="shrink-0 text-[#AAA] transition-all group-hover:translate-x-1 group-hover:text-coral" />
                        </h3>
                        {where ? <p className="-mt-1 flex items-center gap-1 text-[0.6875rem] text-[#888]"><Icon name="pin" size={11} /> Near {where}</p> : null}
                        {d.summary ? <p className="line-clamp-3 text-xs leading-relaxed text-[#555]">{d.summary}</p> : null}
                        {rest.length ? <div className="mt-auto border-t border-[#F0EFEA] pt-2.5"><FactRows items={rest} size="xs" /></div> : null}
                      </div>
                    </Link>
                  ),
                };
              })}
            />
          </section>
        ) : null}

        {/* D. Places to visit */}
        {attractions.length ? (
          <section id="places" aria-labelledby="places-h" className="scroll-mt-36">
            <SectionHead id="places" eyebrow="Monuments, nature & viewpoints" title={`Places to visit in ${name}`} intro="Each place shows the visiting details we could confirm — fees, hours, seasons and permits — and links to its own guide." />
            <FilterCards
              label="Filter places"
              allLabel="All places"
              initial={6}
              gridClass="grid w-full grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3"
              items={attractions.map((a) => {
                const vi = sure(a.facts?.visit_info?.items ?? a.facts?.key_facts?.items ?? []);
                const permit = vi.find(isPermit);
                const rows = vi.filter((x) => x !== permit).slice(0, 4);
                const href = pageOf(a)!;
                const where = near(a);
                return {
                  key: a.slug,
                  groups: [kindLabel(a.kind)],
                  node: (
                    <article className="group flex w-full flex-col overflow-hidden rounded-2xl border border-[#E5E2DC] bg-white shadow-xs transition-all hover:border-coral hover:shadow-card">
                      <Link href={href} tabIndex={-1} aria-hidden>
                        <Photo img={a.hero} aspect="aspect-[16/10]" sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw" fallback="compass">
                          <span className="absolute left-2.5 top-2.5 rounded-md bg-white/95 px-2 py-0.5 text-[0.6875rem] font-bold text-ink shadow-xs">{kindLabel(a.kind)}</span>
                        </Photo>
                      </Link>
                      <div className="flex flex-1 flex-col space-y-3 p-4">
                        <div>
                          <h3 className="font-serif text-base font-bold text-ink"><Link href={href} className="hover:text-coral">{a.name}</Link></h3>
                          {where ? <p className="mt-0.5 flex items-center gap-1 text-xs text-[#777]"><Icon name="pin" size={11} /> {where}</p> : null}
                        </div>
                        {a.summary ? <p className="line-clamp-3 text-xs leading-relaxed text-[#555]">{a.summary}</p> : null}
                        {rows.length ? <div className="rounded-lg border border-[#EFECE6] bg-[#FAF8F5] p-2.5"><FactRows items={rows} size="xs" /></div> : null}
                        {permit ? (
                          <p className="flex gap-1.5 rounded-md border border-amber-200 bg-amber-50 p-2 text-[0.6875rem] font-medium text-amber-900">
                            <Icon name="shield" size={13} className="mt-px shrink-0" />
                            <span><strong>{permit.title}:</strong> {permit.body}</span>
                          </p>
                        ) : null}
                      </div>
                      <Link href={href} className="border-t border-[#EAE7E0] bg-[#FAF8F5] p-3 text-center text-xs font-bold text-coral transition-colors hover:bg-coral hover:text-white">
                        {href.includes("#") && where ? `Read more in the ${where} guide` : `Open ${a.name} guide`} →
                      </Link>
                    </article>
                  ),
                };
              })}
            />
          </section>
        ) : null}

        {/* E. Things to do */}
        {activities.length ? (
          <section id="things" aria-labelledby="things-h" className="scroll-mt-36">
            <SectionHead id="things" eyebrow="Adventure, culture & food" title={`Things to do in ${name}`} intro="Experiences, not sights: where each one happens, its season and what to check before you book." more={{ href: `/things-to-do?state=${stateSlug}`, label: "All things to do" }} />
            <FilterCards
              label="Filter experiences"
              allLabel="All experiences"
              initial={8}
              gridClass="grid w-full grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
              items={activities.map((a) => {
                const vi = sure(a.facts?.visit_info?.items ?? []).slice(0, 3);
                const cat = categoryLabel(a.category);
                const where = near(a);
                return {
                  key: a.slug,
                  groups: cat ? [cat] : [],
                  node: (
                    <Link href={pageOf(a)!} className="group flex w-full flex-col overflow-hidden rounded-2xl border border-[#E5E2DC] bg-white shadow-xs transition-all hover:border-coral hover:shadow-card">
                      <Photo img={a.hero} sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" fallback="route">
                        {cat ? <span className="absolute left-2.5 top-2.5 rounded-md bg-black/60 px-2 py-0.5 text-[0.6875rem] font-bold text-white">{cat}</span> : null}
                      </Photo>
                      <div className="flex flex-1 flex-col space-y-2 p-4">
                        <h3 className="font-serif text-[0.9375rem] font-bold text-ink group-hover:text-coral">{a.name}</h3>
                        {where ? <p className="-mt-1 flex items-center gap-1 text-[0.6875rem] text-[#888]"><Icon name="pin" size={11} /> {where}</p> : null}
                        {a.summary ? <p className="line-clamp-3 text-xs leading-relaxed text-[#555]">{a.summary}</p> : null}
                        {vi.length ? <div className="mt-auto border-t border-[#F0EFEA] pt-2"><FactRows items={vi} size="xs" /></div> : null}
                      </div>
                    </Link>
                  ),
                };
              })}
            />
          </section>
        ) : null}

        {/* F. Best time */}
        {bestTime ? (
          <section id="best-time" aria-labelledby="best-time-h" className="scroll-mt-36 rounded-3xl border border-[#E5E2DC] bg-white p-6 shadow-xs sm:p-8">
            <SectionHead id="best-time" eyebrow="Seasons & road access" title={`Best time to visit ${name}`} />
            {seasonSplit ? (
              <ul className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {seasonCards.map((c, i) => {
                  const tone = seasonTone(c!.label);
                  return (
                    <li key={i} className={`rounded-xl border p-4 ${tone.card}`}>
                      {c!.when ? <p className={`text-xs font-bold ${tone.tag}`}>{c!.when}</p> : null}
                      <h3 className="mt-0.5 text-sm font-bold text-ink">{c!.label}</h3>
                      <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[#555]">{c!.text}</p>
                    </li>
                  );
                })}
              </ul>
            ) : null}
            <div className={`grid gap-8 ${seasonal.length && !seasonSplit ? "lg:grid-cols-12" : ""}`}>
              {!seasonSplit || bestTime.body.items?.length ? (
                <div className={`space-y-3 text-[0.9375rem] leading-relaxed text-[#444] ${seasonal.length && !seasonSplit ? "lg:col-span-7" : ""}`}>
                  {seasonSplit ? null : seasonParas.map((p, i) => <p key={i}>{p}</p>)}
                  {bestTime.body.items?.length ? <FactRows items={bestTime.body.items} /> : null}
                </div>
              ) : null}
              {seasonal.length ? (
                <div className={seasonSplit ? "" : "lg:col-span-5"}>
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#888]">Seasonal access to places</p>
                  <ul className={seasonSplit ? "grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3" : "space-y-2.5"}>
                    {seasonal.map(({ p, it }) => (
                      <li key={p.slug} className="rounded-xl border border-[#EAE7E0] bg-[#FAF8F5] p-3 text-[0.8125rem] leading-snug text-[#555]">
                        <Link href={pageOf(p)!} className="font-semibold text-ink hover:text-coral">{p.name}</Link>
                        <span className="text-[#888]"> · {it.title}</span>
                        {it.status ? <StatusPill status={it.status} className="ml-1.5 align-middle" /> : null}
                        <p className="mt-1">{it.body}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* How to reach */}
        {reach ? (
          <section id="reach" aria-labelledby="reach-h" className="scroll-mt-36 rounded-3xl border border-[#E5E2DC] bg-white p-6 shadow-xs sm:p-8">
            <SectionHead id="reach" eyebrow="Getting there" title={`How to reach ${name}`} />
            {reachSplit ? (
              <div className={`grid grid-cols-1 gap-6 md:grid-cols-2 ${reachCols.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
                {reachCols.map((c, i) => (
                  <div key={i} className="space-y-2">
                    <p className="flex items-center gap-2 text-sm font-bold text-ink"><Icon name={reachIcon(c!.label)} size={16} className="text-coral" /> {c!.label}</p>
                    <p className="border-l-2 border-coral/40 pl-3 text-[0.8125rem] leading-relaxed text-[#555]">{c!.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3 text-[0.9375rem] leading-relaxed text-[#444]">{reachParas.map((p, i) => <p key={i}>{p}</p>)}</div>
            )}
            {reach.body.items?.length ? <div className="mt-5"><FactRows items={reach.body.items} /></div> : null}
          </section>
        ) : null}

        {/* G. Itineraries */}
        {itineraries.length ? (
          <section id="itineraries" aria-labelledby="itineraries-h" className="scroll-mt-36">
            <SectionHead id="itineraries" eyebrow="Ready-made plans" title={`Itineraries for ${name}`} intro="Day-by-day plans with realistic travel times. Open one for the full route, stays and costs." more={{ href: routes.itineraries, label: "All itineraries" }} />
            <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {itineraries.map((it) => (
                <li key={it.slug} className="flex">
                  <Link href={`/itineraries/${it.slug}`} className="group flex w-full flex-col overflow-hidden rounded-2xl border border-[#E5E2DC] bg-white shadow-xs transition-all hover:border-coral hover:shadow-card">
                    <Photo img={it.hero} aspect="aspect-[16/9]" sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" fallback="route">
                      <span className="absolute left-2.5 top-2.5 rounded-md bg-coral px-2 py-0.5 text-[0.6875rem] font-bold text-white">{it.durationDays} {it.durationDays === 1 ? "day" : "days"}</span>
                    </Photo>
                    <div className="flex flex-1 flex-col space-y-2 p-4">
                      <h3 className="font-serif text-base font-bold text-ink group-hover:text-coral">{it.title}</h3>
                      <p className="line-clamp-2 text-xs leading-relaxed text-[#555]">{it.summary}</p>
                      {it.stopNames.length ? (
                        <p className="mt-auto flex flex-wrap items-center gap-1 pt-2 text-[0.6875rem] text-[#777]">
                          <Icon name="route" size={12} className="text-[#2D5A3F]" /> {it.stopNames.join(" → ")}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* H. Travel guides */}
        {guides.length ? (
          <section id="guides" aria-labelledby="guides-h" className="scroll-mt-36">
            <SectionHead id="guides" eyebrow="Answers before you go" title={`${name} travel guides`} more={{ href: routes.travelGuides, label: "All travel guides" }} />
            <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {guides.map((g) => (
                <li key={g.slug} className="flex">
                  <Link href={`/travel-guides/${g.slug}`} className="group flex w-full flex-col overflow-hidden rounded-2xl border border-[#E5E2DC] bg-white shadow-xs transition-colors hover:border-coral">
                    <Photo img={g.hero} aspect="aspect-[16/10]" sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" fallback="book" />
                    <div className="flex flex-1 flex-col space-y-2 p-4">
                      <h3 className="line-clamp-2 font-serif text-sm font-bold text-ink group-hover:text-coral">{g.title}</h3>
                      <p className="line-clamp-2 text-xs leading-relaxed text-[#555]">{g.summary}</p>
                      <span className="mt-auto inline-flex items-center gap-1 pt-1 text-xs font-bold text-coral">Read guide <Icon name="arrowRight" size={12} /></span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* I. Practical planning */}
        {practical.length ? (
          <section id="plan" aria-labelledby="plan-h" className="scroll-mt-36 rounded-3xl border border-[#E5E2DC] bg-white p-6 shadow-xs sm:p-8">
            <SectionHead id="plan" eyebrow="On the ground" title={`Practical info for ${name}`} />
            <div className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
              {practical.map((p) => (
                <div key={p.key} className="space-y-2.5">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-ink"><Icon name={p.icon} size={16} className="text-coral" /> {p.title}</h3>
                  {p.s!.body.text ? <div className="space-y-2 text-[0.8125rem] leading-relaxed text-[#555]">{paragraphs(p.s!.body.text).map((t, i) => <p key={i}>{t}</p>)}</div> : null}
                  {p.s!.body.items?.length ? <FactRows items={p.s!.body.items} /> : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* J. Map & FAQs */}
        {faqs || points.length > 1 ? (
          <section id="faqs" aria-labelledby="faqs-h" className="scroll-mt-36">
            <div className={`grid grid-cols-1 items-start gap-8 ${faqs && points.length > 1 ? "lg:grid-cols-12" : ""}`}>
              {points.length > 1 ? (
                <div className={`space-y-3 rounded-2xl border border-[#E5E2DC] bg-white p-5 shadow-xs ${faqs ? "lg:col-span-5" : ""}`}>
                  <h3 className="flex items-center gap-2 font-serif text-lg font-bold text-ink"><Icon name="map" size={18} className="text-coral" /> Map of {name}</h3>
                  <p className="text-xs text-[#666]">Destinations and places from this guide. Tap a pin to open it.</p>
                  <PlaceMap points={points} height={340} label={`Map of ${name} and places inside it`} />
                </div>
              ) : null}
              {faqs ? (
                <div className={`space-y-4 ${points.length > 1 ? "lg:col-span-7" : ""}`}>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-coral">Questions travellers ask</p>
                    <h2 id="faqs-h" className="mt-0.5 font-serif text-2xl font-bold text-ink">{name} FAQs</h2>
                  </div>
                  <FaqList s={faqs} />
                </div>
              ) : <h2 id="faqs-h" className="sr-only">Map</h2>}
            </div>
          </section>
        ) : null}

        {/* Sources */}
        {sources.length ? (
          <details className="rounded-2xl border border-[#E5E2DC] bg-white px-5 py-4 text-sm">
            <summary className="cursor-pointer font-semibold text-ink">Sources for this guide ({sources.length})</summary>
            <ul className="mt-3 grid gap-1.5 text-xs text-[#666] sm:grid-cols-2">
              {sources.map((s) => (
                <li key={s.url} className="truncate">
                  <a href={s.url} {...ext} className="hover:text-coral hover:underline">{s.title || s.site}</a> <span className="text-[#999]">· {s.site}</span>
                </li>
              ))}
            </ul>
          </details>
        ) : null}

        {/* K. Keep exploring */}
        <section className="rounded-3xl bg-gradient-to-r from-[#1C3326] to-[#2B4E3A] p-8 text-white shadow-md sm:p-10">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
            <div className="space-y-4 lg:col-span-7">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-emerald-200"><Icon name="sparkles" size={13} /> Plan with AI</span>
              <h2 className="font-serif text-2xl font-bold text-white sm:text-3xl">Ready to plan your trip to {name}?</h2>
              <p className="text-sm leading-relaxed text-white/80">Tell the planner your dates, days, budget and interests. It starts from this guide and shows its sources for anything it looks up.</p>
              <PlanAiButton prompt={planPrompt} className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-coral px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-coral-dark">
                <Icon name="sparkles" size={15} /> Plan {name} with AI
              </PlanAiButton>
            </div>
            <ul className="grid grid-cols-2 gap-2.5 text-sm lg:col-span-5">
              {[
                ...(activities.length ? [{ href: `/things-to-do?state=${stateSlug}`, label: `Things to do in ${name}`, icon: "compass" as Name }] : []),
                ...(itineraries.length ? [{ href: routes.itineraries, label: "Itineraries", icon: "route" as Name }] : []),
                ...(guides.length ? [{ href: routes.travelGuides, label: "Travel guides", icon: "book" as Name }] : []),
                ...nearbyStates.slice(0, 3).map((r) => ({ href: `/india/${r.slug}`, label: r.name, icon: "map" as Name })),
                { href: "/india", label: "Explore other states", icon: "map" as Name },
              ].map((l) => (
                <li key={l.href + l.label}>
                  <Link href={l.href} className="flex h-full items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3.5 py-3 font-semibold text-white transition-all hover:bg-white/20">
                    <Icon name={l.icon} size={15} className="shrink-0 text-emerald-200" /> <span className="min-w-0">{l.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      {/* Places that live inside this page open as pop-ups from #links. */}
      {inline.length ? (
        <HashDialogs
          items={inline.map((c) => ({
            slug: c.slug,
            title: c.snapshot.place.name,
            body: <div className="space-y-3 p-5">{c.snapshot.sections.map((s) => <SectionBodyView key={s.key} s={s} />)}</div>,
          }))}
        />
      ) : null}

      <PageAssistant pack={buildPack({ snapshot, stateSlug, rollup, inline, related })} />
    </div>
  );
}
