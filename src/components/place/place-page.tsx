import Image from "next/image";
import Link from "next/link";
import { Icon, type Name } from "@/components/icons/icon";
import type { PublishedSnapshot, SnapshotImage } from "@/lib/db/schema";
import { routes } from "@/lib/routes";
import { mapPoints } from "@/lib/map";
import { affiliateActive, bookingLinksFor } from "@/lib/booking/links";
import { kindLabel } from "@/lib/places/kinds";
import { zoneOf } from "@/lib/places/states";
import { TRIP_TYPES } from "@/lib/places/trip-types";
import { PlaceMap } from "@/components/map/place-map";
import { BudgetTable, CheckList, DaysTimeline, FaqList, HighlightCards, SectionBody, TextBody } from "./section-body";
import { SectionTabs } from "./section-tabs";
import { PlacesExplorer, type ExplorerPlace } from "./places-explorer";

type Child = { name: string; slug: string; kind: string; summary: string | null; lat?: number | null; lng?: number | null; hero?: SnapshotImage | null; tripTypes?: string[] };
type Inline = { slug: string; snapshot: PublishedSnapshot };
type Related = { name: string; slug: string; kind: string; summary: string | null; type: "nearby" | "day_trip"; stateSlug: string | null; lat?: number | null; lng?: number | null; hero?: SnapshotImage | null };
type Section = PublishedSnapshot["sections"][number];

const ext = { target: "_blank", rel: "nofollow noopener noreferrer" } as const;

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

function sourcesOf(sections: Section[]) {
  const seen = new Map<string, { url: string; title: string | null; site: string }>();
  for (const s of sections) for (const src of s.sources ?? []) if (/^https?:\/\//.test(src.url) && !seen.has(src.url)) seen.set(src.url, src);
  return [...seen.values()];
}

function Block({ id, title, children, className = "" }: { id: string; title: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className={`scroll-mt-20 ${className}`}>
      <h2 id={`${id}-h`} className="mb-5 font-serif text-[1.75rem] font-medium leading-tight text-ink">{title}</h2>
      {children}
    </section>
  );
}

function SideCard({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-h` : undefined} className="rounded-2xl border border-line bg-white p-5 shadow-card">
      <h2 id={id ? `${id}-h` : undefined} className="font-serif text-xl font-medium text-ink">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/**
 * A published (or preview) destination page. Every word comes from approved
 * sections or published places; blocks without data are simply left out.
 * React escapes all text; no HTML is ever injected.
 */
export function PlacePage({
  snapshot,
  items,
  inline = [],
  related = [],
  stateSlug,
  tripTypes = [],
  preview = false,
  sample = false,
}: {
  snapshot: PublishedSnapshot;
  items: Child[];
  inline?: Inline[];
  related?: Related[];
  stateSlug: string;
  tripTypes?: string[];
  preview?: boolean;
  /** Design-time sample content: shows a notice; never comes from the database. */
  sample?: boolean;
}) {
  const { place, sections } = snapshot;
  const sec = (key: string) => sections.find((s) => s.key === key && ((s.body.items ?? []).length || s.body.text?.trim()));
  const overview = sec("overview");
  const highlights = sec("highlights");
  const thingsToDo = sec("things_to_do");
  const bestTime = sec("best_time");
  const howToReach = sec("how_to_reach");
  const localTransport = sec("local_transport");
  const tips = sec("travel_tips");
  const faqs = sec("faqs");
  const itinerary = sec("itinerary");
  const budget = sec("budget");

  const isState = place.kind === "state";
  const isDestination = ["state", "region", "city", "town"].includes(place.kind);
  const stateName = isState ? place.name : (place.state?.name ?? "");
  const zone = zoneOf(stateName);
  const types = TRIP_TYPES.filter((t) => tripTypes.includes(t.key));
  const hero = place.hero;
  const link = (href: string | null) => (preview ? null : href);

  const crumbs = [
    { label: "India", href: "/india" },
    ...(place.state && !isState ? [{ label: place.state.name, href: `/india/${place.state.slug}` }] : []),
    ...(place.parent ? [{ label: place.parent.name, href: `/india/${stateSlug}/${place.parent.slug}` }] : []),
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
      ...(inline.length ? { includesAttraction: inline.map((c) => ({ "@type": "TouristAttraction", name: c.snapshot.place.name })) } : {}),
    },
  ];
  if (faqs?.body.items?.length) {
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.body.items.map((f) => ({ "@type": "Question", name: f.title, acceptedAnswer: { "@type": "Answer", text: f.body } })),
    });
  }

  const childHref = (slug: string) => `/india/${stateSlug}/${slug}`;
  const relatedHref = (r: Related) => (r.kind === "state" ? `/india/${r.slug}` : r.stateSlug ? `/india/${r.stateSlug}/${r.slug}` : null);
  const points = mapPoints([
    { name: place.name, lat: place.lat, lng: place.lng, primary: true },
    ...inline.map((c) => ({ name: c.snapshot.place.name, lat: c.snapshot.place.lat, lng: c.snapshot.place.lng, href: preview ? undefined : `#${c.slug}` })),
    ...items.map((c) => ({ name: c.name, lat: c.lat, lng: c.lng, href: preview ? undefined : childHref(c.slug) })),
    ...related.map((r) => ({ name: r.name, lat: r.lat, lng: r.lng, href: preview ? undefined : (relatedHref(r) ?? undefined) })),
  ]);
  const booking = bookingLinksFor({ name: place.name, kind: place.kind, stateName: place.state?.name ?? null });
  const sources = sourcesOf([...sections, ...inline.flatMap((c) => c.snapshot.sections)]);

  const explorer: ExplorerPlace[] = [
    ...items.map((c) => ({ name: c.name, slug: c.slug, kind: c.kind, kindLabel: kindLabel(c.kind), href: link(childHref(c.slug)), hero: c.hero ?? null, tripTypes: c.tripTypes ?? [] })),
    ...inline.map((c) => ({ name: c.snapshot.place.name, slug: c.slug, kind: c.snapshot.place.kind, kindLabel: kindLabel(c.snapshot.place.kind), href: preview ? null : `#${c.slug}`, hero: c.snapshot.place.hero, tripTypes: [] })),
  ];
  const placeCount = explorer.length;

  const tabs = [
    { id: "overview", label: "Overview", show: true },
    { id: "places", label: isState ? `Destinations (${placeCount})` : `Places to visit (${placeCount})`, show: placeCount > 0 },
    { id: "s-things_to_do", label: "Things to do", show: !!thingsToDo },
    { id: "s-itinerary", label: "Itinerary", show: !!itinerary },
    { id: "s-best_time", label: "Best time", show: !!bestTime },
    { id: "s-how_to_reach", label: howToReach ? "How to reach" : "Getting around", show: !!(howToReach || localTransport) },
    { id: "s-budget", label: "Budget", show: !!budget },
    { id: "s-faqs", label: "FAQs", show: !!faqs },
    { id: "sources", label: "Sources", show: sources.length > 0 },
  ].filter((t) => t.show);

  const quickFacts = [
    !isState && place.state ? { icon: "pin", label: "State", value: place.state.name } : null,
    zone ? { icon: "map", label: "Region", value: zone === "Islands" ? "Island territories" : `${zone} India` } : null,
    { icon: "compass", label: "Type", value: kindLabel(place.kind) },
    types.length ? { icon: "heart", label: "Good for", value: types.map((t) => t.label).join(", ") } : null,
    placeCount ? { icon: "grid", label: isState ? "Destinations" : "Places inside", value: `${placeCount} with a guide` } : null,
  ].filter((x): x is { icon: string; label: string; value: string } => !!x);

  const plannerPrompt = isState ? `Plan a trip to ${place.name}` : `Plan a trip to ${place.name}, ${stateName}`;

  return (
    <article className="@container bg-[#FBFAF7]">
      {preview ? null : <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}

      {/* Hero */}
      <header className={`relative overflow-hidden ${hero ? "min-h-[22rem] bg-ink text-white @3xl:min-h-[26rem]" : "bg-[#F1EEE7] text-ink"}`}>
        {hero ? (
          <>
            <Image src={hero.url} alt={hero.alt} fill priority sizes="100vw" className="object-cover" />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/25" />
          </>
        ) : null}
        <div className={`container-site relative flex flex-col justify-end ${hero ? "min-h-[22rem] pb-8 pt-6 @3xl:min-h-[26rem] @3xl:pb-10" : "py-10"}`}>
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
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${hero ? "bg-white/15 text-white backdrop-blur-md" : "bg-white text-ink"}`}>
              <Icon name="pin" size={12} /> {kindLabel(place.kind)}
            </span>
            <h1 className="mt-3 font-serif text-[clamp(2.25rem,6cqi,4.25rem)] font-medium leading-[1.05]">{place.name}</h1>
            {place.summary ? <p className={`mt-3 max-w-2xl text-[1.0625rem] leading-relaxed @3xl:text-lg ${hero ? "text-white/90" : "text-muted"}`}>{place.summary}</p> : null}
            <ul className={`mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium ${hero ? "text-white/95" : "text-ink"}`}>
              <li className="flex items-center gap-1.5"><Icon name="pin" size={16} /> {isState ? (zone ? (zone === "Islands" ? "India" : `${zone} India`) : "India") : stateName}</li>
              {types.length ? <li className="flex items-center gap-1.5"><Icon name="mountain" size={16} /> {types.map((t) => t.label).join(", ")}</li> : null}
            </ul>
          </div>
          {hero ? (
            <div className="mt-6 @3xl:absolute @3xl:bottom-4 @3xl:right-6 @3xl:mt-0 @3xl:max-w-lg @3xl:text-right">
              {hero.kind === "ai_generated" ? <span className="mb-1 inline-block rounded bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">AI-generated illustration</span> : null}
              <Credit img={hero} onDark />
            </div>
          ) : null}
        </div>
      </header>

      <SectionTabs tabs={tabs.map(({ id, label }) => ({ id, label }))} />
      {sample ? (
        <p className="border-b border-dashed border-line bg-[#F1EEE7] px-4 py-2 text-center text-xs text-muted">
          <strong className="font-semibold text-ink">Sample content</strong> for design work — this guide hasn’t been researched or reviewed yet.
        </p>
      ) : null}

      <div className="container-site grid gap-10 py-10 @5xl:grid-cols-[minmax(0,1fr)_21rem] @5xl:gap-12 @5xl:py-12">
        {/* Main column */}
        <div className="min-w-0 space-y-14">
          <section id="overview" aria-labelledby="overview-h" className="scroll-mt-20 space-y-6">
            <h2 id="overview-h" className="font-serif text-[1.75rem] font-medium text-ink">{isState ? `About ${place.name}` : "Overview"}</h2>
            <div id="s-overview" className="scroll-mt-20">{overview ? <TextBody s={overview} /> : place.summary ? <p className="text-[1.0625rem] leading-relaxed text-[#444]">{place.summary}</p> : null}</div>
            {highlights ? (
              <div id="s-highlights" className="scroll-mt-20">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Highlights</h3>
                <HighlightCards s={highlights} />
              </div>
            ) : null}
          </section>

          {placeCount ? (
            <section id="places" aria-label={isState ? "Destinations" : "Places to visit"} className="scroll-mt-20">
              <PlacesExplorer title={isState ? `Popular destinations in ${place.name}` : `Top places to visit`} stateName={stateName} places={explorer} />
            </section>
          ) : null}

          {thingsToDo ? <Block id="s-things_to_do" title="Things to do"><CheckList s={thingsToDo} columns /></Block> : null}

          {itinerary ? (
            <Block id="s-itinerary" title="Suggested itinerary">
              <div className="rounded-2xl border border-line bg-white p-5 @xl:p-6">
                <p className="mb-5 flex items-center gap-2 font-semibold text-ink">
                  <Icon name="route" size={18} className="text-coral" />
                  {(itinerary.body.items ?? []).length} day{(itinerary.body.items ?? []).length === 1 ? "" : "s"} in {place.name}
                </p>
                <DaysTimeline s={itinerary} />
                {preview ? null : (
                  <Link href={routes.chatWithPrompt(`Customise the ${(itinerary.body.items ?? []).length}-day ${place.name} itinerary from the VacayOut guide for me`)} className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-coral/10 px-4 py-2 text-sm font-semibold text-coral hover:bg-coral hover:text-white">
                    <Icon name="sparkles" size={14} /> Customise with AI
                  </Link>
                )}
              </div>
            </Block>
          ) : null}

          {bestTime ? <Block id="s-best_time" title="Best time to visit"><div className="rounded-2xl border border-line bg-white p-5 @xl:p-6"><TextBody s={bestTime} /></div></Block> : null}

          {howToReach || localTransport ? (
            <Block id="s-how_to_reach" title={howToReach ? "How to reach" : "Getting around"}>
              <div className={`grid gap-4 ${howToReach && localTransport ? "@3xl:grid-cols-2" : ""}`}>
                {howToReach ? (
                  <div className="rounded-2xl border border-line bg-white p-5">
                    <p className="mb-3 flex items-center gap-2 font-semibold text-ink"><Icon name="route" size={18} className="text-coral" /> Getting there</p>
                    <TextBody s={howToReach} />
                  </div>
                ) : null}
                {localTransport ? (
                  <div id="s-local_transport" className="scroll-mt-20 rounded-2xl border border-line bg-white p-5">
                    <p className="mb-3 flex items-center gap-2 font-semibold text-ink"><Icon name="car" size={18} className="text-coral" /> Getting around</p>
                    <TextBody s={localTransport} />
                  </div>
                ) : null}
              </div>
            </Block>
          ) : null}

          {budget ? <Block id="s-budget" title="Budget estimate"><BudgetTable s={budget} /></Block> : null}

          {inline.length ? (
            <Block id="more-places" title={`More about places in ${place.name}`}>
              <div className="space-y-6">
                {inline.map((c) => (
                  <div key={c.slug} id={c.slug} className="scroll-mt-20 rounded-2xl border border-line bg-white p-5 @xl:p-6">
                    <h3 className="font-serif text-xl font-medium">{c.snapshot.place.name}</h3>
                    {c.snapshot.place.summary ? <p className="mt-1 text-muted">{c.snapshot.place.summary}</p> : null}
                    <div className="mt-4 space-y-5">
                      {c.snapshot.sections.map((s) => (
                        <div key={s.key}>
                          <h4 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">{s.key === "overview" ? "About" : s.key.replace(/_/g, " ")}</h4>
                          <SectionBody s={s} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Block>
          ) : null}

          {faqs ? <Block id="s-faqs" title="Frequently asked questions"><FaqList s={faqs} /></Block> : null}

          {preview ? null : (
            <section aria-labelledby="ask-h" className="overflow-hidden rounded-2xl border border-line bg-[#F1EEE7]">
              <div className="grid items-center @3xl:grid-cols-[16rem_1fr]">
                {hero && hero.kind === "photo" ? (
                  <div className="relative hidden h-full min-h-44 @3xl:block">
                    <Image src={hero.url} alt="" fill sizes="16rem" className="object-cover" />
                  </div>
                ) : null}
                <div className={`p-6 @xl:p-8 ${hero && hero.kind === "photo" ? "" : "@3xl:col-span-2"}`}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-coral">Plan your {place.name} trip</p>
                  <h2 id="ask-h" className="mt-1 font-serif text-2xl font-medium text-ink">Ask our AI travel assistant</h2>
                  <p className="mt-2 max-w-lg text-[0.9375rem] leading-relaxed text-muted">Get a day-by-day plan, how to get there and what to see. It answers from this guide first and shows the source for anything it looks up.</p>
                  <Link href={routes.chatWithPrompt(plannerPrompt)} className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-black">
                    Start chatting <Icon name="arrowRight" size={15} />
                  </Link>
                </div>
              </div>
            </section>
          )}

          {sources.length ? (
            <Block id="sources" title="Sources">
              <p className="-mt-3 mb-4 text-sm text-muted">Facts on this page were checked against these pages when we wrote it.</p>
              <ul className="grid gap-2 @3xl:grid-cols-2">
                {sources.map((src) => (
                  <li key={src.url} className="rounded-xl border border-line bg-white px-4 py-3 text-sm">
                    <a href={src.url} {...ext} className="font-medium text-ink underline-offset-2 hover:underline">{src.title || src.site}</a>
                    <span className="block text-xs text-muted">{src.site}</span>
                  </li>
                ))}
              </ul>
            </Block>
          ) : null}
        </div>

        {/* Sidebar */}
        <aside className="min-w-0 space-y-5 @5xl:sticky @5xl:top-20 @5xl:self-start">
          {points.length ? (
            <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
              <PlaceMap points={points} height={240} label={`Map of ${place.name}${points.length > 1 ? " and nearby places" : ""}`} />
            </div>
          ) : null}

          <SideCard title="Quick facts">
            <dl className="divide-y divide-line text-sm">
              {quickFacts.map((f) => (
                <div key={f.label} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                  <dt className="flex w-32 shrink-0 items-center gap-2 text-muted"><Icon name={f.icon as Name} size={16} className="text-coral" /> {f.label}</dt>
                  <dd className="font-medium text-ink">{f.value}</dd>
                </div>
              ))}
            </dl>
          </SideCard>

          {booking.length ? (
            <SideCard title="Plan & book">
              <ul className="space-y-1">
                {booking.map((b) => (
                  <li key={b.href}>
                    <a href={b.href} target="_blank" rel="sponsored nofollow noopener noreferrer" className="group flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-[#F7F5F0]">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-coral/10 text-coral"><Icon name={b.icon} size={17} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-ink">{b.label}</span>
                        <span className="text-xs text-muted">{b.provider}</span>
                      </span>
                      <span className="text-xs font-semibold text-coral group-hover:underline">Search ↗</span>
                    </a>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted">Opens each provider’s own search. We don’t check prices or availability.</p>
              {affiliateActive() ? <p className="mt-3 rounded-lg bg-[#F7F5F0] px-3 py-2 text-xs text-muted">VacayOut may earn a commission if you book through some of these links, at no extra cost to you.</p> : null}
            </SideCard>
          ) : null}

          {tips ? (
            <SideCard title="Travel tips" id="s-travel_tips">
              <CheckList s={tips} />
            </SideCard>
          ) : null}

          {related.length ? (
            <SideCard title="Nearby and day trips">
              <ul className="space-y-1">
                {related.map((r) => {
                  const to = link(relatedHref(r));
                  const inner = (
                    <>
                      <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-sand">
                        {r.hero && r.hero.kind === "photo" ? <Image src={r.hero.url} alt="" fill sizes="48px" className="object-cover" /> : <span className="flex size-full items-center justify-center text-muted/50"><Icon name="mountain" size={18} /></span>}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink">{r.name}</span>
                        <span className="text-xs text-muted">{r.type === "day_trip" ? "Day trip" : "Nearby"} · {kindLabel(r.kind)}</span>
                      </span>
                      {to ? <Icon name="arrowRight" size={15} className="text-muted" /> : null}
                    </>
                  );
                  return (
                    <li key={`${r.slug}-${r.type}`}>
                      {to ? <Link href={to} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-[#F7F5F0]">{inner}</Link> : <div className="flex items-center gap-3 px-2 py-2">{inner}</div>}
                    </li>
                  );
                })}
              </ul>
            </SideCard>
          ) : null}

          {sources.length ? (
            <SideCard title="Sources">
              <p className="text-sm leading-relaxed text-muted">Facts on this page were checked against {sources.length} source page{sources.length === 1 ? "" : "s"}, and an editor approved each section before publishing.</p>
              <a href="#sources" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-coral hover:underline">View all sources <Icon name="arrowRight" size={14} /></a>
            </SideCard>
          ) : null}
        </aside>
      </div>
    </article>
  );
}
