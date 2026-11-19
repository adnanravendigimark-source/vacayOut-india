import type { ReactNode } from "react";
import Image from "@/components/media/image";
import Link from "next/link";
import { Icon, type Name } from "@/components/icons/icon";
import type { PublishedSnapshot, SnapshotImage } from "@/lib/db/schema";
import { affiliateActive, bookingLinksFor } from "@/lib/booking/links";
import { kindLabel } from "@/lib/places/kinds";
import { categoryLabel } from "@/lib/places/categories";
import { TRIP_TYPES, tripTypeLabel } from "@/lib/places/trip-types";
import type { PlaceRollup, RollupItinerary, RollupPlace } from "@/lib/places/rollup";
import { mapPoints } from "@/lib/map";
import { PlaceMap } from "@/components/map/place-map";
import { PageAssistant } from "@/components/assistant/page-assistant";
import { buildPack } from "@/lib/assistant/pack";
import { FilterCards, PlanAiButton, RegionAccordion, SeasonPanels, SectionNav, TripCards, type RegionGeo, type RegionItem, type SeasonPanel } from "./state-guide-client";
import { INDIA_MAP_PATHS } from "@/components/home/india-map-data";
import { shapeStates } from "@/components/home/regions";
import { pathBBox, projectIndia } from "@/lib/india-svg-geo";
import { HashOpener } from "./destination-template-client";
import { Head, PhotoCredit, dayRange, paragraphs, seasonRanges, short } from "./destination-template";
import "./destination-template.css";
import "./state-guide.css";

/**
 * One template for every state and union territory, decision-first:
 * hero + at a glance → choose your trip → regions (with their destinations) → best time
 * → getting there → top experiences and places → culture → practical → map, FAQs, sources.
 * Everything comes from the published snapshot and rollup; a section with no data is not rendered.
 * Design: DESIGN.md (same visual language as the destination template).
 */

type Section = PublishedSnapshot["sections"][number];
type Item = NonNullable<Section["body"]["items"]>[number];
type Inline = { slug: string; snapshot: PublishedSnapshot };
type Related = { name: string; slug: string; kind: string; summary: string | null; type: "nearby" | "day_trip"; stateSlug: string | null; lat?: number | null; lng?: number | null; hero?: SnapshotImage | null };


/** "…text. Best season: X. Suits: Y." → the description plus the two labelled values (written by the research, editable in the admin). */
function parseRegion(body: string) {
  let text = body;
  const take = (label: string) => {
    const m = text.match(new RegExp(`\\s*${label}:\\s*(.+?)\\.(?=\\s+[A-Z][a-z ]{2,20}:|\\s*$)`));
    if (!m) return null;
    text = text.replace(m[0], "");
    return m[1].trim();
  };
  const season = take("Best season");
  const suits = take("Suits");
  return { text: text.trim(), season, suits };
}

/** A price is an estimate when marked so, or when it is an unverified ₹ range ("₹600–₹1,500"); official fixed fees are not. */
const isEstimate = (b: Item) => b.status === "estimate" || (b.status !== "verified" && /₹\s?[\d,]+\s*[–-]\s*₹?\s?[\d,]+/.test(b.body));

const km = (a: { lat: number | null; lng: number | null }, b: { lat: number | null; lng: number | null }) =>
  a.lat == null || a.lng == null || b.lat == null || b.lng == null ? Infinity : Math.hypot((a.lat - b.lat) * 111, (a.lng - b.lng) * 111 * Math.cos((a.lat * Math.PI) / 180));

function Labelled({ text }: { text: string }) {
  const m = text.match(/^([^:]{3,70}):\s+([\s\S]+)$/);
  return m ? <p className="text-sm leading-relaxed text-[#555555]"><span className="font-semibold text-ink">{m[1]}: </span>{m[2]}</p> : <p className="text-sm leading-relaxed text-[#555555]">{text}</p>;
}

function Pairs({ items }: { items: Item[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((it, i) => (
        <li key={i} className="text-sm leading-relaxed text-[#555555]">
          {it.title ? <span className="font-semibold text-ink">{it.title}: </span> : null}{it.body}
          {it.status === "estimate" ? <span className="ml-1.5 rounded-full bg-sand px-2 py-0.5 text-[0.6875rem] font-semibold text-ink">estimate</span> : null}
        </li>
      ))}
    </ul>
  );
}

export function StateTemplate({
  snapshot,
  stateSlug,
  rollup,
  inline = [],
  related = [],
}: {
  snapshot: PublishedSnapshot;
  stateSlug: string;
  rollup: PlaceRollup;
  inline?: Inline[];
  related?: Related[];
}) {
  const { place, sections } = snapshot;
  const name = place.name;
  const sec = (key: string) => sections.find((s) => s.key === key && ((s.body.items ?? []).length || s.body.text?.trim()));
  const items = (key: string): Item[] => sec(key)?.body.items ?? [];
  const keyFacts = items("key_facts");
  const factBy = (re: RegExp) => keyFacts.find((f) => re.test(f.title ?? ""));
  const faqItems = items("faqs").filter((f) => f.title?.trim() && f.body?.trim());
  const bestTime = sec("best_time");
  const reach = sec("how_to_reach");
  const around = sec("local_transport");
  const budget = sec("budget");
  const regions = items("regions");

  const pageOf = (p: RollupPlace) =>
    p.displayMode === "parent_section" && p.parentSlug
      ? p.parentKind === "state" ? `#${p.slug}` : `/india/${stateSlug}/${p.parentSlug}#${p.slug}`
      : `/india/${stateSlug}/${p.slug}`;

  const destinations = rollup.destinations;
  const itineraries = [...rollup.itineraries].sort((a, b) => a.durationDays - b.durationDays);

  // ---- Regions: each destination belongs to one region (named in its title, then its text, then the nearest placed town).
  const regionTowns: RollupPlace[][] = regions.map(() => []);
  const used = new Set<string>();
  const core = (n: string) => n.toLowerCase().replace(/\s+(valley|town)$/g, "").trim();
  const names = (r: Item, field: "title" | "body") => (field === "title" ? r.title ?? "" : r.body).toLowerCase();
  for (const field of ["title", "body"] as const)
    regions.forEach((r, i) => {
      const t = names(r, field);
      for (const d of destinations) {
        if (used.has(d.slug)) continue;
        const c = core(d.name);
        if (field === "body" && new RegExp(`\\bvia\\s+${c}\\b`).test(t) && !t.replace(new RegExp(`\\bvia\\s+${c}\\b`, "g"), "").includes(c)) continue;
        if (t.includes(d.name.toLowerCase()) || (c.length > 3 && new RegExp(`\\b${c}\\b`).test(t))) { regionTowns[i].push(d); used.add(d.slug); }
      }
    });
  for (const d of destinations) {
    if (used.has(d.slug) || !regions.length) continue;
    const best = regionTowns.flatMap((ts, i) => ts.map((t) => ({ i, dist: km(d, t) }))).sort((a, b) => a.dist - b.dist)[0];
    if (best && best.dist <= 60) { regionTowns[best.i].push(d); used.add(d.slug); }
  }
  const unplaced = destinations.filter((d) => !used.has(d.slug));

  const bySlug = new Map([...destinations, ...rollup.attractions, ...rollup.activities].map((p) => [p.slug, p]));
  const topOf = (slug: string) => {
    let p = bySlug.get(slug);
    for (let i = 0; p && i < 5; i++) {
      if (used.has(p.slug) || unplaced.includes(p)) return p.slug;
      p = p.parentSlug ? bySlug.get(p.parentSlug) : undefined;
    }
    return null;
  };
  const tripsIn = (towns: RollupPlace[]) => {
    const set = new Set(towns.map((t) => t.slug));
    return itineraries.filter((it) => {
      const tops = it.stopSlugs.map(topOf).filter(Boolean) as string[];
      return tops.length > 0 && tops.filter((s) => set.has(s)).length / tops.length >= 0.6;
    });
  };
  const range = (trips: RollupItinerary[]) => {
    if (!trips.length) return null;
    const ds = trips.map((t) => t.durationDays);
    const lo = Math.min(...ds), hi = Math.max(...ds);
    return lo === hi ? `${lo} days` : `${lo}–${hi} days`;
  };
  const regionData = regions.map((r, i) => ({ r, ...parseRegion(r.body), towns: regionTowns[i], trips: tripsIn(regionTowns[i]) }));
  const townName = (slug: string) => bySlug.get(slug)?.name ?? null;

  // ---- At a glance (sourced values only).
  const glance: { icon: Name; label: string; value: string; full: string; note?: string }[] = [];
  const bt = factBy(/best time/i);
  const season = bt ? short(bt.body) : seasonRanges(bestTime?.body.text ?? "");
  if (season) glance.push({ icon: "calendar", label: "Best time", value: season, full: bt?.body ?? season });
  const tl = factBy(/trip length|days needed/i);
  const daysFaq = faqItems.find((f) => /how many days|how long should/i.test(f.title ?? ""));
  // A real number only: a fact or FAQ that names days, else the span of the published plans.
  const days = (tl && dayRange(tl.body)) || (daysFaq && dayRange(daysFaq.body));
  if (days) glance.push({ icon: "clock", label: "Trip length", value: days, full: tl?.body ?? daysFaq?.body ?? days });
  else if (range(itineraries)) glance.push({ icon: "clock", label: "Trip length", value: range(itineraries)!, full: `Our ready-made plans for ${name} run ${range(itineraries)}.${tl ? ` ${tl.body}` : ""}`, note: "our plans" });
  const perDay = (budget?.body.items ?? []).find((b) => /₹/.test(b.body) && /per (person )?(per )?day|a day|daily/i.test(`${b.title ?? ""} ${b.body}`));
  if (perDay) glance.push({ icon: "coins", label: perDay.title ? short(perDay.title, 26) : "Budget a day", value: short(perDay.body, 30), full: `${perDay.title ?? ""}: ${perDay.body}`, note: isEstimate(perDay) ? "estimate" : undefined });
  const entry = factBy(/getting in|gateway|airport|entry/i);
  if (entry) glance.push({ icon: "plane", label: "Getting in", value: short(entry.body), full: entry.body });
  const permitItem = factBy(/permit/i) ?? [...items("practical_info"), ...items("safety_health")].find((x) => /permit/i.test(x.title ?? ""));
  if (permitItem) glance.push({ icon: "shield", label: "Permits", value: short(permitItem.body), full: permitItem.body });

  // ---- Experiences and places (each with one card; inline places keep their #slug anchor and full text).
  const activities = rollup.activities.filter((a) => a.displayMode === "page").sort((a, b) => Number(!!b.hero) - Number(!!a.hero));
  const attractions = rollup.attractions.filter((a) => a.displayMode === "page").sort((a, b) => Number(!!b.hero) - Number(!!a.hero));

  const booking = bookingLinksFor({ name, kind: place.kind, stateName: null });
  const sources = [...new Map(sections.flatMap((s) => s.sources ?? []).filter((s) => /^https?:\/\//.test(s.url)).map((s) => [s.url, s])).values()];
  const nearbyStates = related.filter((r) => r.kind === "state");
  const practical: { title: string; s: Section }[] = (
    [
      ["Money and connectivity", sec("practical_info")],
      ["Safety and health", sec("safety_health")],
      ["Travel tips", sec("travel_tips")],
      ["Mistakes to avoid", sec("common_mistakes")],
      ["Accessibility", sec("accessibility")],
    ] as const
  ).flatMap(([title, s]) => (s ? [{ title, s }] : []));
  const culture: { title: string; icon: Name; items: Item[] }[] = (
    [
      ["What to eat", "utensils", items("food")],
      ["Highlights", "star", items("highlights")],
      ["Local customs", "heart", items("culture_etiquette")],
    ] as const
  ).filter(([, , it]) => it.length > 0).map(([title, icon, it]) => ({ title, icon, items: it }));

  const points = mapPoints([
    { name, lat: place.lat, lng: place.lng, primary: true },
    ...destinations.map((d) => ({ name: d.name, lat: d.lat, lng: d.lng, href: pageOf(d) })),
    ...attractions.map((a) => ({ name: a.name, lat: a.lat, lng: a.lng, href: pageOf(a) })),
  ]);
  const planPrompt = `Plan a trip to ${name}`;
  const hero = place.hero;
  const [titleHead, titleTail] = (() => { const w = name.split(" "); const tail = w.pop() ?? name; return [w.join(" "), tail]; })();
  const typeLabel = (k: string) => TRIP_TYPES.find((t) => t.key === k)?.label ?? null;

  // ---- Old-design visuals fed by the same data.
  // Region map: this state's outline, neighbours faintly, every destination as a dot.
  const regionGeo: RegionGeo | null = (() => {
    const shape = INDIA_MAP_PATHS.find((sp) => shapeStates(sp.id, sp.name).some((x) => x.slug === stateSlug));
    if (!shape) return null;
    const [x0, y0, x1, y1] = pathBBox(shape.path);
    if (![x0, y0, x1, y1].every(Number.isFinite)) return null;
    const pad = Math.max(x1 - x0, y1 - y0) * 0.1;
    const view: [number, number, number, number] = [x0 - pad, y0 - pad, x1 - x0 + pad * 2, y1 - y0 + pad * 2];
    const context = INDIA_MAP_PATHS.filter((sp) => sp !== shape).filter((sp) => {
      const [a, b, c, d] = pathBBox(sp.path);
      return c >= view[0] && a <= view[0] + view[2] && d >= view[1] && b <= view[1] + view[3];
    }).map((sp) => sp.path);
    const all = destinations.filter((d) => d.lat != null && d.lng != null).map((d) => ({ name: d.name, ...projectIndia(d.lat!, d.lng!) }));
    return { view, state: shape.path, context, all };
  })();
  const townOf = (d: RollupPlace) => ({ name: d.name, href: pageOf(d), dot: d.lat != null && d.lng != null ? { name: d.name, ...projectIndia(d.lat, d.lng) } : null, lat: d.lat, lng: d.lng });
  const photoOf = (towns: RollupPlace[]) => {
    const h = towns.find((t) => t.hero)?.hero;
    return h ? { url: h.url, alt: h.alt, ai: h.kind === "ai_generated" } : null;
  };
  const regionItems: RegionItem[] = [
    ...regionData.map((r) => ({
      title: r.r.title ?? "",
      body: r.text,
      image: photoOf(r.towns),
      towns: r.towns.map(townOf),
      facts: [
        ...(r.season ? [{ icon: "calendar" as Name, label: "Best season", value: r.season }] : []),
        ...(r.trips.length ? [{ icon: "clock" as Name, label: "Days in our plans", value: range(r.trips)! }] : []),
        ...(r.suits ? [{ icon: "user" as Name, label: "Suits", value: r.suits.replace(/^./, (c) => c.toUpperCase()) }] : []),
      ],
      plans: r.trips.map((t) => ({ title: t.title, href: `/itineraries/${t.slug}` })),
    })),
    ...(regions.length && unplaced.length ? [{ title: "More places", body: "", image: photoOf(unplaced), towns: unplaced.map(townOf) }] : []),
  ];

  // Trips as photo cards with their route line.
  // Lead with variety: the shortest plan of each length group first, then the rest by length.
  const lengthGroup = (d: number) => (d <= 4 ? 0 : d <= 7 ? 1 : d <= 10 ? 2 : 3);
  const leads = [0, 1, 2, 3].map((g) => itineraries.find((t) => lengthGroup(t.durationDays) === g)).filter(Boolean) as RollupItinerary[];
  const ordered = [...leads, ...itineraries.filter((t) => !leads.includes(t))];
  // Each card gets its own photo: the plan's own image, else a stop's photo not used on another card.
  const usedTripImg = new Set<string>();
  const tripCards = ordered.map((t) => {
    const stops = [...new Set(t.stopSlugs.map(topOf).filter(Boolean) as string[])].map((sl) => townName(sl)).filter(Boolean) as string[];
    const candidates = [t.hero, ...t.stopSlugs.map((sl) => bySlug.get(sl)?.hero)].filter((h): h is SnapshotImage => !!h);
    const img = candidates.find((h) => !usedTripImg.has(h.url)) ?? null;
    if (img) usedTripImg.add(img.url);
    return { slug: t.slug, title: t.title, summary: t.summary, days: t.durationDays, type: t.tripTypes.map(typeLabel).find(Boolean) ?? null, stops: stops.slice(0, 5), image: img ? { url: img.url, alt: img.alt, ai: img.kind === "ai_generated" } : null };
  });

  // Best time: "Label (months): text" paragraphs that name months become photo panels; the photo is a place the text itself names.
  const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const monthsOf = (t: string) => {
    const found = [...t.toLowerCase().matchAll(/jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/g)].map((m) => MONTHS.indexOf(m[0]));
    if (!found.length) return [];
    const [a, b] = [found[0], found[found.length - 1]];
    const out: number[] = [];
    for (let m = a; ; m = (m + 1) % 12) { out.push(m); if (m === b || out.length > 12) break; }
    return out;
  };
  const seasonParas = paragraphs(bestTime?.body.text).map((p) => {
    const m = /^([^:\n]{3,60}):\s+([\s\S]+)$/.exec(p);
    if (!m) return { label: null as string | null, when: null as string | null, text: p };
    const head = m[1].trim();
    const w = /\(([^)]+)\)\s*$/.exec(head);
    return { label: w ? head.slice(0, w.index).trim() : head, when: w ? w[1] : null, text: m[2].trim().replace(/^./, (c) => c.toUpperCase()) };
  });
  const photoPool = [...destinations, ...rollup.attractions, ...rollup.activities].filter((x) => x.hero && x.name.length >= 4);
  const usedPhotos = new Set<string>();
  const seasonPanels: SeasonPanel[] = seasonParas.filter((x) => x.label && x.when && monthsOf(x.when).length).map((x) => {
    const t = x.text.toLowerCase();
    const hit = photoPool.filter((pl) => !usedPhotos.has(pl.hero!.url) && t.includes(pl.name.toLowerCase())).sort((a, b) => t.indexOf(a.name.toLowerCase()) - t.indexOf(b.name.toLowerCase()))[0];
    if (hit) usedPhotos.add(hit.hero!.url);
    return { label: x.label!, when: x.when, text: x.text, months: monthsOf(x.when!), image: hit ? { url: hit.hero!.url, alt: hit.hero!.alt, ai: hit.hero!.kind === "ai_generated" } : null };
  });
  const seasonNotes = seasonPanels.length > 1 ? seasonParas.filter((x) => !(x.label && x.when && monthsOf(x.when).length)) : seasonParas;

  const nav = [
    { id: "glance", label: "At a glance", on: glance.length > 0 },
    { id: "trips", label: "Trip plans", on: itineraries.length > 0 },
    { id: "destinations", label: "Destinations", on: destinations.length > 0 },
    { id: "regions", label: "Regions", on: regions.length > 0 },
    { id: "best-time", label: "Best time", on: !!bestTime },
    { id: "reach", label: "Getting there", on: !!(reach || around) },
    { id: "experiences", label: "Experiences", on: activities.length + attractions.length + inline.length > 0 },
    { id: "culture", label: "Food and culture", on: culture.length > 0 },
    { id: "practical", label: "Practical", on: !!budget || practical.length > 0 },
    { id: "faqs", label: "FAQs", on: faqItems.length > 0 },
  ].filter((n) => n.on);

  const jsonLd: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "TouristDestination",
      name,
      description: place.seoDescription,
      ...(hero && hero.kind === "photo" ? { image: hero.url } : {}),
      ...(place.lat != null && place.lng != null ? { geo: { "@type": "GeoCoordinates", latitude: place.lat, longitude: place.lng } } : {}),
      ...(destinations.length ? { containsPlace: destinations.slice(0, 30).map((d) => ({ "@type": "TouristDestination", name: d.name })) } : {}),
    },
  ];
  if (faqItems.length) jsonLd.push({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqItems.map((f) => ({ "@type": "Question", name: f.title, acceptedAnswer: { "@type": "Answer", text: f.body } })) });

  const smallCard = (p: RollupPlace, meta: string) => (
    <li key={p.slug}>
      <Link href={pageOf(p)} className="group flex items-center gap-3 rounded-2xl border border-line bg-white p-2.5 pr-4 transition-colors hover:border-coral focus-visible:outline-2 focus-visible:outline-coral">
        <span className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-sand">{p.hero ? <Image src={p.hero.url} alt="" fill sizes="64px" className="object-cover" /> : null}</span>
        <span className="min-w-0">
          <span className="block text-xs text-muted-strong">{meta}</span>
          <span className="block truncate font-semibold text-ink group-hover:text-coral">{p.name}</span>
          {p.parentName && p.parentName !== name ? <span className="block truncate text-xs text-muted-strong">Near {p.parentName}</span> : null}
        </span>
      </Link>
    </li>
  );
  const wrap = (id: string, children: ReactNode) => <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-40">{children}</section>;

  return (
    <div className="min-h-screen bg-white font-sans text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <HashOpener />

      {/* 1. Hero: full-width photo, white haze for the title, glass "at a glance" bar. */}
      <section className="sg-hero relative isolate overflow-hidden bg-[#EEF1F3]" aria-labelledby="dt-title">
        {hero ? <Image src={hero.url} alt={hero.alt} fill priority sizes="100vw" className="sg-hero__img -z-20 object-cover object-[65%_center]" /> : null}
        <div aria-hidden className="sg-hero__veil absolute inset-0 -z-10" />
        <div className="container-site relative flex min-h-[620px] flex-col pb-6 pt-6 sm:min-h-[640px] lg:min-h-[680px]">
          <nav aria-label="Breadcrumb" className="sg-in flex flex-wrap items-center gap-2 text-xs text-[#555555]">
            <Link href="/" className="transition-colors hover:text-ink">Home</Link><span aria-hidden className="text-[#BBBBBB]">/</span>
            <Link href="/india" className="transition-colors hover:text-ink">Explore India</Link><span aria-hidden className="text-[#BBBBBB]">/</span>
            <span className="font-medium text-ink" aria-current="page">{name}</span>
          </nav>
          <div className="mt-8 max-w-xl sm:mt-12 lg:mt-14">
            <p className="sg-in inline-flex items-center gap-2 rounded-full bg-white/80 py-1.5 pl-1.5 pr-3.5 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink shadow-sm backdrop-blur" style={{ ["--d" as string]: "40ms" }}>
              <span className="flex size-6 items-center justify-center rounded-full bg-coral/10 text-coral"><Icon name="pin" size={13} /></span>State guide
            </p>
            <h1 id="dt-title" className={`sg-in mt-5 font-serif font-normal leading-[0.98] tracking-[-0.03em] text-ink ${name.length > 22 ? "text-[clamp(2.1rem,3.6vw,3rem)]" : "text-[clamp(2.9rem,7vw,5.5rem)]"}`} style={{ ["--d" as string]: "90ms" }}>
              {titleHead ? <><span className="block">{titleHead}</span>{" "}</> : null}
              <span className="block text-coral">{titleTail}</span>
            </h1>
            {place.summary ? <p className="sg-in mt-5 max-w-md text-[1.0625rem] leading-relaxed text-[#3F3F3F]" style={{ ["--d" as string]: "140ms" }}>{place.summary}</p> : null}
            <div className="sg-in mt-7 flex flex-wrap items-center gap-x-5 gap-y-3" style={{ ["--d" as string]: "190ms" }}>
              {regionItems.length ? (
                <a href="#regions" className="inline-flex items-center gap-2 rounded-full bg-coral px-6 py-3.5 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(236,98,66,0.6)] transition-transform hover:-translate-y-0.5">
                  Choose where to go <Icon name="arrowRight" size={15} />
                </a>
              ) : null}
              <PlanAiButton prompt={planPrompt} className="group inline-flex cursor-pointer items-center gap-3 text-sm font-semibold text-ink">
                <span className="flex size-12 items-center justify-center rounded-full bg-white text-coral shadow-md transition-transform group-hover:scale-105"><Icon name="sparkles" size={18} /></span>
                Plan with AI
              </PlanAiButton>
            </div>
          </div>
          <div className="mt-auto flex items-end gap-4 pt-10">
            {glance.length ? (
              <dl id="glance" className={`sg-in grid min-w-0 flex-1 scroll-mt-40 grid-cols-2 rounded-2xl border border-white/70 bg-white/80 px-2 py-2 shadow-[0_12px_40px_-16px_rgba(30,40,60,0.35)] backdrop-blur-md ${["", "max-w-xs grid-cols-1!", "lg:max-w-xl", "lg:max-w-3xl lg:grid-cols-3", "lg:max-w-4xl lg:grid-cols-4", "lg:max-w-5xl lg:grid-cols-5"][Math.min(glance.length, 5)]}`} style={{ ["--d" as string]: "260ms" }}>
                {glance.map((g) => (
                  <div key={g.label} className="flex items-center gap-3 px-3 py-3 max-lg:last:odd:col-span-2 lg:[&:not(:last-child)]:border-r lg:[&:not(:last-child)]:border-[#E6E3DE]">
                    <Icon name={g.icon} size={22} className="shrink-0 text-ink" />
                    <div className="min-w-0">
                      <dt className="text-[0.8125rem] font-semibold text-ink">{g.label}{g.note ? <span className="ml-1.5 rounded-full bg-sand px-1.5 py-px text-[0.625rem] font-semibold text-ink">{g.note}</span> : null}</dt>
                      <dd className="line-clamp-2 text-[0.8125rem] leading-snug text-[#555555] lg:line-clamp-1" title={g.full}>{g.value}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            ) : <span className="flex-1" />}
            <a href="#trips" aria-label="Scroll to the guide" className="hidden size-12 shrink-0 items-center justify-center rounded-full bg-ink/55 text-white backdrop-blur transition-colors hover:bg-ink sm:flex"><Icon name="chevronDown" size={20} /></a>
          </div>
          {hero ? <div className="mt-3 flex justify-end"><PhotoCredit img={hero} /></div> : null}
        </div>
      </section>

      {nav.length > 1 ? (
        <div className="mt-8">
          <SectionNav items={nav.map(({ id, label }) => ({ id, label }))}>
            <PlanAiButton prompt={planPrompt} className="hidden shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-coral sm:inline-flex">
              <Icon name="sparkles" size={12} /> Plan with AI
            </PlanAiButton>
          </SectionNav>
        </div>
      ) : null}

      <main className="container-site space-y-16 py-12 sm:space-y-20 sm:py-14">
        {/* 2. Choose your trip: photo cards with the route line, filterable by length */}
        {tripCards.length ? (
          wrap("trips", <>
            <Head id="trips" eyebrow="Choose your trip" title={`How long to spend in ${name}`} intro="Ready-made plans by length. Each opens day by day." />
            <TripCards trips={tripCards} initial={3} />
          </>)
        ) : null}

        {/* 3. Destinations: one photo card each, 6 shown, then "Show all" */}
        {destinations.length ? (
          wrap("destinations", <>
            <Head id="destinations" eyebrow="Top destinations" title={`Destinations in ${name}`} intro="Open any destination for its full guide." />
            <FilterCards
              label="Filter destinations"
              allLabel="All"
              initial={6}
              gridClass="grid w-full grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3"
              items={destinations.map((d) => {
                const kf = d.facts?.key_facts?.items ?? [];
                const fact = kf.find((x) => /best time|season|when to go/i.test(x.title ?? "")) ?? kf.find((x) => /altitude|elevation/i.test(x.title ?? ""));
                return {
                  key: d.slug,
                  groups: d.tripTypes.map(tripTypeLabel),
                  node: (
                    <Link href={pageOf(d)} className="group block w-full min-w-0 focus-visible:outline-2 focus-visible:outline-coral">
                      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-sand">
                        {d.hero ? (
                          <Image src={d.hero.url} alt={d.hero.alt} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]" />
                        ) : (
                          <span className="flex size-full items-center justify-center text-muted"><Icon name="mountain" size={30} /></span>
                        )}
                        <span className="absolute left-3 top-3 rounded-md bg-white/90 px-2 py-0.5 text-[0.6875rem] font-semibold text-ink">{kindLabel(d.kind)}</span>
                      </div>
                      <h3 className="mt-3 flex items-center justify-between gap-2 font-serif text-[1.25rem] leading-tight text-ink">
                        <span>{d.name}</span>
                        <Icon name="arrowRight" size={15} className="shrink-0 text-coral opacity-0 transition-opacity group-hover:opacity-100" />
                      </h3>
                      {d.summary ? <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-strong">{d.summary}</p> : null}
                      {fact ? <p className="mt-2 line-clamp-1 text-xs text-muted-strong"><span className="font-semibold text-ink">{fact.title}:</span> {fact.body}</p> : null}
                    </Link>
                  ),
                };
              })}
            />
          </>)
        ) : null}

        {/* 3b. Regions: the main chooser, on the state's line map; destinations live inside them */}
        {regionItems.length ? (
          wrap("regions", <>
            <Head id="regions" eyebrow="Where to go" title={regions.length ? `Choose a region of ${name}` : `Where to go in ${name}`} intro={regions.length ? "Open a region to see its season, the days our plans give it, who it suits and its towns." : undefined} />
            <RegionAccordion regions={regionItems} geo={regionGeo} />
          </>)
        ) : null}

        {/* 4. Best time: season photo panels, then the notes that aren't seasons */}
        {bestTime ? (
          wrap("best-time", <>
            <Head id="best-time" eyebrow="When to go" title={`Best time to visit ${name}`} />
            {seasonPanels.length > 1 ? <SeasonPanels seasons={seasonPanels} /> : null}
            {seasonNotes.length ? (
              <div className={`grid grid-cols-1 gap-4 md:grid-cols-2 ${seasonPanels.length > 1 ? "mt-6" : ""}`}>
                {seasonNotes.map((x, i) => <div key={i} className="rounded-2xl border border-line bg-white p-5"><Labelled text={x.label ? `${x.label}${x.when ? ` (${x.when})` : ""}: ${x.text}` : x.text} /></div>)}
              </div>
            ) : null}
          </>)
        ) : null}

        {/* 5. Getting there and around */}
        {reach || around ? (
          wrap("reach", <>
            <Head id="reach" eyebrow="Getting there" title={`How to reach and get around ${name}`} />
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {reach ? (
                <ul className="space-y-3">
                  {paragraphs(reach.body.text).map((p, i) => {
                    const icon: Name = /^by air/i.test(p) ? "plane" : /^by (rail|train)/i.test(p) ? "train" : /^by (sea|ferry|boat)/i.test(p) ? "waves" : /^by (road|bus|car)/i.test(p) ? "car" : "route";
                    return <li key={i} className="flex gap-3 rounded-2xl border border-line bg-white p-4"><Icon name={icon} size={18} className="mt-0.5 shrink-0 text-coral" /><Labelled text={p} /></li>;
                  })}
                  {(reach.body.items ?? []).map((it, i) => <li key={`i${i}`} className="rounded-2xl border border-line bg-white p-4"><Labelled text={it.title ? `${it.title}: ${it.body}` : it.body} /></li>)}
                </ul>
              ) : null}
              {around ? (
                <div className="rounded-2xl border border-line bg-[#FBFAF8] p-5">
                  <h3 className="flex items-center gap-2 font-semibold text-ink"><Icon name="bus" size={17} className="text-coral" /> Getting around</h3>
                  <div className="mt-2 space-y-2">{paragraphs(around.body.text).map((p, i) => <Labelled key={i} text={p} />)}</div>
                  {around.body.items?.length ? <div className="mt-2"><Pairs items={around.body.items} /></div> : null}
                </div>
              ) : null}
            </div>
          </>)
        ) : null}

        {/* 6. Top experiences and places */}
        {activities.length + attractions.length + inline.length > 0 ? (
          wrap("experiences", <>
            <Head id="experiences" eyebrow="Experiences" title={`Top experiences and places in ${name}`} />
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {activities.length ? (
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-ink">Things to do</h3>
                  <ul className="mt-3 grid grid-cols-1 gap-3">{activities.slice(0, 6).map((a) => smallCard(a, categoryLabel(a.category) ?? "Experience"))}</ul>
                  {activities.length > 6 ? <p className="mt-3 text-sm"><Link href="/things-to-do" className="font-semibold text-ink underline decoration-line underline-offset-4 hover:text-coral">All things to do</Link></p> : null}
                </div>
              ) : null}
              {attractions.length ? (
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-ink">Places to visit</h3>
                  <ul className="mt-3 grid grid-cols-1 gap-3">{attractions.slice(0, 6).map((a) => smallCard(a, kindLabel(a.kind) ?? "Place"))}</ul>
                </div>
              ) : null}
            </div>
            {inline.length ? (
              <ul className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
                {inline.map((c) => (
                  <li key={c.slug} id={c.slug} className="dt-card scroll-mt-40 rounded-2xl border border-line bg-white p-5">
                    <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-coral-text">{kindLabel(c.snapshot.place.kind) ?? "Place"}</p>
                    <h4 className="mt-1 font-serif text-[1.125rem] text-ink">{c.snapshot.place.name}</h4>
                    {c.snapshot.place.summary ? <p className="mt-1 text-sm leading-relaxed text-[#555555]">{c.snapshot.place.summary}</p> : null}
                    <details className="dt-more mt-2">
                      <summary className="cursor-pointer list-none text-sm font-semibold text-ink underline decoration-line underline-offset-4 hover:text-coral">Read more</summary>
                      <div className="mt-2 space-y-2">{c.snapshot.sections.filter((x) => x.key !== "key_facts").map((x) => <div key={x.key}>{paragraphs(x.body.text).map((t, i) => <Labelled key={i} text={t} />)}{x.body.items?.length ? <Pairs items={x.body.items} /> : null}</div>)}</div>
                    </details>
                  </li>
                ))}
              </ul>
            ) : null}
          </>)
        ) : null}

        {/* 7. Food and culture */}
        {culture.length ? (
          wrap("culture", <>
            <Head id="culture" eyebrow="Food and culture" title={`Eat, celebrate and fit in`} />
            <div className={`grid grid-cols-1 gap-5 ${culture.length >= 3 ? "lg:grid-cols-3" : culture.length === 2 ? "lg:grid-cols-2" : ""}`}>
              {culture.map((c) => (
                <div key={c.title} className="rounded-2xl border border-line bg-[#FBFAF8] p-5">
                  <h3 className="flex items-center gap-2 font-serif text-[1.25rem] text-ink"><Icon name={c.icon} size={18} className="text-coral" /> {c.title}</h3>
                  <ul className="mt-3 space-y-2.5">{c.items.slice(0, 5).map((it, i) => <li key={i}><Labelled text={it.title ? `${it.title}: ${it.body}` : it.body} /></li>)}</ul>
                  {c.items.length > 5 ? (
                    <details className="dt-more mt-2"><summary className="cursor-pointer list-none text-sm font-semibold text-ink underline decoration-line underline-offset-4 hover:text-coral">Show {c.items.length - 5} more</summary>
                      <ul className="mt-2 space-y-2.5">{c.items.slice(5).map((it, i) => <li key={i}><Labelled text={it.title ? `${it.title}: ${it.body}` : it.body} /></li>)}</ul>
                    </details>
                  ) : null}
                </div>
              ))}
            </div>
          </>)
        ) : null}

        {/* 8. Practical */}
        {budget || practical.length ? (
          wrap("practical", <>
            <Head id="practical" eyebrow="Practical" title={`Before you go to ${name}`} />
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              {budget ? (
                <div className="rounded-2xl border border-line bg-white p-5 lg:col-span-1">
                  <h3 className="flex items-center gap-2 font-semibold text-ink"><Icon name="coins" size={17} className="text-coral" /> Costs</h3>
                  {budget.body.items?.length ? <div className="mt-3"><Pairs items={budget.body.items.map((b) => ({ ...b, status: isEstimate(b) ? "estimate" : b.status }))} /></div> : null}
                  {budget.body.text ? <p className="mt-3 text-xs leading-relaxed text-muted-strong">{budget.body.text}</p> : null}
                </div>
              ) : null}
              <div className={`grid grid-cols-1 gap-3 ${budget ? "lg:col-span-2" : "lg:col-span-3"} md:grid-cols-2 content-start`}>
                {practical.map(({ title, s }) => (
                  <details key={title} className="dt-more rounded-2xl border border-line bg-[#FBFAF8]">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-ink hover:text-coral focus-visible:outline-2 focus-visible:outline-coral">{title}<Icon name="chevronDown" size={18} className="shrink-0 text-muted" /></summary>
                    <div className="space-y-2 px-5 pb-5">{paragraphs(s.body.text).map((p, i) => <Labelled key={i} text={p} />)}{s.body.items?.length ? <Pairs items={s.body.items} /> : null}</div>
                  </details>
                ))}
              </div>
            </div>
            {booking.length ? (
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-ink">Book:</span>
                {booking.map((b) => (
                  <a key={b.href} href={b.href} target="_blank" rel="sponsored nofollow noopener noreferrer" className="dt-chip inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-[0.8125rem] font-medium text-ink hover:border-coral hover:text-coral"><Icon name={b.icon as Name} size={14} /> {b.label}</a>
                ))}
                <span className="text-xs text-muted-strong">Opens each provider’s own search.{affiliateActive() ? " VacayOut may earn a commission, at no extra cost to you." : ""}</span>
              </div>
            ) : null}
            {rollup.guides.length ? (
              <p className="mt-4 text-sm text-[#555555]">Read before you go:{" "}
                {rollup.guides.slice(0, 6).map((g, i) => <span key={g.slug}>{i ? ", " : ""}<Link href={`/travel-guides/${g.slug}`} className="font-semibold text-ink underline decoration-line underline-offset-4 hover:text-coral">{g.title}</Link></span>)}
              </p>
            ) : null}
          </>)
        ) : null}

        {/* 9. Map, FAQs, sources */}
        {points.length > 1 || faqItems.length ? (
          wrap("faqs", <>
            <div className={`grid grid-cols-1 gap-8 ${points.length > 1 && faqItems.length ? "lg:grid-cols-12" : ""}`}>
              {points.length > 1 ? (
                <div className={faqItems.length ? "min-w-0 lg:col-span-5" : ""}>
                  <h2 className="font-serif text-[1.5rem] text-ink">Map of {name}</h2>
                  <p className="mt-1 text-sm text-muted-strong">Destinations and places from this guide. Tap a pin to open it.</p>
                  <div className="mt-3 overflow-hidden rounded-2xl border border-line"><PlaceMap points={points} height={380} label={`Map of ${name} and places inside it`} /></div>
                </div>
              ) : null}
              {faqItems.length ? (
                <div className={points.length > 1 ? "min-w-0 lg:col-span-7" : ""}>
                  <h2 id="faqs-h" className="font-serif text-[1.5rem] text-ink">{name}: common questions</h2>
                  <div className="mt-3 divide-y divide-line rounded-2xl border border-line bg-white">
                    {faqItems.map((f, i) => (
                      <details key={i} className="dt-faq group" open={i === 0}>
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[0.9375rem] font-semibold text-ink hover:text-coral focus-visible:outline-2 focus-visible:outline-coral">{f.title}<Icon name="chevronDown" size={18} className="shrink-0 text-muted transition-transform group-open:rotate-180" /></summary>
                        <p className="px-5 pb-4 text-sm leading-relaxed text-[#555555]">{f.body}</p>
                      </details>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </>)
        ) : null}

        {sources.length ? (
          <details className="dt-more rounded-2xl border border-line bg-[#FBFAF8]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-ink hover:text-coral focus-visible:outline-2 focus-visible:outline-coral">Sources for this guide<Icon name="chevronDown" size={18} className="shrink-0 text-muted" /></summary>
            <ul className="grid grid-cols-1 gap-x-6 gap-y-1.5 px-5 pb-5 text-sm sm:grid-cols-2">
              {sources.map((s) => <li key={s.url} className="min-w-0 truncate"><a href={s.url} target="_blank" rel="nofollow noopener noreferrer" className="text-ink underline decoration-line underline-offset-4 hover:text-coral">{s.title || s.url}</a></li>)}
            </ul>
          </details>
        ) : null}

        <section aria-labelledby="ai-h" className="rounded-3xl bg-ink px-6 py-10 text-center text-white sm:px-10">
          <h2 id="ai-h" className="font-serif text-[clamp(1.6rem,3vw,2.2rem)] font-normal">Plan your {name} trip in minutes</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-white/80">Tell the planner your dates and what you like; it builds a day-by-day plan from this guide.</p>
          <PlanAiButton prompt={planPrompt} className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-full bg-coral px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-coral-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"><Icon name="sparkles" size={15} /> Plan with AI</PlanAiButton>
          {nearbyStates.length ? (
            <p className="mt-6 text-sm text-white/80">Nearby states:{" "}{nearbyStates.map((r, i) => <span key={r.slug}>{i ? ", " : ""}<Link href={`/india/${r.slug}`} className="font-semibold text-white underline underline-offset-4 hover:text-coral">{r.name}</Link></span>)}</p>
          ) : null}
        </section>
      </main>

      <PageAssistant pack={buildPack({ snapshot, stateSlug, rollup, inline, related })} />
    </div>
  );
}
