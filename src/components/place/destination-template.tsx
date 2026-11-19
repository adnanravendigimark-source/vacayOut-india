import type { ReactNode } from "react";
import Image from "@/components/media/image";
import Link from "next/link";
import { Icon, type Name } from "@/components/icons/icon";
import type { PublishedSnapshot, SnapshotImage } from "@/lib/db/schema";
import { affiliateActive, bookingLinksFor } from "@/lib/booking/links";
import { kindLabel } from "@/lib/places/kinds";
import { categoryLabel } from "@/lib/places/categories";
import { TRIP_TYPES } from "@/lib/places/trip-types";
import type { PlaceRollup, RollupPlace } from "@/lib/places/rollup";
import { PageAssistant } from "@/components/assistant/page-assistant";
import { buildPack } from "@/lib/assistant/pack";
import { PlanAiButton, SectionNav } from "./state-guide-client";
import { HashOpener } from "./destination-template-client";
import "./destination-template.css";

/**
 * Reusable template for destination pages (city, town, region): decision-first.
 * Hero + at a glance → choose your trip → where to stay → top places → things to do + food
 * → practical → FAQs → AI planner. Each place gets one full card (in "Top places");
 * everywhere else it appears as a chip linking to that card. Design: DESIGN.md.
 */

type Section = PublishedSnapshot["sections"][number];
type Item = NonNullable<Section["body"]["items"]>[number];
type Inline = { slug: string; snapshot: PublishedSnapshot };
type Related = { name: string; slug: string; kind: string; summary: string | null; type: "nearby" | "day_trip"; stateSlug: string | null; lat?: number | null; lng?: number | null; hero?: SnapshotImage | null };

export const TEMPLATE_KINDS = ["city", "town", "region"];

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MON = (m: string) => m.slice(0, 3);
const NUMBER_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12, fourteen: 14 };

/** "April to July … and October to December" → "Apr–Jul & Oct–Dec" (first two month ranges in the text). */
export function seasonRanges(text: string): string | null {
  const re = new RegExp(`\\b(${MONTHS.join("|")})\\s*(?:to|–|-|and)\\s*(?:early |mid-|late )?(${MONTHS.join("|")})\\b`, "g");
  const out: string[] = [];
  for (const m of text.matchAll(re)) {
    const r = `${MON(m[1])}–${MON(m[2])}`;
    if (!out.includes(r)) out.push(r);
    if (out.length === 2) break;
  }
  return out.length ? out.join(" & ") : null;
}

/** Day counts named in a sentence ("Three days … four … seven") → "3–7 days". */
export function dayRange(text: string): string | null {
  const nums = [...text.toLowerCase().matchAll(/\b(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|twelve|fourteen)\b/g)]
    .map((m) => (/\d/.test(m[1]) ? Number(m[1]) : NUMBER_WORDS[m[1]]))
    .filter((n) => n >= 2 && n <= 21);
  if (!nums.length) return null;
  const lo = Math.min(...nums), hi = Math.max(...nums);
  return lo === hi ? `${lo} day${lo > 1 ? "s" : ""}` : `${lo}–${hi} days`;
}

/** First clause of a fact, short enough for one line (full text stays in the title attribute). */
export function short(body: string, max = 32): string {
  const f = body.replace(/\s*\([^)]*\)/g, "").split(/\s[—–-]\s|;\s|\.\s/)[0].trim().replace(/[.,]$/, "");
  return f.length <= max ? f : `${f.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

export const paragraphs = (t?: string | null) => (t ?? "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function Head({ id, eyebrow, title, intro, aside }: { id: string; eyebrow: string; title: string; intro?: string; aside?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-coral-text">{eyebrow}</p>
        <h2 id={`${id}-h`} className="mt-2 font-serif text-[clamp(1.75rem,3vw,2.4rem)] font-normal leading-[1.15] tracking-[-0.015em] text-ink">{title}</h2>
        {intro ? <p className="mt-2 max-w-2xl text-[0.9375rem] leading-relaxed text-[#555555]">{intro}</p> : null}
      </div>
      {aside}
    </div>
  );
}

export function PhotoCredit({ img }: { img: SnapshotImage }) {
  if (img.kind === "ai_generated") return <p className="text-[0.6875rem] text-muted-strong">AI-generated illustration — not a photograph of the place.</p>;
  const by = img.attribution && img.attribution.length > 60 ? `${img.attribution.slice(0, 57).trimEnd()}…` : img.attribution;
  return (
    <p className="text-[0.6875rem] text-muted-strong">
      {by ? <span title={img.attribution ?? undefined}>Photo: {by} · </span> : null}
      {img.licenseUrl && /^https?:\/\//.test(img.licenseUrl) ? <a href={img.licenseUrl} target="_blank" rel="license nofollow noopener noreferrer" className="underline">{img.license}</a> : img.license}
      {img.sourceUrl && /^https?:\/\//.test(img.sourceUrl) ? <> · <a href={img.sourceUrl} target="_blank" rel="nofollow noopener noreferrer" className="underline">source</a></> : null}
    </p>
  );
}

export function DestinationTemplate({
  snapshot,
  inline = [],
  related = [],
  stateSlug,
  rollup,
}: {
  snapshot: PublishedSnapshot;
  inline?: Inline[];
  related?: Related[];
  stateSlug: string;
  rollup: PlaceRollup;
}) {
  const { place, sections } = snapshot;
  const name = place.name;
  const sec = (key: string) => sections.find((s) => s.key === key && ((s.body.items ?? []).length || s.body.text?.trim()));
  const items = (key: string): Item[] => sec(key)?.body.items ?? [];
  const keyFacts = items("key_facts");
  const faqs = sec("faqs");
  const faqItems = (faqs?.body.items ?? []).filter((f) => f.title?.trim() && f.body?.trim());
  const bestTime = sec("best_time");
  const howToReach = sec("how_to_reach");
  const localTransport = sec("local_transport");
  const budget = sec("budget");
  const whereToStay = sec("where_to_stay");
  const neighbourhoods = items("neighbourhoods");
  const whoFor = items("who_its_for");
  const food = items("food");
  const thingsToDo = items("things_to_do");
  const sampleDays = items("itinerary");
  const extraPractical: { title: string; s: Section }[] = (
    [
      [`About ${place.name}`, sec("overview")],
      ["Highlights", sec("highlights")],
      ["Areas and regions", sec("regions")],
      ["Safety and health", sec("safety_health")],
      ["Good to know", sec("practical_info")],
      ["Travel tips", sec("travel_tips")],
      ["Common mistakes", sec("common_mistakes")],
      ["Accessibility", sec("accessibility")],
      ["Shopping", sec("shopping")],
      ["Culture and etiquette", sec("culture_etiquette")],
    ] as const
  ).flatMap(([title, s]) => (s ? [{ title, s }] : []));

  const pageHref = (p: { slug: string; displayMode?: string; parentSlug?: string | null; parentKind?: string | null }) =>
    p.displayMode === "parent_section" && p.parentSlug
      ? p.parentSlug === place.slug ? `#${p.slug}` : `${p.parentKind === "state" ? `/india/${p.parentSlug}` : `/india/${stateSlug}/${p.parentSlug}`}#${p.slug}`
      : `/india/${stateSlug}/${p.slug}`;
  const relatedHref = (r: Related) => (r.kind === "state" ? `/india/${r.slug}` : r.stateSlug ? `/india/${r.stateSlug}/${r.slug}` : null);

  // ---- Top places: sights, towns inside this place, places shown on this page, then nearby — each once.
  type Spot = { slug: string; name: string; kind: string; summary: string | null; hero: SnapshotImage | null; href: string | null; tag: string; anchor?: string; more?: Section[] };
  const spots: Spot[] = [];
  const seen = new Set<string>();
  const add = (s: Spot) => { if (s.name === name || seen.has(s.slug)) return; seen.add(s.slug); spots.push(s); };
  const sightScore = (p: RollupPlace) => (p.displayMode === "page" ? 2 : 0) + (p.hero ? 1 : 0);
  // Places shown inside this page (no page of their own): their card carries their full text and keeps the #slug anchor redirects use.
  for (const c of inline)
    add({ slug: c.slug, name: c.snapshot.place.name, kind: c.snapshot.place.kind, summary: c.snapshot.place.summary, hero: c.snapshot.place.hero, href: null, tag: kindLabel(c.snapshot.place.kind) ?? c.snapshot.place.kind, anchor: c.slug, more: c.snapshot.sections.filter((x) => x.key !== "key_facts" && ((x.body.items ?? []).length || x.body.text?.trim())) });
  for (const p of [...rollup.attractions].sort((a, b) => sightScore(b) - sightScore(a)))
    add({ slug: p.slug, name: p.name, kind: p.kind, summary: p.summary, hero: p.hero, href: pageHref(p), tag: kindLabel(p.kind) ?? p.kind });
  for (const d of rollup.destinations.filter((d) => d.kind !== "region"))
    add({ slug: d.slug, name: d.name, kind: d.kind, summary: d.summary, hero: d.hero, href: pageHref(d), tag: "Nearby town" });
  for (const r of related)
    add({ slug: r.slug, name: r.name, kind: r.kind, summary: r.summary, hero: r.hero ?? null, href: relatedHref(r), tag: r.type === "day_trip" ? "Day trip" : "Nearby" });
  const cardId = (slug: string) => `place-${slug}`;
  const onPage = new Map(spots.map((s) => [s.slug, s]));
  const byName = spots.filter((s) => s.name.length >= 5).sort((a, b) => b.name.length - a.name.length);
  /** Places named in a text, as chips to their card. */
  const mentions = (text: string) => {
    const t = text.toLowerCase();
    return byName.filter((s) => t.includes(s.name.toLowerCase()) || t.includes(s.name.toLowerCase().replace(/ temple$| valley$| pass$/, "")))
      .filter((s, i, all) => all.findIndex((x) => x.slug === s.slug) === i)
      .sort((a, b) => t.indexOf(a.name.toLowerCase()) - t.indexOf(b.name.toLowerCase()));
  };
  const Chip = ({ slug, label }: { slug: string; label?: string }) => {
    const s = onPage.get(slug);
    if (!s) return null;
    return (
      <a href={`#${s.anchor ?? cardId(slug)}`} className="dt-chip inline-flex items-center rounded-full border border-line bg-white px-3 py-1 text-[0.8125rem] font-medium text-ink hover:border-coral hover:text-coral">
        {label ?? s.name}
      </a>
    );
  };
  const Chips = ({ text, max = 4 }: { text: string; max?: number }) => {
    const m = mentions(text).slice(0, max);
    return m.length ? <div className="mt-3 flex flex-wrap gap-1.5">{m.map((s) => <Chip key={s.slug} slug={s.slug} />)}</div> : null;
  };

  // ---- At a glance: only sourced values.
  const factBy = (re: RegExp) => keyFacts.find((f) => re.test(f.title ?? ""));
  const glance: { icon: Name; label: string; value: string; full: string }[] = [];
  const bt = factBy(/best time|season to visit/i);
  const btText = bt ? bt.body : bestTime?.body.text ?? "";
  const season = seasonRanges(btText) ?? (bt ? short(bt.body) : null);
  if (season) glance.push({ icon: "calendar", label: "Best time", value: season, full: bt?.body ?? paragraphs(bestTime?.body.text)[0] ?? season });
  const daysFaq = faqItems.find((f) => /how many days|how long|days do i need/i.test(f.title ?? ""));
  const tl = factBy(/trip length|days needed|time needed/i);
  const daysSrc = tl?.body ?? daysFaq?.body ?? "";
  const ownTrips = rollup.itineraries.filter((it) => it.placeName === name).map((it) => it.durationDays);
  const days = dayRange(daysSrc) ?? (ownTrips.length ? (Math.min(...ownTrips) === Math.max(...ownTrips) ? `${ownTrips[0]} days` : `${Math.min(...ownTrips)}–${Math.max(...ownTrips)} days`) : null);
  if (days) glance.push({ icon: "clock", label: "Days needed", value: days, full: daysSrc || `Ready-made plans of ${days}` });
  const perDay = (budget?.body.items ?? []).find((b) => /per day|a day|daily/i.test(`${b.title ?? ""} ${b.body}`) && /₹/.test(b.body));
  if (perDay) glance.push({ icon: "coins", label: "Budget a day", value: short(perDay.body), full: `${perDay.title ?? ""} ${perDay.body}`.trim() });
  const reach = factBy(/airport|getting in|railhead|railway|bus/i);
  if (reach) glance.push({ icon: "plane", label: reach.title ?? "Getting there", value: short(reach.body), full: reach.body });
  const permit = factBy(/permit/i);
  if (permit) glance.push({ icon: "shield", label: permit.title ?? "Permits", value: short(permit.body), full: permit.body });
  for (const f of keyFacts) if (glance.length < 5 && f !== bt && f !== tl && f !== reach && f !== permit && !/season/i.test(f.title ?? "") && short(f.body).length <= 28)
    glance.push({ icon: /altitude|height/i.test(f.title ?? "") ? "mountain" : "checkCircle", label: f.title ?? "", value: short(f.body), full: f.body });

  // ---- Trips: plans based here first (shortest first), then longer routes passing through.
  const typeLabel = (k: string) => TRIP_TYPES.find((t) => t.key === k)?.label ?? null;
  const trips = [...rollup.itineraries].sort((a, b) => Number(b.placeName === name) - Number(a.placeName === name) || a.durationDays - b.durationDays);
  const ownPlans = trips.filter((t) => t.placeName === name);
  const shownTrips = (ownPlans.length >= 2 ? ownPlans : trips).slice(0, 4);
  const otherTrips = trips.filter((t) => !shownTrips.includes(t));

  // ---- Stay
  const booking = bookingLinksFor({ name, kind: place.kind, stateName: place.state?.name ?? null });
  const stayLink = booking.find((b) => b.icon === "hotel");
  const areaId = (title: string) => `area-${slugify(title)}`;
  const areaFor = (text: string) => neighbourhoods.filter((n) => n.title && text.toLowerCase().includes(n.title.toLowerCase().split(/ and | \(/)[0]));

  // ---- Things to do
  const activities = rollup.activities;
  const reachParas = paragraphs(howToReach?.body.text);
  const modeIcon = (p: string): Name => (/^by air|flight|airport/i.test(p) ? "plane" : /^by (train|rail)|railhead/i.test(p) ? "train" : /^by bus|bus/i.test(p) ? "bus" : "car");

  const planPrompt = `Plan a trip to ${name}${place.state ? `, ${place.state.name}` : ""}`;
  const hero = place.hero;
  // Hero chips: the top sights (not activities), photographed ones first.
  const heroChips = [...spots.filter((s) => s.kind !== "activity" && s.tag !== "Nearby" && s.tag !== "Day trip")].sort((a, b) => Number(!!b.hero) - Number(!!a.hero)).slice(0, 3);

  const nav = [
    { id: "glance", label: "At a glance", on: glance.length > 0 },
    { id: "trips", label: "Trip plans", on: trips.length > 0 || sampleDays.length > 0 },
    { id: "stay", label: "Where to stay", on: !!(whereToStay || neighbourhoods.length || whoFor.length) },
    { id: "places", label: "Top places", on: spots.length > 0 },
    { id: "things", label: "Things to do", on: activities.length > 0 || thingsToDo.length > 0 || food.length > 0 },
    { id: "practical", label: "Practical", on: !!(bestTime || howToReach || budget || extraPractical.length) },
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
      ...(rollup.attractions.length || inline.length
        ? { includesAttraction: [...rollup.attractions.map((c) => c.name), ...inline.filter((c) => c.snapshot.place.kind !== "activity").map((c) => c.snapshot.place.name)].slice(0, 30).map((n) => ({ "@type": "TouristAttraction", name: n })) }
        : {}),
    },
  ];
  if (faqItems.length) jsonLd.push({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqItems.map((f) => ({ "@type": "Question", name: f.title, acceptedAnswer: { "@type": "Answer", text: f.body } })) });

  const PlaceCard = ({ s }: { s: Spot }) => {
    const inner = (
      <>
        <div className="relative aspect-[16/10] overflow-hidden bg-sand">
          {s.hero ? <Image src={s.hero.url} alt={s.hero.alt} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" /> : <span className="flex size-full items-center justify-center text-[#B8B2A6]"><Icon name="mountain" size={28} /></span>}
        </div>
        <div className="p-5">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-coral-text">{s.tag}</p>
          <h3 className="mt-1.5 font-serif text-[1.25rem] font-normal leading-snug text-ink">{s.name}</h3>
          {s.summary ? <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-[#555555]">{s.summary}</p> : null}
          {s.href ? <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-ink group-hover:text-coral">Open guide <Icon name="arrowRight" size={14} /></span> : null}
        </div>
      </>
    );
    const more = s.more?.length ? (
      <details className="dt-more border-t border-line px-5 py-3">
        <summary className="cursor-pointer list-none text-sm font-semibold text-ink underline decoration-line underline-offset-4 hover:text-coral focus-visible:outline-2 focus-visible:outline-coral">Read more about {s.name}</summary>
        <div className="mt-2 space-y-2 text-sm leading-relaxed text-[#555555]">
          {s.more.map((x) => (
            <div key={x.key}>
              {paragraphs(x.body.text).map((t, i) => <p key={`t${i}`}>{t}</p>)}
              {(x.body.items ?? []).map((it, i) => <p key={i}>{it.title ? <span className="font-semibold text-ink">{it.title}: </span> : null}{it.body}</p>)}
            </div>
          ))}
        </div>
      </details>
    ) : null;
    return (
      <li id={s.anchor ?? cardId(s.slug)} className="dt-card scroll-mt-40 overflow-hidden rounded-2xl border border-line bg-white">
        {s.href ? <Link href={s.href} className="group block focus-visible:outline-2 focus-visible:outline-coral">{inner}</Link> : <div>{inner}</div>}
        {more}
      </li>
    );
  };

  return (
    <div className="min-h-screen bg-white font-sans text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <HashOpener />

      {/* Hero: framed photograph, the place name large in serif, one sentence, chips to its top places. */}
      <section className="container-site pt-5 sm:pt-6" aria-labelledby="dt-title">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <Link href="/" className="hover:text-ink">Home</Link><span aria-hidden className="text-[#CCCCCC]">/</span>
          <Link href="/india" className="hover:text-ink">Explore India</Link><span aria-hidden className="text-[#CCCCCC]">/</span>
          {place.state ? <><Link href={`/india/${place.state.slug}`} className="hover:text-ink">{place.state.name}</Link><span aria-hidden className="text-[#CCCCCC]">/</span></> : null}
          {place.parent && place.parent.kind !== "state" ? <><Link href={`/india/${stateSlug}/${place.parent.slug}`} className="hover:text-ink">{place.parent.name}</Link><span aria-hidden className="text-[#CCCCCC]">/</span></> : null}
          <span className="font-medium text-ink" aria-current="page">{name}</span>
        </nav>
        <div className="dt-frame relative isolate mt-4 flex min-h-[520px] flex-col items-center justify-end overflow-hidden bg-[#2B2B2B] px-5 pb-8 text-center text-white sm:min-h-[560px] lg:min-h-[600px]">
          {hero ? <Image src={hero.url} alt={hero.alt} fill priority sizes="(min-width: 1320px) 1224px, 100vw" className="dt-frame__img -z-20 object-cover" /> : null}
          <div aria-hidden className="dt-veil absolute inset-0 -z-10" />
          <p className="dt-name text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-white">{kindLabel(place.kind) ?? "Destination"}{place.state ? ` in ${place.state.name}` : ""}</p>
          <h1 id="dt-title" className={`dt-name mt-3 max-w-full font-serif font-normal leading-[0.95] tracking-[-0.03em] ${name.length > 16 ? "text-[clamp(2.5rem,7vw,5.5rem)]" : "text-[clamp(3.25rem,10vw,8rem)]"}`}>{name}</h1>
          {place.summary ? <p className="mt-4 max-w-xl text-[1.0625rem] leading-relaxed text-white/95">{place.summary}</p> : null}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {trips.length || sampleDays.length ? (
              <a href="#trips" className="inline-flex items-center gap-2 rounded-full bg-coral px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(236,98,66,0.6)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                Choose your trip <Icon name="arrowRight" size={15} />
              </a>
            ) : null}
            <PlanAiButton prompt={planPrompt} className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white/95 px-5 py-3 text-sm font-semibold text-ink transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              <Icon name="sparkles" size={15} className="text-coral" /> Plan with AI
            </PlanAiButton>
          </div>
          {heroChips.length ? (
            <ul className="mt-6 flex flex-wrap justify-center gap-2" aria-label={`Top places in ${name}`}>
              {heroChips.map((s) => (
                <li key={s.slug}><a href={`#${s.anchor ?? cardId(s.slug)}`} className="dt-chip inline-flex rounded-full border border-white/50 bg-white/15 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm hover:bg-white hover:text-ink">{s.name}</a></li>
              ))}
            </ul>
          ) : null}
        </div>
        {hero ? <div className="mt-2 flex justify-end"><PhotoCredit img={hero} /></div> : null}

        {/* At a glance */}
        {glance.length ? (
          <dl id="glance" className={`mt-6 grid scroll-mt-40 grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line ${glance.length >= 5 ? "lg:grid-cols-5" : glance.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`} aria-label={`${name} at a glance`}>
            {glance.map((g) => (
              <div key={g.label} className="flex items-start gap-3 bg-[#FBFAF8] p-4 max-lg:last:odd:col-span-2">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-coral-soft text-coral"><Icon name={g.icon} size={17} /></span>
                <div className="min-w-0">
                  <dt className="text-xs font-semibold text-muted-strong">{g.label}</dt>
                  <dd className="mt-0.5 text-[0.9375rem] font-semibold leading-snug text-ink" title={g.full}>{g.value}</dd>
                </div>
              </div>
            ))}
          </dl>
        ) : null}
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
        {/* Choose your trip */}
        {trips.length || sampleDays.length ? (
          <section id="trips" aria-labelledby="trips-h" className="scroll-mt-40">
            <Head id="trips" eyebrow="Choose your trip" title={`How long to spend in ${name}`} intro={days ? `Most visitors spend ${days}. Pick the plan that fits your time.` : undefined} />
            {shownTrips.length ? (
              <ul className={`grid grid-cols-1 gap-5 sm:grid-cols-2 ${shownTrips.length >= 4 ? "lg:grid-cols-4" : shownTrips.length === 3 ? "lg:grid-cols-3" : ""}`}>
                {shownTrips.map((t) => {
                  const best = t.tripTypes.map(typeLabel).filter(Boolean).slice(0, 2) as string[];
                  const stops = [...new Set(t.stopSlugs)].filter((sl) => onPage.has(sl)).slice(0, 4);
                  return (
                    <li key={t.slug} className="dt-card flex flex-col rounded-2xl border border-line bg-white p-5">
                      <p className="font-serif text-[2.5rem] leading-none text-ink">{t.durationDays}<span className="ml-1.5 font-sans text-sm font-semibold text-muted">{t.durationDays === 1 ? "day" : "days"}</span></p>
                      <h3 className="mt-4 font-serif text-[1.125rem] leading-snug text-ink"><Link href={`/itineraries/${t.slug}`} className="hover:text-coral">{t.title}</Link></h3>
                      <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-[#555555]">{t.summary}</p>
                      {best.length ? <p className="mt-3 text-xs text-muted">Best for: <span className="font-semibold text-ink">{best.join(", ")}</span></p> : null}
                      {stops.length ? <div className="mt-3 flex flex-wrap gap-1.5">{stops.map((sl) => <Chip key={sl} slug={sl} />)}</div> : null}
                      <Link href={`/itineraries/${t.slug}`} className="mt-auto pt-4 text-sm font-semibold text-ink underline decoration-line underline-offset-4 hover:text-coral hover:decoration-coral">See day by day</Link>
                    </li>
                  );
                })}
              </ul>
            ) : null}
            {otherTrips.length ? (
              <p className="mt-5 text-sm text-[#555555]">
                Longer routes through {name}:{" "}
                {otherTrips.map((t, i) => <span key={t.slug}>{i ? ", " : ""}<Link href={`/itineraries/${t.slug}`} className="font-semibold text-ink underline decoration-line underline-offset-4 hover:text-coral">{t.title}</Link></span>)}
              </p>
            ) : null}
            {sampleDays.length ? (
              <details className="dt-more mt-6 rounded-2xl border border-line bg-[#FBFAF8]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-ink hover:text-coral focus-visible:outline-2 focus-visible:outline-coral">
                  Our {sampleDays.length}-day plan, day by day
                  <Icon name="chevronDown" size={18} className="shrink-0 text-muted" />
                </summary>
                <ol className="space-y-4 px-5 pb-5">
                  {sampleDays.map((d, i) => (
                    <li key={i} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3">
                      <span className="flex size-9 items-center justify-center rounded-full bg-white font-serif text-ink ring-1 ring-line">{i + 1}</span>
                      <div className="min-w-0">
                        <p className="font-semibold text-ink">{(d.title ?? `Day ${i + 1}`).replace(/^Day \d+:\s*/i, "")}</p>
                        <p className="mt-1 text-sm leading-relaxed text-[#555555]">{d.body}</p>
                        <Chips text={`${d.title ?? ""} ${d.body}`} max={3} />
                      </div>
                    </li>
                  ))}
                </ol>
              </details>
            ) : null}
          </section>
        ) : null}

        {/* Where to stay */}
        {whereToStay || neighbourhoods.length || whoFor.length ? (
          <section id="stay" aria-labelledby="stay-h" className="scroll-mt-40">
            <Head
              id="stay"
              eyebrow="Where to stay"
              title={`Where to stay in ${name}`}
              intro={paragraphs(whereToStay?.body.text)[0]}
              aside={stayLink ? (
                <a href={stayLink.href} target="_blank" rel="sponsored nofollow noopener noreferrer" className="inline-flex shrink-0 items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-coral">
                  <Icon name="hotel" size={15} /> {stayLink.label}
                </a>
              ) : null}
            />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {whoFor.length ? (
                <div className="min-w-0 lg:col-span-7">
                  <h3 className="text-sm font-semibold text-ink">By kind of traveller</h3>
                  <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-white">
                    {whoFor.map((w, i) => {
                      const areas = areaFor(w.body);
                      return (
                        <li key={i} className="p-5">
                          <p className="font-serif text-[1.125rem] text-ink">{w.title}</p>
                          <p className="mt-1 text-sm leading-relaxed text-[#555555]">{w.body}</p>
                          {areas.length ? (
                            <p className="mt-2 text-xs text-muted">Stay in{" "}
                              {areas.map((a, j) => <span key={a.title}>{j ? " or " : ""}<a href={`#${areaId(a.title ?? "")}`} className="font-semibold text-ink underline decoration-line underline-offset-4 hover:text-coral">{a.title}</a></span>)}
                            </p>
                          ) : null}
                          <Chips text={w.body} max={3} />
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
              {neighbourhoods.length ? (
                <div className={`min-w-0 ${whoFor.length ? "lg:col-span-5" : "lg:col-span-12"}`}>
                  <h3 className="text-sm font-semibold text-ink">Areas to base yourself</h3>
                  <ul className="mt-3 space-y-3">
                    {neighbourhoods.map((n, i) => (
                      <li key={i} id={areaId(n.title ?? String(i))} className="dt-card scroll-mt-40 rounded-2xl border border-line bg-[#FBFAF8] p-5">
                        <p className="font-semibold text-ink">{n.title}</p>
                        <p className="mt-1 text-sm leading-relaxed text-[#555555]">{n.body}</p>
                      </li>
                    ))}
                  </ul>
                  {paragraphs(whereToStay?.body.text).slice(1).map((p, i) => <p key={i} className="mt-4 text-sm text-[#555555]">{p}</p>)}
                </div>
              ) : null}
            </div>
            {stayLink ? <p className="mt-4 text-xs text-muted">Opens Booking.com’s own search; we don’t check prices or availability.{affiliateActive() ? " VacayOut may earn a commission, at no extra cost to you." : ""}</p> : null}
          </section>
        ) : null}

        {/* Top places: one full card per place */}
        {spots.length ? (
          <section id="places" aria-labelledby="places-h" className="scroll-mt-40">
            <Head id="places" eyebrow="Top places" title={`What to see in and around ${name}`} intro={spots.length > 6 ? `The six to start with; ${spots.length - 6} more below.` : undefined} />
            <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{spots.slice(0, 6).map((s) => <PlaceCard key={s.slug} s={s} />)}</ul>
            {spots.length > 6 ? (
              <details className="dt-more mt-5">
                <summary className="mx-auto flex w-fit cursor-pointer list-none items-center gap-2 rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink hover:border-coral hover:text-coral focus-visible:outline-2 focus-visible:outline-coral">
                  See all {spots.length} places <Icon name="chevronDown" size={16} />
                </summary>
                <ul className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{spots.slice(6).map((s) => <PlaceCard key={s.slug} s={s} />)}</ul>
              </details>
            ) : null}
          </section>
        ) : null}

        {/* Things to do + food */}
        {activities.length || thingsToDo.length || food.length ? (
          <section id="things" aria-labelledby="things-h" className="scroll-mt-40">
            <Head id="things" eyebrow="Things to do" title={`What to do and eat in ${name}`} />
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              <div className={`min-w-0 ${food.length ? "lg:col-span-7" : "lg:col-span-12"}`}>
                {activities.length ? (
                  <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {activities.filter((a) => !(a.displayMode === "parent_section" && a.parentSlug === place.slug)).slice(0, 8).map((a) => (
                      <li key={a.slug}>
                        <Link href={pageHref(a)} className="group flex items-center gap-3 rounded-2xl border border-line bg-white p-2.5 pr-4 transition-colors hover:border-coral focus-visible:outline-2 focus-visible:outline-coral">
                          <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-sand">{a.hero ? <Image src={a.hero.url} alt="" fill sizes="56px" className="object-cover" /> : null}</span>
                          <span className="min-w-0">
                            <span className="block text-xs text-muted">{categoryLabel(a.category) ?? "Activity"}</span>
                            <span className="block truncate font-semibold text-ink group-hover:text-coral">{a.name}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ul className="space-y-3">
                    {thingsToDo.slice(0, 8).map((t, i) => (
                      <li key={i} className="rounded-2xl border border-line bg-white p-4">
                        {t.title ? <p className="font-semibold text-ink">{t.title}</p> : null}
                        <p className="text-sm leading-relaxed text-[#555555]">{t.body}</p>
                        <Chips text={`${t.title ?? ""} ${t.body}`} max={3} />
                      </li>
                    ))}
                  </ul>
                )}
                {activities.length > 8 ? <p className="mt-3 text-sm"><Link href="/things-to-do" className="font-semibold text-ink underline decoration-line underline-offset-4 hover:text-coral">All things to do</Link></p> : null}
                {activities.length && thingsToDo.length ? (
                  <details className="dt-more mt-4 rounded-2xl border border-line bg-white">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-semibold text-ink hover:text-coral focus-visible:outline-2 focus-visible:outline-coral">
                      {thingsToDo.length} more ideas<Icon name="chevronDown" size={16} className="shrink-0 text-muted" />
                    </summary>
                    <ul className="space-y-3 px-5 pb-5">
                      {thingsToDo.map((t, i) => (
                        <li key={i} className="text-sm leading-relaxed text-[#555555]">{t.title ? <span className="font-semibold text-ink">{t.title}: </span> : null}{t.body}<Chips text={`${t.title ?? ""} ${t.body}`} max={3} /></li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </div>
              {food.length ? (
                <div className="min-w-0 lg:col-span-5">
                  <div className="rounded-2xl border border-line bg-[#FBFAF8] p-5">
                    <h3 className="flex items-center gap-2 font-serif text-[1.25rem] text-ink"><Icon name="utensils" size={18} className="text-coral" /> What to eat</h3>
                    <ul className="mt-3 space-y-3">
                      {food.slice(0, 6).map((f, i) => {
                        const [head, ...rest] = (f.title ? `${f.title} — ${f.body}` : f.body).split(/\s[—–]\s|:\s/);
                        return (
                          <li key={i} className="text-sm leading-relaxed text-[#555555]">
                            <span className="font-semibold text-ink">{head}</span>{rest.length ? ` — ${rest.join(" — ")}` : ""}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* Practical: seasons, transport, budget */}
        {bestTime || howToReach || budget || extraPractical.length ? (
          <section id="practical" aria-labelledby="practical-h" className="scroll-mt-40">
            <Head id="practical" eyebrow="Practical" title={`Before you go to ${name}`} />
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              {bestTime ? (
                <div className="rounded-2xl border border-line bg-white p-5">
                  <h3 className="flex items-center gap-2 font-semibold text-ink"><Icon name="calendar" size={17} className="text-coral" /> Seasons</h3>
                  {paragraphs(bestTime.body.text).slice(0, 1).map((p, i) => <p key={i} className="mt-2 text-sm leading-relaxed text-[#555555]">{p}</p>)}
                  {paragraphs(bestTime.body.text).length > 1 ? (
                    <details className="dt-more mt-2">
                      <summary className="cursor-pointer list-none text-sm font-semibold text-ink underline decoration-line underline-offset-4 hover:text-coral">More on seasons</summary>
                      {paragraphs(bestTime.body.text).slice(1).map((p, i) => <p key={i} className="mt-2 text-sm leading-relaxed text-[#555555]">{p}</p>)}
                    </details>
                  ) : null}
                </div>
              ) : null}
              {howToReach || localTransport ? (
                <div className="rounded-2xl border border-line bg-white p-5">
                  <h3 className="flex items-center gap-2 font-semibold text-ink"><Icon name="route" size={17} className="text-coral" /> Getting there and around</h3>
                  <ul className="mt-2 space-y-2.5">
                    {reachParas.map((p, i) => (
                      <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-[#555555]"><Icon name={modeIcon(p)} size={16} className="mt-0.5 shrink-0 text-muted" /><span>{p}</span></li>
                    ))}
                  </ul>
                  {localTransport ? (
                    <details className="dt-more mt-2">
                      <summary className="cursor-pointer list-none text-sm font-semibold text-ink underline decoration-line underline-offset-4 hover:text-coral">Getting around {name}</summary>
                      {paragraphs(localTransport.body.text).map((p, i) => <p key={i} className="mt-2 text-sm leading-relaxed text-[#555555]">{p}</p>)}
                    </details>
                  ) : null}
                </div>
              ) : null}
              {budget ? (
                <div className="rounded-2xl border border-line bg-white p-5">
                  <h3 className="flex items-center gap-2 font-semibold text-ink"><Icon name="coins" size={17} className="text-coral" /> Costs and fees</h3>
                  {budget.body.text ? <p className="mt-2 text-xs leading-relaxed text-muted">{budget.body.text}</p> : null}
                  <dl className="mt-3 divide-y divide-line">
                    {(budget.body.items ?? []).map((b, i) => (
                      <div key={i} className="py-2.5">
                        <dt className="text-sm font-semibold text-ink">{b.title}</dt>
                        <dd className="text-sm text-[#555555]">{b.body}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}
            </div>
            {extraPractical.length ? (
              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                {extraPractical.map(({ title, s }) => (
                  <details key={title} className="dt-more rounded-2xl border border-line bg-[#FBFAF8]">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-ink hover:text-coral focus-visible:outline-2 focus-visible:outline-coral">
                      {title}<Icon name="chevronDown" size={18} className="shrink-0 text-muted" />
                    </summary>
                    <div className="space-y-2 px-5 pb-5 text-sm leading-relaxed text-[#555555]">
                      {paragraphs(s.body.text).map((p, i) => <p key={`t${i}`}>{p}</p>)}
                      {(s.body.items ?? []).map((it, i) => <p key={i}>{it.title ? <span className="font-semibold text-ink">{it.title}: </span> : null}{it.body}</p>)}
                    </div>
                  </details>
                ))}
              </div>
            ) : null}
            {booking.length ? (
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-ink">Book:</span>
                {booking.map((b) => (
                  <a key={b.href} href={b.href} target="_blank" rel="sponsored nofollow noopener noreferrer" className="dt-chip inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-[0.8125rem] font-medium text-ink hover:border-coral hover:text-coral">
                    <Icon name={b.icon as Name} size={14} /> {b.label}
                  </a>
                ))}
              </div>
            ) : null}
            {rollup.guides.length ? (
              <p className="mt-4 text-sm text-[#555555]">Read before you go:{" "}
                {rollup.guides.slice(0, 4).map((g, i) => <span key={g.slug}>{i ? ", " : ""}<Link href={`/travel-guides/${g.slug}`} className="font-semibold text-ink underline decoration-line underline-offset-4 hover:text-coral">{g.title}</Link></span>)}
              </p>
            ) : null}
          </section>
        ) : null}

        {/* FAQs */}
        {faqItems.length ? (
          <section id="faqs" aria-labelledby="faqs-h" className="scroll-mt-40">
            <Head id="faqs" eyebrow="FAQs" title={`${name}: common questions`} />
            <div className="divide-y divide-line rounded-2xl border border-line bg-white">
              {faqItems.map((f, i) => (
                <details key={i} className="dt-faq group" open={i === 0}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[0.9375rem] font-semibold text-ink hover:text-coral focus-visible:outline-2 focus-visible:outline-coral">
                    {f.title}<Icon name="chevronDown" size={18} className="shrink-0 text-muted transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="px-5 pb-4 text-sm leading-relaxed text-[#555555]">{f.body}</p>
                </details>
              ))}
            </div>
          </section>
        ) : null}

        {/* AI planner */}
        <section aria-labelledby="ai-h" className="rounded-3xl bg-ink px-6 py-10 text-center text-white sm:px-10">
          <h2 id="ai-h" className="font-serif text-[clamp(1.6rem,3vw,2.2rem)] font-normal">Plan your {name} trip in minutes</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-white/80">Tell the planner your dates and what you like; it builds a day-by-day plan from this guide.</p>
          <PlanAiButton prompt={planPrompt} className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-full bg-coral px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-coral-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            <Icon name="sparkles" size={15} /> Plan with AI
          </PlanAiButton>
        </section>
      </main>

      <PageAssistant pack={buildPack({ snapshot, stateSlug, rollup, inline, related })} />
    </div>
  );
}
