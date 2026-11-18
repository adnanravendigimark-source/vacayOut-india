import Image from "@/components/media/image";
import Link from "next/link";
import { Icon, type Name } from "@/components/icons/icon";
import type { ItemStatus, PublishedSnapshot, SnapshotImage } from "@/lib/db/schema";
import { mapPoints } from "@/lib/map";
import { affiliateActive, bookingLinksFor } from "@/lib/booking/links";
import { kindLabel } from "@/lib/places/kinds";
import { categoryLabel } from "@/lib/places/categories";
import { sectionDef } from "@/lib/places/sections";
import { TRIP_TYPES } from "@/lib/places/trip-types";
import type { PlaceRollup } from "@/lib/places/rollup";
import { PlaceMap } from "@/components/map/place-map";
import { PageAssistant } from "@/components/assistant/page-assistant";
import { buildPack } from "@/lib/assistant/pack";
import { FaqList, HighlightCards, SectionBody, StatusPill, TextBody } from "./section-body";
import { SectionTabs } from "./section-tabs";
import { AskBox, ReadMore } from "./interactive";
import { BudgetCards, Credit, InfoCards, RouteCards, factIcon, infoIcon } from "./place-blocks";
import { ExperiencePlanner } from "./experience-planner";
import "./experience-page.css";

type Section = PublishedSnapshot["sections"][number];
type Inline = { slug: string; snapshot: PublishedSnapshot };
type Related = { name: string; slug: string; kind: string; summary: string | null; type: "nearby" | "day_trip"; stateSlug: string | null; lat?: number | null; lng?: number | null; hero?: SnapshotImage | null };

/** Keys this page lays out itself; any other section with content is still shown under "More details". */
const HANDLED = new Set(["overview", "highlights", "key_facts", "visit_info", "things_to_do", "best_time", "how_to_reach", "budget", "practical_info", "safety_health", "accessibility", "travel_tips", "common_mistakes", "culture_etiquette", "food", "shopping", "faqs"]);
const same = (a: string, b: string) => a.replace(/\s+/g, " ").trim().toLowerCase() === b.replace(/\s+/g, " ").trim().toLowerCase();

/** Section heading with a small eyebrow. Ids match the anchors the page assistant links to. */
function Part({ id, eyebrow, title, intro, children }: { id: string; eyebrow: string; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="xp-reveal scroll-mt-36">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-coral">{eyebrow}</p>
      <h2 id={`${id}-h`} className="mt-1 font-serif text-[1.5rem] font-normal leading-tight tracking-[-0.01em] text-ink sm:text-[1.75rem]">{title}</h2>
      {intro ? <p className="mt-1 text-sm text-[#666666]">{intro}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** A titled card inside "Plan your visit". */
function Panel({ icon, title, children, tone = "plain" }: { icon: Name; title: string; children: React.ReactNode; tone?: "plain" | "good" | "warn" }) {
  const head = tone === "good" ? "bg-[#EEF4F0] text-[#2D5A3F]" : tone === "warn" ? "bg-[#FDF0EB] text-coral" : "bg-[#F5F3EE] text-ink";
  return (
    <div className="xp-reveal rounded-2xl border border-[#ECE9E2] bg-white p-5 sm:p-6">
      <h3 className="flex items-center gap-2.5 text-base font-semibold text-ink">
        <span className={`flex size-9 items-center justify-center rounded-xl ${head}`}><Icon name={icon} size={17} /></span>
        {title}
      </h3>
      <div className="mt-4">{children}</div>
    </div>
  );
}

/** A short list (tips, mistakes) with one mark per line. */
function MarkList({ s, mark, tone }: { s: Section; mark: Name; tone: string }) {
  return (
    <ul className="space-y-2.5">
      {(s.body.items ?? []).map((it, i) => (
        <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-[#444]">
          <Icon name={mark} size={17} className={`mt-0.5 shrink-0 ${tone}`} />
          <span>{it.title ? <strong className="text-ink">{it.title}: </strong> : null}{it.body}{it.status ? <> <StatusPill status={it.status} className="ml-1 align-middle" /></> : null}</span>
        </li>
      ))}
      {s.body.text ? <li className="text-sm leading-relaxed text-[#444]"><TextBody s={s} /></li> : null}
    </ul>
  );
}

/** Titled items as cards when there are items, otherwise paragraphs. */
const Cards = ({ s, highlightFirst = false }: { s: Section; highlightFirst?: boolean }) =>
  s.body.items?.length ? (
    <>
      <InfoCards s={s} highlightFirst={highlightFirst} />
      {s.body.text ? <div className="mt-3"><TextBody s={s} /></div> : null}
    </>
  ) : <TextBody s={s} />;

/**
 * Page for one attraction or activity (a temple, a lake, a houseboat cruise…). Built for reading:
 * a photo header, the essential facts, then only the sections that have published content —
 * nothing is padded or invented. Motion: the header fades in and sections fade up on scroll.
 */
export function ExperiencePage({
  snapshot,
  related = [],
  inline = [],
  stateSlug,
  tripTypes = [],
  rollup,
  preview = false,
  sample = false,
}: {
  snapshot: PublishedSnapshot;
  related?: Related[];
  inline?: Inline[];
  stateSlug: string;
  tripTypes?: string[];
  rollup?: PlaceRollup;
  preview?: boolean;
  sample?: boolean;
}) {
  const { place, sections } = snapshot;
  const sec = (key: string) => sections.find((s) => s.key === key && ((s.body.items ?? []).length || s.body.text?.trim()));
  const overview = sec("overview");
  const highlights = sec("highlights");
  const keyFacts = sec("key_facts");
  const visitInfo = sec("visit_info");
  const thingsToDo = sec("things_to_do");
  const bestTime = sec("best_time");
  const howToReach = sec("how_to_reach");
  const budget = sec("budget");
  const practical = sec("practical_info");
  const safety = sec("safety_health");
  const accessibility = sec("accessibility");
  const tips = sec("travel_tips");
  const mistakes = sec("common_mistakes");
  const culture = sec("culture_etiquette");
  const food = sec("food");
  const shopping = sec("shopping");
  const faqs = sec("faqs");
  const extra = sections.filter((s) => !HANDLED.has(s.key) && ((s.body.items ?? []).length || s.body.text?.trim()) && sectionDef(s.key));

  const hero = place.hero;
  const link = (href: string | null) => (preview ? null : href);
  const stateName = place.state?.name ?? "";
  const parent = place.parent && place.parent.kind !== "state" ? place.parent : null;
  const parentHref = parent ? `/india/${stateSlug}/${parent.slug}` : null;
  const where = parent ? `${parent.name}, ${stateName}` : stateName;
  const type = categoryLabel(place.category) ?? kindLabel(place.kind);
  const types = TRIP_TYPES.filter((t) => tripTypes.includes(t.key));
  const crumbs = [
    { label: "India", href: "/india" },
    ...(place.state ? [{ label: place.state.name, href: `/india/${place.state.slug}` }] : []),
    ...(parent && parentHref ? [{ label: parent.name, href: parentHref }] : []),
  ];

  // Essential facts: where, what, who for, then researched key facts (with their status).
  type Fact = { label: string; value: string; icon: Name; status?: ItemStatus | null };
  const base: Fact[] = [
    { label: "Location", value: where || "India", icon: "pin" },
    { label: "Type", value: type, icon: "compass" },
    ...(types.length ? [{ label: "Good for", value: types.map((t) => t.label).join(", "), icon: "heart" as Name }] : []),
  ];
  const kf = (keyFacts?.body.items ?? []).map((f) => ({ label: f.title ?? "", value: f.body, icon: factIcon(f.title ?? ""), status: f.status }));
  const room = Math.max(0, 4 - base.length);
  const strip: Fact[] = [...base, ...kf.slice(0, room)];
  const moreFacts = kf.slice(room);
  const hasStatus = sections.some((s) => (s.body.items ?? []).some((i) => i.status));

  const showAbout = !!(overview && !same(overview.body.text ?? "", place.summary ?? "")) || !!highlights;
  const planParts = [bestTime, howToReach, budget, practical, safety, accessibility, tips, mistakes].filter(Boolean).length;
  const hasMain = showAbout || !!visitInfo || !!thingsToDo || planParts > 0 || !!(culture || food || shopping) || !!faqs || extra.length > 0;

  const nearby = related.slice(0, 8);
  const relatedHref = (r: Related) => (r.kind === "state" ? `/india/${r.slug}` : r.stateSlug ? `/india/${r.stateSlug}/${r.slug}` : null);
  const points = mapPoints([
    { name: place.name, lat: place.lat, lng: place.lng, primary: true },
    ...related.map((r) => ({ name: r.name, lat: r.lat, lng: r.lng, href: preview ? undefined : (relatedHref(r) ?? undefined) })),
  ]);
  const booking = bookingLinksFor({ name: place.name, kind: place.kind, stateName: place.state?.name ?? null });
  const sources = [...new Map(sections.flatMap((s) => s.sources ?? []).filter((x) => /^https?:\/\//.test(x.url)).map((x) => [x.url, x])).values()];

  const tabs = [
    { id: "overview", label: "Overview" },
    visitInfo ? { id: "visit", label: "Visiting" } : null,
    thingsToDo ? { id: "things", label: "What to do" } : null,
    planParts ? { id: "plan", label: "Plan your visit" } : null,
    culture || food || shopping ? { id: "food", label: culture && !food && !shopping ? "Etiquette" : "Food & culture" } : null,
    faqs ? { id: "faqs", label: "FAQs" } : null,
    nearby.length ? { id: "nearby", label: "Nearby" } : null,
  ].filter((t): t is { id: string; label: string } => !!t);

  const suggestions = [
    `How long do I need at ${place.name}?`,
    bestTime ? `Best time to visit ${place.name}?` : `When is ${place.name} best?`,
    `How do I get to ${place.name}?`,
  ];

  const jsonLd: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "TouristAttraction",
      name: place.name,
      description: place.seoDescription,
      // Only real photographs describe the place in structured data; AI illustrations never do.
      ...(hero && hero.kind === "photo" ? { image: hero.url } : {}),
      ...(place.lat != null && place.lng != null ? { geo: { "@type": "GeoCoordinates", latitude: place.lat, longitude: place.lng } } : {}),
    },
  ];
  if (faqs?.body.items?.length) {
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.body.items.map((f) => ({ "@type": "Question", name: f.title, acceptedAnswer: { "@type": "Answer", text: f.body } })),
    });
  }

  // Side panel: map, the place it belongs to, booking searches, ask a question.
  const side = (
    <>
      {points.length ? (
        <div className="overflow-hidden rounded-2xl border border-[#ECE9E2] bg-white">
          <PlaceMap points={points} height={220} label={`Map of ${place.name}${points.length > 1 ? " and places nearby" : ""}`} />
        </div>
      ) : null}
      {parent && parentHref ? (
        <Link href={link(parentHref) ?? "#"} className="xp-card group flex items-center gap-3 rounded-2xl border border-[#ECE9E2] bg-white p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#FDF0EB] text-coral"><Icon name="map" size={19} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.6875rem] font-semibold uppercase tracking-wider text-[#888888]">Part of</span>
            <span className="block truncate font-serif text-base text-ink">{parent.name}</span>
            <span className="text-xs font-semibold text-coral">See everything in {parent.name}</span>
          </span>
          <Icon name="arrowRight" size={15} className="shrink-0 text-[#BBBBBB] transition-transform group-hover:translate-x-0.5 group-hover:text-coral" />
        </Link>
      ) : null}
      {moreFacts.length ? (
        <div className="rounded-2xl border border-[#ECE9E2] bg-white p-5">
          <h2 className="text-sm font-semibold text-ink">More facts</h2>
          <dl className="mt-2 divide-y divide-[#F0ECE6] text-sm">
            {moreFacts.map((f, i) => (
              <div key={i} className="flex items-start justify-between gap-3 py-2">
                <dt className="text-[#666666]">{f.label}</dt>
                <dd className="text-right font-medium text-ink">{f.value}{f.status ? <span className="mt-0.5 block"><StatusPill status={f.status} /></span> : null}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
      {booking.length && !preview ? (
        <div className="rounded-2xl border border-[#ECE9E2] bg-white p-5">
          <h2 className="text-sm font-semibold text-ink">Plan and book</h2>
          <ul className="-mx-2 mt-2 space-y-0.5">
            {booking.map((b) => (
              <li key={b.href}>
                <a href={b.href} target="_blank" rel="sponsored nofollow noopener noreferrer" className="group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-[#F7F5F0]">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#F5F3EE] text-ink"><Icon name={b.icon as Name} size={16} /></span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-ink">{b.label}</span><span className="text-xs text-[#888888]">{b.provider}</span></span>
                  <span aria-hidden className="text-xs font-semibold text-coral transition-transform group-hover:translate-x-0.5">↗</span>
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs leading-relaxed text-[#888888]">Opens each provider’s own search. We don’t check prices or availability.{affiliateActive() ? " VacayOut may earn a commission on some bookings, at no extra cost to you." : ""}</p>
        </div>
      ) : null}
      {preview ? null : (
        <div className="rounded-2xl border border-[#F3DED4] bg-[#FFF8F4] p-5">
          <p className="flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-coral"><Icon name="sparkles" size={13} /> Ask the planner</p>
          <p className="mt-1 font-serif text-lg text-ink">Questions about {place.name}?</p>
          <div className="mt-3"><AskBox placeName={place.name} suggestions={suggestions} /></div>
        </div>
      )}
    </>
  );

  return (
    <article className="bg-white">
      {preview ? null : <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}

      {/* 1. Header: breadcrumb, then the photo in a rounded frame with the title on it */}
      <header className="container-site pt-4 sm:pt-5">
        <nav aria-label="Breadcrumb" className="xp-in text-[0.8125rem] text-[#777777]" style={{ ["--d" as string]: "0ms" }}>
          <ol className="flex flex-wrap items-center gap-1.5">
            {crumbs.map((c, i) => (
              <li key={c.label} className="flex items-center gap-1.5">
                {i > 0 ? <span aria-hidden className="text-[#BBBBBB]">/</span> : null}
                {link(c.href) ? <Link href={c.href} className="transition-colors hover:text-coral">{c.label}</Link> : c.label}
              </li>
            ))}
            <li className="flex items-center gap-1.5 text-ink" aria-current="page"><span aria-hidden className="text-[#BBBBBB]">/</span>{place.name}</li>
          </ol>
        </nav>

        <div className={`relative mt-3 overflow-hidden rounded-3xl ${hero ? "bg-[#1a1714] text-white" : "bg-[#F5F1EB] text-ink"}`}>
          {hero ? (
            <>
              <Image src={hero.url} alt={hero.alt} fill priority sizes="(min-width: 1280px) 1240px, 100vw" className="xp-zoom object-cover" />
              <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/5" />
              <span aria-hidden className="absolute inset-y-0 left-0 w-2/3 bg-gradient-to-r from-black/35 to-transparent" />
            </>
          ) : null}
          <div className={`relative flex flex-col justify-end p-6 sm:p-10 ${hero ? "min-h-[24rem] sm:min-h-[30rem] lg:min-h-[34rem]" : "min-h-[16rem]"}`}>
            <p className="xp-in flex flex-wrap items-center gap-2" style={{ ["--d" as string]: "80ms" }}>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.6875rem] font-semibold uppercase tracking-wider ${hero ? "bg-white/15 backdrop-blur-md" : "bg-white text-ink"}`}>
                <Icon name="compass" size={12} />{type}
              </span>
              {where ? <span className={`inline-flex items-center gap-1 text-[0.8125rem] ${hero ? "text-white/85" : "text-[#666666]"}`}><Icon name="pin" size={13} />{where}</span> : null}
            </p>
            <h1 className="xp-in mt-3 max-w-3xl font-serif text-[clamp(2.2rem,5vw,3.8rem)] font-normal leading-[1.04] tracking-[-0.02em] [text-wrap:balance]" style={{ ["--d" as string]: "160ms" }}>
              {place.name}
            </h1>
            {place.summary ? (
              <p className={`xp-in mt-3 max-w-2xl text-[0.9375rem] leading-relaxed sm:text-base ${hero ? "text-white/90" : "text-[#555555]"}`} style={{ ["--d" as string]: "240ms" }}>{place.summary}</p>
            ) : null}
            {hero ? (
              <div className="xp-in mt-5 max-w-sm lg:absolute lg:bottom-6 lg:right-8 lg:mt-0 lg:text-right" style={{ ["--d" as string]: "320ms" }}>
                <Credit img={hero} onDark />
              </div>
            ) : null}
          </div>
        </div>

        {/* 2. Essential facts */}
        <div id={showAbout ? undefined : "overview"} className="relative z-10 mx-auto -mt-8 max-w-[calc(100%-2rem)] scroll-mt-36 sm:max-w-[calc(100%-4rem)]">
          <dl className={`grid grid-cols-2 overflow-hidden rounded-2xl border border-[#ECE9E2] bg-white shadow-[0_18px_40px_-26px_rgba(25,25,25,0.4)] ${strip.length >= 4 ? "lg:grid-cols-4" : strip.length === 3 ? "lg:grid-cols-3" : ""}`}>
            {strip.map((f, i) => (
              <div key={f.label} className="xp-in flex items-start gap-3 border-b border-r border-[#F0ECE6] px-4 py-4 sm:px-5 lg:border-b-0 [&:last-child]:border-r-0" style={{ ["--d" as string]: `${380 + i * 70}ms` }}>
                <span aria-hidden className="mt-0.5 hidden size-9 shrink-0 items-center justify-center rounded-full bg-[#FDF0EB] text-coral sm:flex"><Icon name={f.icon} size={16} /></span>
                <div className="min-w-0">
                  <dt className="text-[0.6875rem] font-semibold uppercase tracking-wider text-[#888888]">{f.label}</dt>
                  <dd className="mt-0.5 text-[0.9375rem] font-semibold leading-snug text-ink">{f.value}</dd>
                  {f.status ? <dd className="mt-1"><StatusPill status={f.status} /></dd> : null}
                </div>
              </div>
            ))}
          </dl>
          {hasStatus ? (
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#777777]">
              <span>How sure we are:</span>
              <span className="inline-flex items-center gap-1"><StatusPill status="verified" /> official source</span>
              <span className="inline-flex items-center gap-1"><StatusPill status="seasonal" /> changes with season</span>
              <span className="inline-flex items-center gap-1"><StatusPill status="estimate" /> approximate</span>
              <span className="inline-flex items-center gap-1"><StatusPill status="unconfirmed" /> check before you go</span>
            </p>
          ) : null}
        </div>
      </header>

      {tabs.length > 2 ? <div className="mt-8"><SectionTabs variant="bar" tabs={tabs} /></div> : <div className="h-4" />}
      {sample ? (
        <p className="border-b border-dashed border-line bg-[#F1EEE7] px-4 py-2 text-center text-xs text-muted">
          <strong className="font-semibold text-ink">Sample content</strong> for design work — this guide hasn’t been researched or reviewed yet.
        </p>
      ) : null}

      {/* 3. Content + side panel (or the side panel spread out when there is little content) */}
      <div className="container-site py-10 sm:py-12">
        {hasMain ? (
          <div className="grid gap-x-10 gap-y-12 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="min-w-0 space-y-14">
              {showAbout ? (
                <Part id="overview" eyebrow="Overview" title={`About ${place.name}`}>
                  {overview && !same(overview.body.text ?? "", place.summary ?? "") ? <ReadMore lines={9}><TextBody s={overview} /></ReadMore> : null}
                  {highlights ? (
                    <div className={overview ? "mt-6" : ""}>
                      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#888888]">Highlights</h3>
                      <HighlightCards s={highlights} />
                    </div>
                  ) : null}
                </Part>
              ) : null}

              {visitInfo ? (
                <Part id="visit" eyebrow="Before you go" title="Visiting information">
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {(visitInfo.body.items ?? []).map((it, i) => (
                      <li key={i} className="xp-card flex gap-3 rounded-2xl border border-[#ECE9E2] bg-white p-4">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#F5F3EE] text-ink"><Icon name={factIcon(it.title ?? "") === "compass" ? infoIcon(it.title ?? "") : factIcon(it.title ?? "")} size={16} /></span>
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-[#888888]">{it.title}<StatusPill status={it.status} /></p>
                          <p className="mt-1 text-sm leading-relaxed text-ink">{it.body}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {visitInfo.body.text ? <div className="mt-4"><TextBody s={visitInfo} /></div> : null}
                </Part>
              ) : null}

              {thingsToDo ? (
                <Part id="things" eyebrow="Experience" title={`What to do at ${place.name}`}>
                  {thingsToDo.body.items?.length ? (
                    <ol className="grid gap-3 sm:grid-cols-2">
                      {thingsToDo.body.items.map((it, i) => (
                        <li key={i} className="xp-card flex gap-3 rounded-2xl border border-[#ECE9E2] bg-white p-4">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink font-serif text-sm text-white">{i + 1}</span>
                          <p className="text-sm leading-relaxed text-[#444]">{it.title ? <strong className="block text-ink">{it.title}</strong> : null}{it.body}{it.status ? <> <StatusPill status={it.status} className="ml-1 align-middle" /></> : null}</p>
                        </li>
                      ))}
                    </ol>
                  ) : null}
                  {thingsToDo.body.text ? <div className={thingsToDo.body.items?.length ? "mt-4" : ""}><TextBody s={thingsToDo} /></div> : null}
                </Part>
              ) : null}

              {planParts ? (
                <Part id="plan" eyebrow="Practical" title="Plan your visit">
                  <div className="space-y-4">
                    {bestTime ? <Panel icon="calendar" title="Best time to visit"><TextBody s={bestTime} /></Panel> : null}
                    {howToReach ? <Panel icon="route" title="Getting there">{howToReach.body.text ? <RouteCards text={howToReach.body.text} /> : null}{howToReach.body.items?.length ? <div className={howToReach.body.text ? "mt-3" : ""}><InfoCards s={howToReach} /></div> : null}</Panel> : null}
                    {budget ? <Panel icon="coins" title="Fees and costs"><BudgetCards s={budget} /></Panel> : null}
                    {practical ? <Panel icon="fileText" title="Practical information"><Cards s={practical} /></Panel> : null}
                    {safety ? <Panel icon="shield" title="Safety and health"><Cards s={safety} highlightFirst /></Panel> : null}
                    {accessibility ? <Panel icon="user" title="Accessibility"><Cards s={accessibility} /></Panel> : null}
                    {tips || mistakes ? (
                      <div className="grid gap-4 md:grid-cols-2">
                        {tips ? <Panel icon="bulb" title="Good to know" tone="good"><MarkList s={tips} mark="checkCircle" tone="text-[#2D5A3F]" /></Panel> : null}
                        {mistakes ? <Panel icon="shield" title="Mistakes to avoid" tone="warn"><MarkList s={mistakes} mark="x" tone="text-coral" /></Panel> : null}
                      </div>
                    ) : null}
                  </div>
                </Part>
              ) : null}

              {culture || food || shopping ? (
                <Part id="food" eyebrow="Local life" title={culture && !food && !shopping ? "Culture and etiquette" : "Food, shopping and culture"}>
                  <div className="space-y-4">
                    {culture ? <Panel icon="palace" title="Culture and etiquette"><Cards s={culture} /></Panel> : null}
                    {food ? <Panel icon="utensils" title="Food"><SectionBody s={food} /></Panel> : null}
                    {shopping ? <Panel icon="bag" title="Shopping"><SectionBody s={shopping} /></Panel> : null}
                  </div>
                </Part>
              ) : null}

              {extra.length ? (
                <Part id="more" eyebrow="Details" title="More details">
                  <div className="space-y-4">
                    {extra.map((s) => <Panel key={s.key} icon="book" title={sectionDef(s.key)!.label}><SectionBody s={s} /></Panel>)}
                  </div>
                </Part>
              ) : null}

              {faqs ? (
                <Part id="faqs" eyebrow="Good to know" title="Frequently asked questions">
                  <FaqList s={faqs} />
                </Part>
              ) : null}
            </div>

            <aside aria-label={`${place.name} trip planner`} className="min-w-0">
              <div className="space-y-4 lg:sticky lg:top-40">{side}</div>
            </aside>
          </div>
        ) : (
          // Little content yet: the map, parent, booking and questions sit side by side.
          <div className="xp-reveal grid gap-4 md:grid-cols-2 lg:grid-cols-3 [&>*]:h-fit">{side}</div>
        )}

        {/* 4. Nearby */}
        {nearby.length ? (
          <section id="nearby" aria-labelledby="nearby-h" className="xp-reveal mt-16 scroll-mt-36">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-coral">Go further</p>
                <h2 id="nearby-h" className="mt-1 font-serif text-[1.5rem] font-normal leading-tight text-ink sm:text-[1.75rem]">Nearby and day trips</h2>
              </div>
              {parent && parentHref && !preview ? <Link href={parentHref} className="group inline-flex items-center gap-1 text-sm font-semibold text-ink hover:text-coral">All of {parent.name}<Icon name="arrowRight" size={14} className="transition-transform group-hover:translate-x-0.5" /></Link> : null}
            </div>
            <ul className="mt-5 grid grid-cols-2 gap-3.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {nearby.map((r) => {
                const to = link(relatedHref(r));
                const inner = (
                  <>
                    <span className="relative block aspect-[4/3] overflow-hidden bg-[#EFECE6]">
                      {r.hero ? <Image src={r.hero.url} alt={r.hero.alt} fill sizes="(min-width: 1024px) 22vw, (min-width: 768px) 30vw, 46vw" className="object-cover transition-transform duration-700 ease-out group-hover:scale-105" /> : <span className="flex size-full items-center justify-center text-[#B9B4AA]"><Icon name="mountain" size={26} /></span>}
                      {r.hero?.kind === "ai_generated" ? <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[0.625rem] font-semibold text-white">AI illustration</span> : null}
                      <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-ink">{r.type === "day_trip" ? "Day trip" : "Nearby"}</span>
                    </span>
                    <span className="block p-3 sm:p-3.5">
                      <span className="block text-[0.6875rem] font-semibold uppercase tracking-wider text-[#888888]">{kindLabel(r.kind)}</span>
                      <span className="mt-0.5 block truncate text-sm font-bold text-ink transition-colors group-hover:text-coral sm:text-[0.9375rem]">{r.name}</span>
                      {r.summary ? <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-[#666666]">{r.summary}</span> : null}
                    </span>
                  </>
                );
                return (
                  <li key={`${r.slug}-${r.type}`}>
                    {to ? <Link href={to} className="xp-card group block h-full overflow-hidden rounded-2xl border border-[#ECE9E2] bg-white">{inner}</Link> : <div className="block h-full overflow-hidden rounded-2xl border border-[#ECE9E2] bg-white">{inner}</div>}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {/* 5. AI planner */}
        {preview ? null : (
          <div className="xp-reveal mt-16">
            <ExperiencePlanner
              name={place.name}
              where={where || "India"}
              chips={suggestions.map((q, i) => ({ key: `q${i}`, label: q, icon: (["clock", "calendar", "route"] as Name[])[i], prompt: q }))}
              picks={nearby.filter((r) => r.hero && relatedHref(r)).slice(0, 3).map((r) => ({ href: relatedHref(r)!, name: r.name, meta: kindLabel(r.kind), image: r.hero ?? null }))}
            />
          </div>
        )}

        {/* 6. Sources */}
        {sources.length ? (
          <details className="mt-10 rounded-2xl border border-[#ECE9E2] bg-white px-5 py-4 text-sm">
            <summary className="cursor-pointer font-semibold text-ink">Sources for this guide ({sources.length})</summary>
            <ul className="mt-3 grid gap-1.5 text-xs text-[#666666] sm:grid-cols-2">
              {sources.map((s) => (
                <li key={s.url} className="truncate">
                  <a href={s.url} target="_blank" rel="nofollow noopener noreferrer" className="hover:text-coral hover:underline">{s.title || s.site}</a> <span className="text-[#999999]">· {s.site}</span>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>

      {/* Page assistant: answers about this place from the content above. */}
      {preview || sample ? null : <PageAssistant pack={buildPack({ snapshot, stateSlug, rollup, inline, related })} />}
    </article>
  );
}
