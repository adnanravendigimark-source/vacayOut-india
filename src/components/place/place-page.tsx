import Image from "next/image";
import Link from "next/link";
import { Icon, type Name } from "@/components/icons/icon";
import type { ItemStatus, PublishedSnapshot, SnapshotImage } from "@/lib/db/schema";
import { routes } from "@/lib/routes";
import { mapPoints } from "@/lib/map";
import { affiliateActive, bookingLinksFor } from "@/lib/booking/links";
import { kindLabel } from "@/lib/places/kinds";
import { categoryLabel } from "@/lib/places/categories";
import { zoneOf } from "@/lib/places/states";
import { TRIP_TYPES } from "@/lib/places/trip-types";
import type { PlaceRollup, RollupPlace } from "@/lib/places/rollup";
import { PlaceMap } from "@/components/map/place-map";
import { ActivityGrid, type ActivityCard } from "./activity-grid";
import { BudgetTable, CheckList, DaysTimeline, FaqList, HighlightCards, PairsList, SectionBody, StatusPill, TextBody } from "./section-body";
import { SectionTabs } from "./section-tabs";
import { Accordion, FilterGrid, Rail, ReadMore, Tabs } from "./interactive";

type Child = { name: string; slug: string; kind: string; summary: string | null; lat?: number | null; lng?: number | null; hero?: SnapshotImage | null; tripTypes?: string[] };
type Inline = { slug: string; snapshot: PublishedSnapshot };
type Related = { name: string; slug: string; kind: string; summary: string | null; type: "nearby" | "day_trip"; stateSlug: string | null; lat?: number | null; lng?: number | null; hero?: SnapshotImage | null };

const ext = { target: "_blank", rel: "nofollow noopener noreferrer" } as const;
const DEST_KINDS = ["state", "region", "city", "town"];

/** Photo credit (author · licence · source) or the AI-illustration notice. */
function Credit({ img, onDark = false }: { img: SnapshotImage; onDark?: boolean }) {
  const cls = onDark ? "text-white/85" : "text-muted";
  if (img.kind === "ai_generated") {
    return <p className={`text-xs ${cls}`}>AI-generated illustration — not a photograph of the place.</p>;
  }
  return (
    <p className={`text-xs ${cls}`}>
      {img.attribution ? <>Photo: {img.attribution} · </> : null}
      {img.licenseUrl && /^https?:\/\//.test(img.licenseUrl) ? <a href={img.licenseUrl} {...ext} rel="license nofollow noopener noreferrer" className="underline">{img.license}</a> : img.license}
      {img.sourceUrl && /^https?:\/\//.test(img.sourceUrl) ? <> · <a href={img.sourceUrl} {...ext} className="underline">source</a></> : null}
    </p>
  );
}

/** Small credit printed over a card photo. */
function CardCredit({ img }: { img: SnapshotImage }) {
  return (
    <span className="absolute bottom-1.5 right-1.5 max-w-[90%] truncate rounded bg-black/60 px-1.5 py-0.5 text-[0.625rem] text-white">
      {img.kind === "ai_generated" ? "AI illustration" : `${img.attribution ?? "Photo"} · ${img.license}`}
    </span>
  );
}

function Block({ id, title, intro, children, className = "" }: { id: string; title: string; intro?: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className={`scroll-mt-20 ${className}`}>
      <h2 id={`${id}-h`} className="font-serif text-[1.375rem] font-medium leading-tight text-ink @3xl:text-[1.625rem]">{title}</h2>
      {intro ? <p className="mt-1 text-sm text-[#666]">{intro}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}


function Panel({ icon, children }: { icon: Name; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 rounded-2xl border border-line bg-white p-5">
      <span className="hidden size-10 shrink-0 items-center justify-center rounded-xl bg-coral/10 text-coral @xl:flex"><Icon name={icon} size={19} /></span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** Photo card for a place in the rollup. */
function PlaceCard({ p, href, meta }: { p: { name: string; summary: string | null; hero: SnapshotImage | null }; href: string | null; meta: string }) {
  const inner = (
    <>
      <span className="relative block aspect-[4/3] overflow-hidden bg-sand">
        {p.hero ? <Image src={p.hero.url} alt={p.hero.alt} fill sizes="(min-width: 1024px) 300px, 50vw" className="object-cover transition-transform duration-500 group-hover:scale-105" /> : <span className="flex size-full items-center justify-center text-muted/50"><Icon name="mountain" size={30} /></span>}
        {p.hero ? <CardCredit img={p.hero} /> : null}
      </span>
      <span className="flex flex-1 flex-col gap-1 p-3.5">
        <span className="text-[0.6875rem] font-semibold uppercase tracking-wider text-[#777]">{meta}</span>
        <span className="text-[0.9375rem] font-semibold leading-snug text-ink group-hover:text-coral">{p.name}</span>
        {p.summary ? <span className="line-clamp-2 text-[0.8125rem] leading-relaxed text-[#555]">{p.summary}</span> : null}
      </span>
    </>
  );
  return href ? (
    <Link href={href} className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-line bg-white transition duration-300 hover:-translate-y-1 hover:border-[#D9D4CA] hover:shadow-card-hover">{inner}</Link>
  ) : (
    <div className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-line bg-white">{inner}</div>
  );
}

/**
 * The shared page template for every place: states, regions, towns,
 * attractions and activities use the same structure; only the content
 * changes. Every word comes from approved sections or published records;
 * blocks without data are left out (never padded). React escapes all text.
 */
export function PlacePage({
  snapshot,
  items,
  inline = [],
  related = [],
  stateSlug,
  tripTypes = [],
  rollup,
  preview = false,
  sample = false,
}: {
  snapshot: PublishedSnapshot;
  /** Direct children (used for previews, where the published rollup isn't relevant). */
  items: Child[];
  inline?: Inline[];
  related?: Related[];
  stateSlug: string;
  tripTypes?: string[];
  /** Published records inside this place (any depth), its itineraries and guides. */
  rollup?: PlaceRollup;
  preview?: boolean;
  /** Design-time sample content: shows a notice; never comes from the database. */
  sample?: boolean;
}) {
  const { place, sections } = snapshot;
  const sec = (key: string) => sections.find((s) => s.key === key && ((s.body.items ?? []).length || s.body.text?.trim()));
  const overview = sec("overview");
  const highlights = sec("highlights");
  const keyFacts = sec("key_facts");
  const regions = sec("regions");
  const neighbourhoods = sec("neighbourhoods");
  const whoFor = sec("who_its_for");
  const thingsToDo = sec("things_to_do");
  const bestTime = sec("best_time");
  const howToReach = sec("how_to_reach");
  const localTransport = sec("local_transport");
  const tips = sec("travel_tips");
  const faqs = sec("faqs");
  const itinerary = sec("itinerary");
  const budget = sec("budget");
  const visitInfo = sec("visit_info");
  const whereToStay = sec("where_to_stay");
  const food = sec("food");
  const shopping = sec("shopping");
  const culture = sec("culture_etiquette");
  const practical = sec("practical_info");
  const safety = sec("safety_health");
  const accessibility = sec("accessibility");
  const mistakes = sec("common_mistakes");

  const isState = place.kind === "state";
  const isDestination = DEST_KINDS.includes(place.kind);
  const isActivity = place.kind === "activity";
  const stateName = isState ? place.name : (place.state?.name ?? "");
  const zone = zoneOf(stateName);
  const types = TRIP_TYPES.filter((t) => tripTypes.includes(t.key));
  const hero = place.hero;
  const link = (href: string | null) => (preview ? null : href);
  const childHref = (slug: string) => link(`/india/${stateSlug}/${slug}`);
  // Section places link to their parent's page (or this page's own section).
  const hrefOf = (p: RollupPlace) =>
    p.displayMode === "parent_section" && p.parentSlug
      ? link(inlineSlugs.has(p.slug) ? `#${p.slug}` : `${p.parentKind === "state" ? `/india/${p.parentSlug}` : `/india/${stateSlug}/${p.parentSlug}`}#${p.slug}`)
      : childHref(p.slug);

  // Published rollup on live pages; direct (possibly draft) children in previews.
  const asRollup = (c: Child): RollupPlace => ({ id: c.slug, parentId: null, slug: c.slug, kind: c.kind, name: c.name, summary: c.summary, lat: c.lat ?? null, lng: c.lng ?? null, hero: c.hero ?? null, tripTypes: c.tripTypes ?? [], category: null, parentName: place.name, parentKind: place.kind, parentSlug: place.slug, displayMode: "page", depth: 1 });
  const fallback = items.map(asRollup);
  // Places shown as sections of THIS page are already listed from `inline`.
  const inlineSlugs = new Set(inline.map((c) => c.slug));
  const notInline = (p: RollupPlace) => !(p.displayMode === "parent_section" && inlineSlugs.has(p.slug));
  const destinations = rollup?.destinations ?? fallback.filter((c) => DEST_KINDS.includes(c.kind));
  const attractions = (rollup?.attractions ?? fallback.filter((c) => !DEST_KINDS.includes(c.kind) && c.kind !== "activity")).filter(notInline);
  const activities = rollup?.activities ?? fallback.filter((c) => c.kind === "activity");
  const itineraries = rollup?.itineraries ?? [];
  const guides = rollup?.guides ?? [];

  // States group destinations by their region; anything else sits under one heading.
  const groups = new Map<string, RollupPlace[]>();
  for (const d of destinations.filter((d) => d.kind !== "region")) {
    const key = d.parentKind === "region" && d.parentName ? d.parentName : "";
    groups.set(key, [...(groups.get(key) ?? []), d]);
  }
  const regionGroups = [...groups.entries()].sort((a, b) => (a[0] === "" ? 1 : b[0] === "" ? -1 : a[0].localeCompare(b[0])));

  const crumbs = [
    { label: "India", href: "/india" },
    ...(place.state && !isState ? [{ label: place.state.name, href: `/india/${place.state.slug}` }] : []),
    ...(place.parent && place.parent.kind !== "state" ? [{ label: place.parent.name, href: `/india/${stateSlug}/${place.parent.slug}` }] : []),
  ];

  const jsonLd: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": isDestination ? "TouristDestination" : "TouristAttraction",
      name: place.name,
      description: place.seoDescription,
      // Only real photographs describe the place in structured data; AI illustrations never do.
      ...(hero && hero.kind === "photo" ? { image: hero.url } : {}),
      ...(place.lat != null && place.lng != null ? { geo: { "@type": "GeoCoordinates", latitude: place.lat, longitude: place.lng } } : {}),
      ...(attractions.length || inline.length ? { includesAttraction: [...attractions.map((c) => c.name), ...inline.filter((c) => c.snapshot.place.kind !== "activity").map((c) => c.snapshot.place.name)].slice(0, 30).map((name) => ({ "@type": "TouristAttraction", name })) } : {}),
    },
  ];
  if (faqs?.body.items?.length) {
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.body.items.map((f) => ({ "@type": "Question", name: f.title, acceptedAnswer: { "@type": "Answer", text: f.body } })),
    });
  }

  const relatedHref = (r: Related) => (r.kind === "state" ? `/india/${r.slug}` : r.stateSlug ? `/india/${r.stateSlug}/${r.slug}` : null);
  const points = mapPoints([
    { name: place.name, lat: place.lat, lng: place.lng, primary: true },
    ...inline.map((c) => ({ name: c.snapshot.place.name, lat: c.snapshot.place.lat, lng: c.snapshot.place.lng, href: preview ? undefined : `#${c.slug}` })),
    ...[...destinations, ...attractions].map((c) => ({ name: c.name, lat: c.lat, lng: c.lng, href: hrefOf(c) ?? undefined })),
    ...related.map((r) => ({ name: r.name, lat: r.lat, lng: r.lng, href: preview ? undefined : (relatedHref(r) ?? undefined) })),
  ]);
  const booking = bookingLinksFor({ name: place.name, kind: place.kind, stateName: place.state?.name ?? null });

  const activityCards: ActivityCard[] = activities.map((a) => ({ slug: a.slug, name: a.name, summary: a.summary, category: a.category, where: a.parentName && a.parentName !== place.name ? a.parentName : null, href: hrefOf(a), hero: a.hero }));

  const planBlocks = [bestTime, howToReach, localTransport, whereToStay, budget, practical, culture, safety, accessibility, mistakes, tips].filter(Boolean);
  // Activities shown as sections of this page belong under "Things to do", not "Places".
  const inlinePlaces = inline.filter((c) => c.snapshot.place.kind !== "activity");
  const placesCount = attractions.length + inlinePlaces.length;

  const tabs = [
    { id: "overview", label: "Overview", show: true },
    { id: "visit", label: "Visiting", show: !!visitInfo && !isDestination },
    { id: "regions", label: "Regions", show: !!regions },
    { id: "destinations", label: "Destinations", show: destinations.filter((d) => d.kind !== "region").length > 0 },
    { id: "places", label: isState ? "Top places" : "Places to visit", show: placesCount > 0 },
    { id: "areas", label: "Areas", show: !!neighbourhoods },
    { id: "things", label: "Things to do", show: activities.length > 0 || !!thingsToDo },
    { id: "itineraries", label: "Itineraries", show: itineraries.length > 0 || !!itinerary },
    { id: "guides", label: "Travel guides", show: guides.length > 0 },
    { id: "food", label: "Food & shopping", show: !!(food || shopping) },
    { id: "plan", label: "Plan your trip", show: planBlocks.length > 0 },
    { id: "faqs", label: "FAQs", show: !!faqs },
    { id: "nearby", label: "Nearby", show: related.length > 0 },
  ].filter((t) => t.show);

  // Top strip: researched key facts when there are any, otherwise what the page itself knows.
  const strip: { label: string; value: string; status?: ItemStatus }[] = keyFacts?.body.items?.length
    ? keyFacts.body.items.slice(0, 4).map((i) => ({ label: i.title ?? "", value: i.body, status: i.status }))
    : [
        !isState && place.state ? { label: "State", value: place.state.name } : null,
        zone ? { label: "Region", value: zone === "Islands" ? "Island territories" : `${zone} India` } : null,
        { label: "Type", value: isActivity && place.category ? (categoryLabel(place.category) ?? kindLabel(place.kind)) : kindLabel(place.kind) },
        types.length ? { label: "Good for", value: types.map((t) => t.label).join(", ") } : null,
      ].filter((x): x is { label: string; value: string } => !!x);

  const counts = [
    { label: "Destinations", n: destinations.filter((d) => d.kind !== "region").length, href: "#destinations" },
    { label: "Places to visit", n: placesCount, href: "#places" },
    { label: "Things to do", n: activities.length, href: "#things" },
    { label: "Itineraries", n: itineraries.length, href: "#itineraries" },
    { label: "Travel guides", n: guides.length, href: "#guides" },
  ].filter((c) => c.n > 0);

  const plannerPrompt = isState ? `Plan a trip to ${place.name}` : `Plan a trip to ${place.name}, ${stateName}`;
  const parentHref = place.parent ? (place.parent.kind === "state" ? `/india/${place.parent.slug}` : `/india/${stateSlug}/${place.parent.slug}`) : null;

  return (
    <article className="@container bg-[#FBFAF7]">
      {preview ? null : <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}

      {/* Hero */}
      <header className={`relative overflow-hidden ${hero ? "min-h-[20rem] bg-ink text-white @3xl:min-h-[26rem]" : "bg-[#F1EEE7] text-ink"}`}>
        {hero ? (
          <>
            <Image src={hero.url} alt={hero.alt} fill priority sizes="100vw" className="animate-[heroZoom_18s_ease-out_forwards] object-cover motion-reduce:animate-none" />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/25" />
          </>
        ) : null}
        <div className={`container-site relative flex flex-col justify-end ${hero ? "min-h-[20rem] pb-16 pt-6 @3xl:min-h-[26rem]" : "py-10 pb-16"}`}>
          <nav aria-label="Breadcrumb" className={`absolute top-5 text-sm ${hero ? "text-white/90" : "text-muted"}`}>
            <ol className="flex flex-wrap items-center gap-1.5">
              {crumbs.map((c, i) => (
                <li key={c.label} className="flex items-center gap-1.5">
                  {i > 0 ? <span aria-hidden>›</span> : <Icon name="arrowLeft" size={14} />}
                  {link(c.href) ? <Link href={c.href} className="hover:underline">{c.label}</Link> : c.label}
                </li>
              ))}
              <li className="flex items-center gap-1.5" aria-current="page"><span aria-hidden>›</span>{place.name}</li>
            </ol>
          </nav>
          <div className={hero ? "mt-14" : "mt-8"}>
            <span className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-semibold uppercase tracking-wider ${hero ? "bg-white text-ink" : "bg-white text-ink"}`}>
              {kindLabel(place.kind)}{!isState && place.parent ? ` · ${place.parent.name}` : zone && isState ? ` · ${zone === "Islands" ? "Islands" : `${zone} India`}` : ""}
            </span>
            <h1 className="mt-3 font-serif text-[clamp(2rem,5cqi,3.25rem)] font-medium leading-[1.08]">{place.name}</h1>
            {place.summary ? <p className={`mt-2.5 max-w-2xl text-[0.9375rem] leading-relaxed @3xl:text-base ${hero ? "text-white/90" : "text-muted"}`}>{place.summary}</p> : null}
            {types.length ? (
              <ul className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
                {types.map((t) => <li key={t.key} className={`rounded-full border px-3 py-1 backdrop-blur-sm ${hero ? "border-white/50 bg-white/10" : "border-line bg-white"}`}>{t.label}</li>)}
              </ul>
            ) : null}
          </div>
          {hero ? (
            <div className="mt-6 @3xl:absolute @3xl:bottom-4 @3xl:right-6 @3xl:mt-0 @3xl:max-w-lg @3xl:text-right">
              {hero.kind === "ai_generated" ? <span className="mb-1 inline-block rounded bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">AI-generated illustration</span> : null}
              <Credit img={hero} onDark />
            </div>
          ) : null}
        </div>
      </header>

      {/* Key facts strip */}
      {strip.length ? (
        <div className="container-site relative -mt-9">
          <dl className="grid overflow-hidden rounded-2xl border border-line bg-white shadow-card @xl:grid-cols-2 @4xl:grid-cols-4">
            {strip.map((f) => (
              <div key={f.label} className="flex flex-col gap-1 border-b border-line-subtle px-5 py-3.5 transition-colors hover:bg-[#FBFAF7] @4xl:border-b-0 @4xl:border-r">
                <dt className="text-[0.6875rem] font-semibold uppercase tracking-wider text-[#666]">{f.label}</dt>
                <dd className="text-[0.9375rem] font-semibold leading-snug text-ink">{f.value}</dd>
                {f.status ? <dd><StatusPill status={f.status} /></dd> : null}
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      <div className="mt-6"><SectionTabs tabs={tabs.map(({ id, label }) => ({ id, label }))} /></div>
      {sample ? (
        <p className="border-b border-dashed border-line bg-[#F1EEE7] px-4 py-2 text-center text-xs text-muted">
          <strong className="font-semibold text-ink">Sample content</strong> for design work — this guide hasn’t been researched or reviewed yet.
        </p>
      ) : null}

      <div className="container-site space-y-12 py-8 @5xl:py-10">
        {/* Overview + side panel */}
        <section id="overview" aria-labelledby="overview-h" className="grid scroll-mt-20 gap-10 @5xl:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="min-w-0 space-y-6">
            <h2 id="overview-h" className="font-serif text-[1.375rem] font-medium text-ink @3xl:text-[1.625rem]">About {place.name}</h2>
            {overview ? <ReadMore lines={9}><TextBody s={overview} /></ReadMore> : place.summary ? <p className="text-[0.9375rem] leading-relaxed text-[#444]">{place.summary}</p> : null}
            {highlights ? (
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Highlights</h3>
                <HighlightCards s={highlights} />
              </div>
            ) : null}
            {whoFor ? (
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Who it suits</h3>
                <Tabs label="Who it suits" tabs={(whoFor.body.items ?? []).map((it, i) => ({ id: `w${i}`, label: it.title ?? "", content: <p className="rounded-2xl border border-line bg-white p-4 text-sm leading-relaxed text-[#444]">{it.body}</p> }))} />
              </div>
            ) : null}
          </div>
          <aside className="min-w-0 space-y-5 @5xl:sticky @5xl:top-20 @5xl:self-start">
            {visitInfo && !isDestination ? (
              <section id="visit" aria-labelledby="visit-h" className="scroll-mt-20 rounded-2xl border border-line bg-white p-5 shadow-card">
                <h2 id="visit-h" className="font-serif text-lg font-medium text-ink">Plan your visit</h2>
                <dl className="mt-3 divide-y divide-line-subtle text-sm">
                  {(visitInfo.body.items ?? []).map((it, i) => (
                    <div key={i} className="flex flex-col gap-1 py-3">
                      <dt className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wider text-[#666]">{it.title}<StatusPill status={it.status} /></dt>
                      <dd className="leading-relaxed text-ink">{it.body}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}
            {place.parent && parentHref ? (
              <Link href={link(parentHref) ?? "#"} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 transition hover:-translate-y-0.5 hover:border-coral hover:shadow-card">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-coral/10 text-coral"><Icon name="map" size={20} /></span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-[#666]">Part of</span>
                  <span className="block font-serif text-base font-medium text-ink">{place.parent.name}</span>
                  <span className="text-xs font-semibold text-[#B9442B]">See everything in {place.parent.name} ›</span>
                </span>
              </Link>
            ) : null}
            {counts.length ? (
              <div className="rounded-2xl border border-line bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#666]">In {place.name} on VacayOut</p>
                <ul className="mt-2 divide-y divide-line-subtle">
                  {counts.map((c) => (
                    <li key={c.label}>
                      <a href={c.href} className="group flex items-center justify-between py-2 text-sm text-ink hover:text-coral">
                        <span className="flex items-center gap-1.5">{c.label}<Icon name="arrowRight" size={13} className="opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" /></span><span className="rounded-full bg-[#F3F0EA] px-2.5 py-0.5 text-[0.8125rem] font-semibold group-hover:bg-coral group-hover:text-white">{c.n}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {points.length ? (
              <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
                <PlaceMap points={points} height={240} label={`Map of ${place.name}${points.length > 1 ? " and places inside it" : ""}`} />
              </div>
            ) : null}
          </aside>
        </section>

        {regions ? <Block id="regions" title={`Regions of ${place.name}`}><Accordion items={(regions.body.items ?? []).map((it) => ({ title: it.title ?? "", body: it.body }))} /></Block> : null}

        {regionGroups.length ? (
          <Block id="destinations" title="Destinations" intro={isState ? "Towns and bases, grouped by region." : undefined}>
            <div className="space-y-8">
              {regionGroups.map(([region, list]) => (
                <div key={region || "all"}>
                  {region ? <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#2D5A3F]">{region}</h3> : regionGroups.length > 1 ? <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#666]">Other destinations</h3> : null}
                  <Rail label={region || "Destinations"}>
                    {list.map((d) => <PlaceCard key={d.slug} p={d} href={childHref(d.slug)} meta={`${kindLabel(d.kind)}${d.parentName && d.parentKind !== "state" && d.parentKind !== "region" ? ` · near ${d.parentName}` : ""}`} />)}
                  </Rail>
                </div>
              ))}
            </div>
          </Block>
        ) : null}

        {placesCount ? (
          <Block id="places" title={isState ? `Top places in ${place.name}` : `Places to visit in ${place.name}`}>
            <FilterGrid
              items={[
                ...attractions.map((a) => ({ key: a.slug, group: kindLabel(a.kind), node: <PlaceCard p={a} href={hrefOf(a)} meta={`${kindLabel(a.kind)}${a.parentName && a.parentName !== place.name ? ` · ${a.parentName}` : ""}`} /> })),
                ...inlinePlaces.map((c) => ({ key: c.slug, group: kindLabel(c.snapshot.place.kind), node: <PlaceCard p={{ name: c.snapshot.place.name, summary: c.snapshot.place.summary, hero: c.snapshot.place.hero }} href={preview ? null : `#${c.slug}`} meta={kindLabel(c.snapshot.place.kind)} /> })),
              ]}
            />
          </Block>
        ) : null}

        {neighbourhoods ? (
          <Block id="areas" title={`Areas of ${place.name}`}>
            <Tabs label="Areas" tabs={(neighbourhoods.body.items ?? []).map((it, i) => ({ id: `a${i}`, label: it.title ?? "", content: <div className="flex gap-3 rounded-2xl border border-line bg-white p-5"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-coral/10 text-coral"><Icon name="pin" size={16} /></span><p className="text-sm leading-relaxed text-[#444]">{it.body}</p></div> }))} />
          </Block>
        ) : null}

        {activities.length || thingsToDo ? (
          <Block id="things" title={`Things to do${isActivity ? " here" : ` in ${place.name}`}`}>
            <div className="space-y-6">
              {activities.length ? <ActivityGrid items={activityCards} /> : null}
              {thingsToDo && !activities.length ? <CheckList s={thingsToDo} columns /> : null}
            </div>
          </Block>
        ) : null}

        {itineraries.length || itinerary ? (
          <Block id="itineraries" title="Itineraries" intro={itineraries.length ? `Ready-made plans with a stop in ${place.name}.` : undefined}>
            <div className="space-y-6">
              {itineraries.length ? (
                <Rail label="Itineraries">
                  {itineraries.map((it) => {
                    const inner = (
                      <>
                        <span className="relative block aspect-[16/9] overflow-hidden bg-sand">
                          {it.hero ? <Image src={it.hero.url} alt="" fill sizes="360px" className="object-cover transition-transform duration-500 group-hover:scale-105" /> : null}
                          <span className="absolute left-2.5 top-2.5 rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-ink shadow-sm">{it.durationDays} day{it.durationDays === 1 ? "" : "s"}</span>
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-1 p-4">
                          <span className="text-[0.6875rem] font-semibold uppercase tracking-wider text-[#777]">Starts in {it.placeName}</span>
                          <span className="font-serif text-lg font-medium leading-snug text-ink group-hover:text-coral">{it.title}</span>
                          <span className="line-clamp-2 text-[0.8125rem] leading-relaxed text-[#555]">{it.summary}</span>
                          {it.stopNames.length ? (
                            <span className="mt-auto flex flex-wrap gap-1 pt-2">
                              {it.stopNames.map((n) => <span key={n} className="rounded-full bg-[#EEF4F0] px-2 py-0.5 text-[0.6875rem] font-medium text-[#2D5A3F]">{n}</span>)}
                            </span>
                          ) : null}
                        </span>
                      </>
                    );
                    return preview ? (
                      <div key={it.slug} className="flex w-full flex-col overflow-hidden rounded-2xl border border-line bg-white">{inner}</div>
                    ) : (
                      <Link key={it.slug} href={`/itineraries/${it.slug}`} className="group flex w-full flex-col overflow-hidden rounded-2xl border border-line bg-white transition duration-300 hover:-translate-y-1 hover:shadow-card-hover">{inner}</Link>
                    );
                  })}
                </Rail>
              ) : null}
              {itinerary ? (
                <div className="rounded-2xl border border-line bg-white p-5 @xl:p-6">
                  <p className="mb-5 flex items-center gap-2 font-semibold text-ink"><Icon name="route" size={18} className="text-coral" /> Suggested plan: {(itinerary.body.items ?? []).length} day{(itinerary.body.items ?? []).length === 1 ? "" : "s"}</p>
                  <DaysTimeline s={itinerary} />
                </div>
              ) : null}
            </div>
          </Block>
        ) : null}

        {guides.length ? (
          <Block id="guides" title="Travel guides">
            <Rail label="Travel guides">
              {guides.map((g) => <PlaceCard key={g.slug} p={{ name: g.title, summary: g.summary, hero: g.hero }} href={link(`/travel-guides/${g.slug}`)} meta={g.placeNames.slice(0, 3).join(" · ") || "Guide"} />)}
            </Rail>
          </Block>
        ) : null}

        {food || shopping ? (
          <Block id="food" title="Food and shopping">
            <Tabs
              label="Food and shopping"
              tabs={[
                ...(food ? [{ id: "food", label: "Food to try", content: <div className="rounded-2xl border border-line bg-white p-5"><CheckList s={food} columns /></div> }] : []),
                ...(shopping ? [{ id: "shop", label: "Shopping and markets", content: <div className="rounded-2xl border border-line bg-white p-5"><CheckList s={shopping} columns /></div> }] : []),
              ]}
            />
          </Block>
        ) : null}

        {planBlocks.length ? (
          <Block id="plan" title="Plan your trip">
            <Tabs
              variant="underline"
              label="Plan your trip"
              tabs={[
                bestTime ? { id: "best", label: "Best time", content: <Panel icon="calendar"><TextBody s={bestTime} /></Panel> } : null,
                howToReach ? { id: "reach", label: "Getting there", content: <Panel icon="route"><TextBody s={howToReach} /></Panel> } : null,
                localTransport ? { id: "around", label: "Getting around", content: <Panel icon="car"><TextBody s={localTransport} /></Panel> } : null,
                whereToStay ? { id: "stay", label: "Where to stay", content: <Panel icon="pin"><TextBody s={whereToStay} /></Panel> } : null,
                budget ? { id: "budget", label: "Budget", content: <BudgetTable s={budget} /> } : null,
                practical ? { id: "practical", label: "Practical info", content: <PairsList s={practical} /> } : null,
                safety ? { id: "safety", label: "Safety", content: <PairsList s={safety} /> } : null,
                accessibility ? { id: "access", label: "Accessibility", content: <PairsList s={accessibility} /> } : null,
                culture ? { id: "culture", label: "Etiquette", content: <Panel icon="heart"><CheckList s={culture} /></Panel> } : null,
                mistakes ? { id: "mistakes", label: "Mistakes to avoid", content: <Panel icon="bulb"><CheckList s={mistakes} columns /></Panel> } : null,
                tips ? { id: "tips", label: "Tips", content: <Panel icon="sparkles"><CheckList s={tips} columns /></Panel> } : null,
              ].filter((t) => t !== null)}
            />
            <div className="mt-6 space-y-8">
              {booking.length && !preview ? (
                <div className="rounded-2xl border border-line bg-white p-5">
                  <p className="font-semibold text-ink">Search and book</p>
                  <ul className="mt-3 grid gap-1 @xl:grid-cols-2">
                    {booking.map((b) => (
                      <li key={b.href}>
                        <a href={b.href} target="_blank" rel="sponsored nofollow noopener noreferrer" className="group flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-[#F7F5F0]">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-coral/10 text-coral"><Icon name={b.icon as Name} size={17} /></span>
                          <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-ink">{b.label}</span><span className="text-xs text-muted">{b.provider}</span></span>
                          <span className="text-xs font-semibold text-coral group-hover:underline">Search ↗</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-muted">Opens each provider’s own search. We don’t check prices or availability.{affiliateActive() ? " VacayOut may earn a commission on some bookings, at no extra cost to you." : ""}</p>
                </div>
              ) : null}
            </div>
          </Block>
        ) : null}

        {faqs ? <Block id="faqs" title="Frequently asked questions"><FaqList s={faqs} /></Block> : null}

        {related.length ? (
          <Block id="nearby" title="Nearby and day trips">
            <ul className="grid gap-3 @xl:grid-cols-2 @4xl:grid-cols-3">
              {related.map((r) => {
                const to = link(relatedHref(r));
                const inner = (
                  <>
                    <span className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-sand">
                      {r.hero && r.hero.kind === "photo" ? <Image src={r.hero.url} alt="" fill sizes="80px" className="object-cover" /> : <span className="flex size-full items-center justify-center text-muted/50"><Icon name="mountain" size={20} /></span>}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold uppercase tracking-wider text-[#666]">{r.type === "day_trip" ? "Day trip" : "Nearby"} · {kindLabel(r.kind)}</span>
                      <span className="block truncate font-semibold text-ink">{r.name}</span>
                      {r.summary ? <span className="line-clamp-2 text-xs text-muted">{r.summary}</span> : null}
                    </span>
                  </>
                );
                return (
                  <li key={`${r.slug}-${r.type}`}>
                    {to ? <Link href={to} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3 hover:border-coral">{inner}</Link> : <div className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3">{inner}</div>}
                  </li>
                );
              })}
            </ul>
          </Block>
        ) : null}

        {inline.length ? (
          <Block id="more-places" title={`More about places in ${place.name}`}>
            <Accordion
              defaultOpen={-1}
              items={inline.map((c) => ({
                title: c.snapshot.place.name,
                badge: <span className="text-xs font-normal text-[#888]">{kindLabel(c.snapshot.place.kind)}</span>,
                body: (
                  <div id={c.slug} className="scroll-mt-24 space-y-3">
                    {c.snapshot.place.summary ? <p className="text-[#666]">{c.snapshot.place.summary}</p> : null}
                    {c.snapshot.sections.map((sec) => <SectionBody key={sec.key} s={sec} />)}
                  </div>
                ),
              }))}
            />
          </Block>
        ) : null}

        {preview ? null : (
          <section aria-labelledby="ask-h" className="overflow-hidden rounded-2xl border border-line bg-[#F1EEE7]">
            <div className="grid items-center @3xl:grid-cols-[16rem_1fr]">
              {hero && hero.kind === "photo" ? (
                <div className="relative hidden h-full min-h-44 @3xl:block">
                  <Image src={hero.url} alt="" fill sizes="16rem" className="object-cover" />
                </div>
              ) : null}
              <div className={`p-6 @xl:p-8 ${hero && hero.kind === "photo" ? "" : "@3xl:col-span-2"}`}>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#B9442B]">Plan your {place.name} trip</p>
                <h2 id="ask-h" className="mt-1 font-serif text-2xl font-medium text-ink">Ask our AI travel assistant</h2>
                <p className="mt-2 max-w-lg text-[0.9375rem] leading-relaxed text-muted">Get a day-by-day plan, how to get there and what to see. It answers from this guide first and shows the source for anything it looks up.</p>
                <Link href={routes.chatWithPrompt(plannerPrompt)} className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-black">
                  Start chatting <Icon name="arrowRight" size={15} />
                </Link>
              </div>
            </div>
          </section>
        )}
      </div>
    </article>
  );
}
