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
import { CheckList, DaysTimeline, FaqList, HighlightCards, SectionBody, StatusPill, TextBody } from "./section-body";
import { SectionTabs } from "./section-tabs";
import { Accordion, AskBox, FilterGrid, HashDialogs, Rail, ReadMore, Tabs } from "./interactive";

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

function Block({ id, title, intro, children, className = "", more, eyebrow }: { id: string; title: string; intro?: string; children: React.ReactNode; className?: string; more?: { href: string; label: string } | null; eyebrow?: string }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className={`scroll-mt-36 ${className}`}>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          {eyebrow ? <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-[#2D5A3F]">{eyebrow}</p> : null}
          <h2 id={`${id}-h`} className="font-serif text-[1.375rem] font-medium leading-tight text-ink @3xl:text-[1.625rem]">{title}</h2>
          {intro ? <p className="mt-1 text-sm text-[#666]">{intro}</p> : null}
        </div>
        {more ? <Link href={more.href} className="group inline-flex items-center gap-1 text-sm font-semibold text-[#2D5A3F] hover:text-coral">{more.label}<Icon name="arrowRight" size={14} className="transition-transform group-hover:translate-x-0.5" /></Link> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Sidebar card. */
function SideCard({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} aria-label={title} className="scroll-mt-36 rounded-2xl border border-line bg-white p-5">
      <h2 className="font-serif text-[1.0625rem] font-medium text-ink">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

const REGION_TONES = ["from-[#3E6B52] to-[#7FA88E]", "from-[#8A5A3C] to-[#C99A6E]", "from-[#2F5A7A] to-[#7FA3C0]", "from-[#6B4E7A] to-[#A98CB8]", "from-[#7A6A3C] to-[#C2B07A]", "from-[#3C6E72] to-[#86B5B0]"];

const AUDIENCE_TONES = ["bg-[#FBEDE8] text-[#B9442B]", "bg-[#EEF4F0] text-[#2D5A3F]", "bg-[#E4ECF7] text-[#234A7A]", "bg-[#FBEBD3] text-[#7A4A0B]", "bg-[#F1ECF6] text-[#5B3A7A]"];

/** Icon for a "who it suits" audience. */
function audienceIcon(title: string): Name {
  const t = title.toLowerCase();
  if (/famil|kid|child/.test(t)) return "family";
  if (/couple|honeymoon|romance/.test(t)) return "heart";
  if (/adventure|trek|sport/.test(t)) return "mountain";
  if (/first|international|foreign/.test(t)) return "plane";
  if (/temple|monaster|spiritual|pilgrim/.test(t)) return "temple";
  if (/food|cafe|café/.test(t)) return "utensils";
  if (/budget|backpack/.test(t)) return "coins";
  return "user";
}

const PANEL_TONES = {
  coral: { head: "from-[#FBEDE8] to-[#FDF6F2]", icon: "bg-white text-[#B9442B]", dot: "bg-[#E8826A]" },
  green: { head: "from-[#E6F0EA] to-[#F3F8F5]", icon: "bg-white text-[#2D5A3F]", dot: "bg-[#4E8A66]" },
  blue: { head: "from-[#E4ECF7] to-[#F3F6FB]", icon: "bg-white text-[#234A7A]", dot: "bg-[#5B7FB0]" },
} as const;

/** Splits "Kullu trout, grilled or in curry." into a short lead ("Kullu trout") and the rest, for scanning. The words are unchanged. */
function leadOf(text: string): [string, string] {
  const m = /^([^,;:—]{3,60}?)([,;:—]\s*)([\s\S]+)$/.exec(text);
  if (!m || m[1].trim().split(/\s+/).length > 6) return ["", text];
  return [m[1], `${m[2]}${m[3]}`];
}

/** A card listing one local-life section (food, shopping, etiquette). */
function LocalPanel({ s, title, icon, tone, wide = false }: { s: PublishedSnapshot["sections"][number]; title: string; icon: Name; tone: keyof typeof PANEL_TONES; wide?: boolean }) {
  const t = PANEL_TONES[tone];
  const items = s.body.items ?? [];
  return (
    <section aria-label={title} className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white transition duration-300 hover:shadow-card">
      <header className={`flex items-center gap-3 bg-gradient-to-r px-5 py-4 ${t.head}`}>
        <span className={`flex size-10 items-center justify-center rounded-xl shadow-sm ${t.icon}`}><Icon name={icon} size={19} /></span>
        <span className="min-w-0">
          <span className="block font-serif text-lg font-medium leading-tight text-ink">{title}</span>
          <span className="text-xs text-[#666]">{items.length} {items.length === 1 ? "tip" : "tips"}</span>
        </span>
      </header>
      <ul className={`grid flex-1 gap-x-8 px-5 py-2 ${wide ? "@3xl:grid-cols-2" : ""}`}>
        {items.map((it, i) => {
          const [lead, rest] = it.title ? [it.title, `: ${it.body}`] : leadOf(it.body);
          return (
            <li key={i} className="flex gap-3 border-b border-line-subtle py-3 text-sm leading-relaxed text-[#555] last:border-0">
              <span aria-hidden className={`mt-[0.55rem] size-1.5 shrink-0 rounded-full ${t.dot}`} />
              <span>
                {lead ? <strong className="font-semibold text-ink">{lead}</strong> : null}{rest}
                {it.status ? <StatusPill status={it.status} className="ml-1.5 align-middle" /> : null}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** White panel with a heading, used inside the planning tabs. */
function PlanPanel({ icon, title, children }: { icon: Name; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4 @xl:p-6">
      <h3 className="mb-4 flex items-center gap-2.5 font-serif text-lg font-medium text-ink">
        <span className="flex size-9 items-center justify-center rounded-xl bg-[#EEF4F0] text-[#2D5A3F]"><Icon name={icon} size={17} /></span>
        {title}
      </h3>
      {children}
    </div>
  );
}

/** Icon for a practical / safety / accessibility heading. */
function infoIcon(title: string): Name {
  const t = title.toLowerCase();
  if (/visa|passport|permit|document/.test(t)) return "fileText";
  if (/money|cash|pay|atm|upi|currency/.test(t)) return "coins";
  if (/network|mobile|internet|sim|phone/.test(t)) return "chat";
  if (/emergenc|police|ambulance|hospital|health|medical/.test(t)) return "shield";
  if (/monsoon|rain|river|flood/.test(t)) return "waves";
  if (/weather|snow|season/.test(t)) return "sun";
  if (/altitude|height|trek|mountain/.test(t)) return "mountain";
  if (/road|drive|driving|taxi|transport|path|walk/.test(t)) return "car";
  if (/language/.test(t)) return "chat";
  if (/law|drug|rule|ban|plastic/.test(t)) return "help";
  if (/food|water|drink/.test(t)) return "utensils";
  return "checkCircle";
}

/** Titled items (practical info, safety, accessibility) as a grid of cards with their status badges. */
function InfoCards({ s, highlightFirst = false }: { s: PublishedSnapshot["sections"][number]; highlightFirst?: boolean }) {
  return (
    <ul className="grid gap-3 @xl:grid-cols-2">
      {(s.body.items ?? []).map((it, i) => {
        const hl = highlightFirst && i === 0;
        return (
          <li key={i} className={`flex gap-3 rounded-xl border p-4 ${hl ? "border-[#F2C9BD] bg-[#FDF3EF] @xl:col-span-2" : "border-line-subtle bg-[#FBFAF7]"}`}>
            <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${hl ? "bg-[#E8826A] text-white" : "bg-white text-[#2D5A3F] shadow-sm"}`}><Icon name={infoIcon(it.title ?? "")} size={16} /></span>
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">{it.title}<StatusPill status={it.status} /></p>
              <p className="mt-1 text-[0.8125rem] leading-relaxed text-[#555]">{it.body}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Fees as cards: what it is, the amount as published, and the section's note. */
function BudgetCards({ s }: { s: PublishedSnapshot["sections"][number] }) {
  return (
    <div className="space-y-4">
      <p className="flex gap-2 rounded-xl bg-[#FBF4E6] px-4 py-3 text-[0.8125rem] leading-relaxed text-[#6B4A12]"><Icon name="bulb" size={16} className="mt-0.5 shrink-0" /><span>{s.body.text ? `${s.body.text} ` : ""}Prices change — check current rates before you travel.</span></p>
      <ul className="grid gap-3 @xl:grid-cols-2">
        {(s.body.items ?? []).map((it, i) => {
          const unknown = /not confirmed|not published|ask /i.test(it.body);
          return (
            <li key={i} className="flex flex-col rounded-xl border border-line-subtle bg-[#FBFAF7] p-4">
              <span className="flex items-start justify-between gap-2 text-[0.8125rem] font-medium text-[#555]">{it.title}<StatusPill status={it.status} /></span>
              <span className={`mt-1.5 leading-snug ${unknown ? "text-sm text-[#777]" : "text-[0.9375rem] font-semibold text-ink"}`}>{it.body}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Paragraphs as small cards with an icon picked from their opening words. */
function ParagraphCards({ text }: { text: string }) {
  const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const pick = (p: string): Name => (/^on foot|walk/i.test(p) ? "route" : /bus/i.test(p.slice(0, 40)) ? "bus" : /driv|car|park/i.test(p.slice(0, 40)) ? "car" : /taxi/i.test(p.slice(0, 40)) ? "car" : "compass");
  if (paras.length < 2) return <div className="space-y-3 text-[0.9375rem] leading-[1.7] text-[#444]">{paras.map((p, i) => <p key={i}>{p}</p>)}</div>;
  return (
    <ul className="space-y-3">
      {paras.map((p, i) => (
        <li key={i} className="flex gap-3 rounded-xl border border-line-subtle bg-[#FBFAF7] p-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#2D5A3F] shadow-sm"><Icon name={pick(p)} size={16} /></span>
          <p className="text-sm leading-relaxed text-[#444]">{p}</p>
        </li>
      ))}
    </ul>
  );
}

/** Icon for a key-fact label. */
function factIcon(label: string): Name {
  const l = label.toLowerCase();
  if (/altitude|height|elevation/.test(l)) return "mountain";
  if (/snow|season|time|month|open/.test(l)) return "calendar";
  if (/airport|flight/.test(l)) return "plane";
  if (/rail|train/.test(l)) return "train";
  if (/bus/.test(l)) return "bus";
  if (/permit|fee|ticket|entry|tax/.test(l)) return "ticket";
  if (/hour|timing/.test(l)) return "clock";
  if (/state|region|type/.test(l)) return "pin";
  return "compass";
}

/** "By air: …" paragraphs as route cards; anything else stays as text. */
function RouteCards({ text }: { text: string }) {
  const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const ICONS: Record<string, Name> = { air: "plane", bus: "bus", train: "train", rail: "train", car: "car", road: "car", taxi: "car" };
  const cards = paras.map((p) => {
    const m = /^By ([a-z]+)\s*:\s*/i.exec(p);
    return m ? { mode: m[1].toLowerCase(), label: `By ${m[1].toLowerCase()}`, body: p.slice(m[0].length) } : null;
  });
  if (cards.some((c) => c === null)) return <div className="space-y-3 text-[0.9375rem] leading-[1.7] text-[#444]">{paras.map((p, i) => <p key={i}>{p}</p>)}</div>;
  return (
    <ul className="grid gap-3 @xl:grid-cols-2">
      {cards.map((c) => c && (
        <li key={c.label} className="flex gap-3 rounded-xl border border-line-subtle bg-[#FBFAF7] p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF4F0] text-[#2D5A3F]"><Icon name={ICONS[c.mode] ?? "route"} size={19} /></span>
          <div className="min-w-0">
            <p className="text-sm font-semibold capitalize text-ink">{c.label}</p>
            <p className="mt-1 text-sm leading-relaxed text-[#555]">{c.body.charAt(0).toUpperCase() + c.body.slice(1)}</p>
          </div>
        </li>
      ))}
    </ul>
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
      <span className="flex flex-1 flex-col gap-1 p-3 @xl:p-3.5">
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
  for (const d of isState ? destinations.filter((d) => d.kind !== "region") : []) {
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
  // On towns and attractions, the towns inside them are short trips: they join "Nearby" instead of a separate block.
  const nearby: Related[] = [
    ...related,
    ...(isState ? [] : destinations.filter((d) => d.kind !== "region" && !related.some((r) => r.slug === d.slug)).map((d) => ({ name: d.name, slug: d.slug, kind: d.kind, summary: d.summary, type: "nearby" as const, stateSlug, lat: d.lat, lng: d.lng, hero: d.hero }))),
  ];
  const points = mapPoints([
    { name: place.name, lat: place.lat, lng: place.lng, primary: true },
    ...inline.map((c) => ({ name: c.snapshot.place.name, lat: c.snapshot.place.lat, lng: c.snapshot.place.lng, href: preview ? undefined : `#${c.slug}` })),
    ...[...destinations, ...attractions].map((c) => ({ name: c.name, lat: c.lat, lng: c.lng, href: hrefOf(c) ?? undefined })),
    ...related.map((r) => ({ name: r.name, lat: r.lat, lng: r.lng, href: preview ? undefined : (relatedHref(r) ?? undefined) })),
  ]);
  type Mention = { name: string; href: string | null; hero: SnapshotImage | null };
  const pool: Mention[] = [
    ...[...attractions, ...activities, ...destinations].map((p) => ({ name: p.name, href: hrefOf(p), hero: p.hero })),
    ...inline.map((c) => ({ name: c.snapshot.place.name, href: preview ? null : `#${c.slug}`, hero: c.snapshot.place.hero })),
    ...nearby.map((r) => ({ name: r.name, href: link(relatedHref(r)), hero: r.hero ?? null })),
  ].filter((m, i, all) => m.name.length >= 5 && m.name !== place.name && all.findIndex((x) => x.name === m.name) === i);
  const mentions = (text: string) => {
    const t = text.toLowerCase();
    return pool.filter((m) => t.includes(m.name.toLowerCase())).sort((a, b) => t.indexOf(a.name.toLowerCase()) - t.indexOf(b.name.toLowerCase()));
  };
  // Region items about a whole-state theme (rivers, climate…) read better as a short note than as a region card.
  const NOTE_RE = /^(rivers?|climate|weather|geography|languages?|people|economy|history)$/i;
  const regionItems = regions?.body.items ?? [];
  const regionCards = regionItems
    .filter((it) => !NOTE_RE.test((it.title ?? "").trim()))
    .map((it) => {
      const refs = mentions(`${it.title ?? ""} ${it.body}`);
      // Use a place's photo only when the region text leads with it (not "reached from Manali…" further on).
      const lead = `${it.title ?? ""} ${it.body}`.toLowerCase().slice(0, (it.title ?? "").length + 50);
      const photo = refs.find((m) => m.hero && m.hero.kind === "photo" && lead.includes(m.name.toLowerCase()))?.hero ?? null;
      return { it, refs, photo };
    });
  const regionNotes = regionItems.filter((it) => NOTE_RE.test((it.title ?? "").trim()));
  const localSpots = activities.filter((a) => a.category === "food_shopping");
  const booking = bookingLinksFor({ name: place.name, kind: place.kind, stateName: place.state?.name ?? null });

  const activityCards: ActivityCard[] = activities.map((a) => ({ slug: a.slug, name: a.name, summary: a.summary, category: a.category, where: a.parentName && a.parentName !== place.name ? a.parentName : null, href: hrefOf(a), hero: a.hero }));

  // Activities shown as sections of this page belong under "Things to do", not "Places".
  const inlinePlaces = inline.filter((c) => c.snapshot.place.kind !== "activity");
  const placesCount = attractions.length + inlinePlaces.length;

  const stayLink = booking.find((b) => b.icon === "hotel" || /stay/i.test(b.label));
  const planTabs = [
    bestTime ? { id: "best", label: "Seasons", hint: "When to go", icon: <Icon name="calendar" size={16} />, content: <PlanPanel icon="calendar" title={`When to visit ${place.name}`}><TextBody s={bestTime} /></PlanPanel> } : null,
    howToReach ? { id: "reach", label: "Getting there", hint: "Air, bus, train, car", icon: <Icon name="plane" size={16} />, content: <PlanPanel icon="plane" title={`How to reach ${place.name}`}><RouteCards text={howToReach.body.text ?? ""} /></PlanPanel> } : null,
    localTransport ? { id: "around", label: "Getting around", hint: "Taxis, buses, on foot", icon: <Icon name="car" size={16} />, content: <PlanPanel icon="car" title={`Getting around ${place.name}`}><ParagraphCards text={localTransport.body.text ?? ""} /></PlanPanel> } : null,
    whereToStay ? {
      id: "stay", label: "Where to stay", hint: "Best bases", icon: <Icon name="bed" size={16} />,
      content: (
        <PlanPanel icon="bed" title={`Where to stay in ${place.name}`}>
          <TextBody s={whereToStay} />
          {(() => {
            const refs = mentions(whereToStay.body.text ?? "");
            return refs.length || (stayLink && !preview) ? (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line-subtle pt-4">
                {refs.slice(0, 5).map((m) => m.href ? <Link key={m.name} href={m.href} className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1 text-xs font-medium text-[#2D5A3F] transition hover:border-[#2D5A3F]"><Icon name="pin" size={11} />{m.name}</Link> : null)}
                {stayLink && !preview ? <a href={stayLink.href} target="_blank" rel="sponsored nofollow noopener noreferrer" className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[#2D5A3F] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[#244A33]">Search stays on {stayLink.provider} ↗</a> : null}
              </div>
            ) : null;
          })()}
        </PlanPanel>
      ),
    } : null,
    budget ? { id: "budget", label: "Budget", hint: "Official fees", icon: <Icon name="coins" size={16} />, content: <PlanPanel icon="coins" title="Fees and costs"><BudgetCards s={budget} /></PlanPanel> } : null,
    practical ? { id: "practical", label: "Practical info", hint: "Visas, money, network", icon: <Icon name="fileText" size={16} />, content: <PlanPanel icon="fileText" title="Practical information"><InfoCards s={practical} /></PlanPanel> } : null,
    safety ? { id: "safety", label: "Safety", hint: "Emergencies, weather", icon: <Icon name="shield" size={16} />, content: <PlanPanel icon="shield" title="Safety and health"><InfoCards s={safety} highlightFirst /></PlanPanel> } : null,
    accessibility ? { id: "access", label: "Accessibility", hint: "Altitude, paths", icon: <Icon name="user" size={16} />, content: <PlanPanel icon="user" title="Accessibility"><InfoCards s={accessibility} /></PlanPanel> } : null,
    tips || mistakes ? { id: "tips", label: "Tips", hint: "Do this, avoid that", icon: <Icon name="bulb" size={16} />, content: <div className="grid gap-4 @4xl:grid-cols-2">{tips ? <LocalPanel s={tips} title="Travel tips" icon="sparkles" tone="green" /> : null}{mistakes ? <LocalPanel s={mistakes} title="Mistakes to avoid" icon="bulb" tone="coral" /> : null}</div> } : null,
  ].filter((t) => t !== null);

  const localParts = [food ? "Food" : null, shopping ? "shopping" : null, culture ? "culture" : null].filter((x): x is string => !!x);
  const localTitle = (localParts.length > 1 ? `${localParts.slice(0, -1).join(", ")} and ${localParts[localParts.length - 1]}` : (localParts[0] ?? "")).replace(/^./, (c) => c.toUpperCase());
  const tabs = [
    { id: "overview", label: "Overview", show: true },
    { id: "visit", label: "Visiting", show: !!visitInfo && !isDestination },
    { id: "regions", label: "Regions", show: !!regions },
    { id: "destinations", label: "Destinations", show: regionGroups.length > 0 },
    { id: "places", label: isState ? "Top places" : "Places to visit", show: placesCount > 0 },
    { id: "areas", label: "Areas", show: !!neighbourhoods },
    { id: "things", label: "Things to do", show: activities.length > 0 || !!thingsToDo },
    { id: "itineraries", label: "Itineraries", show: itineraries.length > 0 || !!itinerary },
    { id: "guides", label: "Travel guides", show: guides.length > 0 },
    { id: "food", label: food && !shopping && !culture ? "Food" : culture && !food && !shopping ? "Culture" : culture ? "Food & culture" : "Food & shopping", show: !!(food || shopping || culture) },
    { id: "plan", label: "Plan your trip", show: planTabs.length > 0 },
    { id: "faqs", label: "FAQs", show: !!faqs },
    { id: "nearby", label: "Nearby", show: nearby.length > 0 },
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
    { label: "Destinations", n: isState ? destinations.filter((d) => d.kind !== "region").length : 0, href: "#destinations" },
    { label: "Places to visit", n: placesCount, href: "#places" },
    { label: "Things to do", n: activities.length, href: "#things" },
    { label: "Itineraries", n: itineraries.length, href: "#itineraries" },
    { label: "Travel guides", n: guides.length, href: "#guides" },
  ].filter((c) => c.n > 0);

  const plannerPrompt = isState ? `Plan a trip to ${place.name}` : `Plan a trip to ${place.name}, ${stateName}`;
  const parentHref = place.parent ? (place.parent.kind === "state" ? `/india/${place.parent.slug}` : `/india/${stateSlug}/${place.parent.slug}`) : null;

  const tripFacts = keyFacts?.body.items ?? [];
  const suggestions = [
    isDestination ? (itineraries.length ? `${Math.min(...itineraries.map((i) => i.durationDays))}-day ${place.name} itinerary` : `Plan 3 days in ${place.name}`) : `How long do I need at ${place.name}?`,
    bestTime ? `Best time to visit ${place.name}?` : null,
    howToReach ? `How do I get to ${place.name}?` : null,
  ].filter((x): x is string => !!x);
  const thingsMore = preview ? null : isState ? { href: `/things-to-do?state=${place.slug}`, label: "View all" } : isDestination ? { href: `/things-to-do?destination=${stateSlug}/${place.slug}`, label: "View all" } : null;
  const hasStatus = sections.some((s) => (s.body.items ?? []).some((i) => i.status));
  const hasSidebar = !!(visitInfo && !isDestination) || !!place.parent || counts.length > 0 || points.length > 0 || booking.length > 0 || !preview;

  const sidebar = (
    <aside aria-label={`${place.name} trip planner`} className="min-w-0 space-y-4 @5xl:col-start-2 @5xl:row-span-2 @5xl:row-start-1">
      {visitInfo && !isDestination ? (
        <section id="visit" aria-labelledby="visit-h" className="scroll-mt-36 rounded-2xl border border-line bg-white p-5 shadow-card">
          <h2 id="visit-h" className="font-serif text-[1.0625rem] font-medium text-ink">Plan your visit</h2>
          <dl className="mt-2 divide-y divide-line-subtle text-sm">
            {(visitInfo.body.items ?? []).map((it, i) => (
              <div key={i} className="flex flex-col gap-1 py-2.5">
                <dt className="flex items-center justify-between gap-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-[#666]">{it.title}<StatusPill status={it.status} /></dt>
                <dd className="leading-relaxed text-ink">{it.body}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
      {points.length ? (
        <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
          <PlaceMap points={points} height={220} label={`Map of ${place.name}${points.length > 1 ? " and places inside it" : ""}`} />
        </div>
      ) : null}
      {place.parent && parentHref ? (
        <Link href={link(parentHref) ?? "#"} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 transition hover:-translate-y-0.5 hover:border-coral hover:shadow-card">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-coral/10 text-coral"><Icon name="map" size={19} /></span>
          <span className="min-w-0">
            <span className="block text-[0.6875rem] font-semibold uppercase tracking-wider text-[#666]">Part of</span>
            <span className="block font-serif text-base font-medium text-ink">{place.parent.name}</span>
            <span className="text-xs font-semibold text-[#B9442B]">See everything in {place.parent.name} ›</span>
          </span>
        </Link>
      ) : null}
      {tripFacts.length > 4 || counts.length ? (
        <div className={tripFacts.length > 4 ? "" : "hidden @5xl:block"}><SideCard title="Trip facts">
          {tripFacts.length > 4 ? (
            <dl className="divide-y divide-line-subtle text-sm">
              {tripFacts.map((f, i) => (
                <div key={i} className="flex items-start justify-between gap-3 py-2">
                  <dt className="text-[#666]">{f.title}</dt>
                  <dd className="text-right font-medium text-ink">{f.body}{f.status ? <span className="mt-0.5 block"><StatusPill status={f.status} /></span> : null}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {counts.length ? (
            <ul className={`divide-y divide-line-subtle ${tripFacts.length > 4 ? "mt-2 border-t border-line-subtle" : ""}`}>
              {counts.map((c) => (
                <li key={c.label}>
                  <a href={c.href} className="group flex items-center justify-between py-2 text-sm text-ink hover:text-coral">
                    <span className="flex items-center gap-1.5">{c.label}<Icon name="arrowRight" size={13} className="opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" /></span><span className="rounded-full bg-[#F3F0EA] px-2.5 py-0.5 text-[0.8125rem] font-semibold group-hover:bg-coral group-hover:text-white">{c.n}</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </SideCard></div>
      ) : null}
      <div className="space-y-4 @5xl:sticky @5xl:top-40">
      {booking.length && !preview ? (
        <SideCard title="Plan and book">
          <ul className="-mx-2 space-y-0.5">
            {booking.map((b) => (
              <li key={b.href}>
                <a href={b.href} target="_blank" rel="sponsored nofollow noopener noreferrer" className="group flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-[#F7F5F0]">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#EEF4F0] text-[#2D5A3F]"><Icon name={b.icon as Name} size={16} /></span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-ink">{b.label}</span><span className="text-xs text-muted">{b.provider}</span></span>
                  <span aria-hidden className="text-xs font-semibold text-coral">↗</span>
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs leading-relaxed text-muted">Opens each provider’s own search. We don’t check prices or availability.{affiliateActive() ? " VacayOut may earn a commission on some bookings, at no extra cost to you." : ""}</p>
        </SideCard>
      ) : null}
      {preview ? null : (
        <section aria-label="Ask the AI planner" className="hidden rounded-2xl border border-[#D5E3DA] bg-[#EEF4F0] p-5 @5xl:block">
          <p className="flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-[#2D5A3F]"><Icon name="sparkles" size={13} /> AI travel planner</p>
          <p className="mt-1 font-serif text-[1.0625rem] font-medium text-ink">Questions about {place.name}?</p>
          <div className="mt-3"><AskBox placeName={place.name} suggestions={suggestions} /></div>
        </section>
      )}
      </div>
    </aside>
  );

  return (
    <article className="@container bg-[#FBFAF7]">
      {preview ? null : <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}

      {/* 1. Hero */}
      <header className={`relative overflow-hidden ${hero ? "bg-ink text-white" : "bg-[#F1EEE7] text-ink"}`}>
        {hero ? (
          <>
            <Image src={hero.url} alt={hero.alt} fill priority sizes="100vw" className="animate-[heroZoom_18s_ease-out_forwards] object-cover motion-reduce:animate-none" />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/20" />
            <div aria-hidden className="absolute inset-y-0 left-0 w-2/3 bg-gradient-to-r from-black/45 to-transparent" />
          </>
        ) : null}
        <div className={`container-site relative flex flex-col justify-end ${hero ? "min-h-[30rem] pb-20 pt-16 @3xl:min-h-[36rem]" : "pb-16 pt-14"}`}>
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
          <div className="max-w-3xl">
            <p className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem] font-medium ${hero ? "text-white/90" : "text-[#555]"}`}>
              <span className={`rounded px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wider ${hero ? "bg-white text-ink" : "bg-white text-ink"}`}>{kindLabel(place.kind)}</span>
              <span className="inline-flex items-center gap-1"><Icon name="pin" size={13} />{[!isState && place.parent && place.parent.kind !== "state" ? place.parent.name : null, isState ? (zone ? (zone === "Islands" ? "Island territories" : `${zone} India`) : "India") : stateName].filter(Boolean).join(", ")}</span>
            </p>
            <h1 className="mt-3 font-serif text-[clamp(2.375rem,6.5cqi,4.25rem)] font-medium leading-[1.02] tracking-[-0.01em] [text-shadow:0_2px_24px_rgba(0,0,0,.25)]">{place.name}</h1>
            {place.summary ? <p className={`mt-3 max-w-2xl text-base leading-relaxed @3xl:text-[1.0625rem] ${hero ? "text-white/95 [text-shadow:0_1px_12px_rgba(0,0,0,.45)]" : "text-[#555]"}`}>{place.summary}</p> : null}
            {preview ? null : (
              <div className="mt-6 flex max-w-2xl flex-col gap-3 @xl:flex-row @xl:items-center">
                <div className="min-w-0 flex-1"><AskBox placeName={place.name} tone="hero" /></div>
                {itineraries.length ? <a href="#itineraries" className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border px-5 py-3 text-sm font-semibold backdrop-blur-sm transition ${hero ? "border-white/60 bg-white/10 text-white hover:bg-white hover:text-ink" : "border-ink text-ink hover:bg-ink hover:text-white"}`}><Icon name="route" size={15} /> See itineraries</a> : null}
              </div>
            )}
            {types.length ? (
              <ul className="mt-5 flex flex-wrap gap-2 text-xs font-medium">
                {types.map((t) => <li key={t.key} className={`rounded-full border px-3 py-1 backdrop-blur-sm ${hero ? "border-white/45 bg-white/10" : "border-line bg-white"}`}>{t.label}</li>)}
              </ul>
            ) : null}
          </div>
          {hero ? (
            <div className="mt-6 @3xl:absolute @3xl:bottom-14 @3xl:right-6 @3xl:mt-0 @3xl:max-w-sm @3xl:text-right">
              {hero.kind === "ai_generated" ? <span className="mb-1 inline-block rounded bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">AI-generated illustration</span> : null}
              <Credit img={hero} onDark />
            </div>
          ) : null}
        </div>
      </header>

      {/* Essential facts */}
      {strip.length ? (
        <div className="container-site relative -mt-10">
          <dl className="grid grid-cols-2 overflow-hidden rounded-2xl border border-line bg-white shadow-card @4xl:grid-cols-4">
            {strip.map((f) => (
              <div key={f.label} className="flex items-start gap-3 border-b border-r border-line-subtle px-4 py-3.5 transition-colors hover:bg-[#FBFAF7] @xl:px-5 @4xl:border-b-0 last:border-r-0">
                <span aria-hidden className="mt-0.5 hidden size-9 shrink-0 items-center justify-center rounded-full bg-[#EEF4F0] text-[#2D5A3F] @xl:flex"><Icon name={factIcon(f.label)} size={17} /></span>
                <div className="min-w-0">
                  <dt className="text-[0.6875rem] font-semibold uppercase tracking-wider text-[#666]">{f.label}</dt>
                  <dd className="mt-0.5 text-[0.9375rem] font-semibold leading-snug text-ink">{f.value}</dd>
                  {f.status ? <dd className="mt-1"><StatusPill status={f.status} /></dd> : null}
                </div>
              </div>
            ))}
          </dl>
          {hasStatus ? (
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#666]">
              <span>How sure we are:</span>
              <span className="inline-flex items-center gap-1"><StatusPill status="verified" /> from an official source</span>
              <span className="inline-flex items-center gap-1"><StatusPill status="seasonal" /> changes with season</span>
              <span className="inline-flex items-center gap-1"><StatusPill status="estimate" /> approximate</span>
              <span className="inline-flex items-center gap-1"><StatusPill status="unconfirmed" /> check before you go</span>
            </p>
          ) : null}
        </div>
      ) : null}

      <div aria-hidden className="h-6" />
      <SectionTabs tabs={tabs.map(({ id, label }) => ({ id, label }))} />
      {sample ? (
        <p className="border-b border-dashed border-line bg-[#F1EEE7] px-4 py-2 text-center text-xs text-muted">
          <strong className="font-semibold text-ink">Sample content</strong> for design work — this guide hasn’t been researched or reviewed yet.
        </p>
      ) : null}

      <div className={`container-site grid gap-x-10 gap-y-12 py-8 @5xl:py-10 ${hasSidebar ? "@5xl:grid-cols-[minmax(0,1fr)_20rem] @5xl:grid-rows-[auto_1fr]" : ""}`}>
        {/* 2. About + highlights */}
        <div className="@container min-w-0 @5xl:col-start-1 @5xl:row-start-1">
          <section id="overview" aria-labelledby="overview-h" className="scroll-mt-36 space-y-6">
            <div>
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-[#2D5A3F]">Overview</p>
              <h2 id="overview-h" className="font-serif text-[1.375rem] font-medium text-ink @3xl:text-[1.625rem]">About {place.name}</h2>
            </div>
            {overview ? <ReadMore lines={9}><TextBody s={overview} /></ReadMore> : place.summary ? <p className="text-[0.9375rem] leading-relaxed text-[#444]">{place.summary}</p> : null}
            {highlights ? (
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Highlights</h3>
                <HighlightCards s={highlights} />
              </div>
            ) : null}
            {whoFor ? (
              <div>
                <h3 className="mb-3 font-serif text-lg font-medium text-ink">Who {place.name} suits</h3>
                <ul className="grid gap-3 @xl:grid-cols-2 @4xl:grid-cols-3">
                  {(whoFor.body.items ?? []).map((it, i) => {
                    const tone = AUDIENCE_TONES[i % AUDIENCE_TONES.length];
                    const refs = mentions(`${it.title ?? ""} ${it.body}`).slice(0, 3);
                    return (
                      <li key={i} className="group flex flex-col rounded-2xl border border-line bg-white p-4 transition duration-300 hover:-translate-y-0.5 hover:shadow-card">
                        <span className="flex items-center gap-2.5">
                          <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon name={audienceIcon(it.title ?? "")} size={19} /></span>
                          <span className="text-[0.9375rem] font-semibold leading-snug text-ink">{it.title}</span>
                          <StatusPill status={it.status} className="ml-auto" />
                        </span>
                        <p className="mt-2.5 text-[0.8125rem] leading-relaxed text-[#555]">{it.body}</p>
                        {refs.length ? (
                          <span className="mt-auto flex flex-wrap gap-1.5 pt-3">
                            {refs.map((m) => m.href ? <Link key={m.name} href={m.href} className="rounded-full bg-[#F3F0EA] px-2.5 py-0.5 text-[0.6875rem] font-medium text-[#444] transition hover:bg-[#2D5A3F] hover:text-white">{m.name}</Link> : <span key={m.name} className="rounded-full bg-[#F3F0EA] px-2.5 py-0.5 text-[0.6875rem] font-medium text-[#444]">{m.name}</span>)}
                          </span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </section>
        </div>

        {hasSidebar ? sidebar : null}

        <div className="@container min-w-0 space-y-14 @5xl:col-start-1 @5xl:row-start-2">
          {regions ? (
            <Block id="regions" eyebrow="Explore" title={`Regions of ${place.name}`} intro={`${regionCards.length} areas to know.`}>
              <div className="space-y-4">
                <ul className="grid grid-cols-1 gap-3 @3xl:grid-cols-2">
                  {regionCards.map(({ it, refs, photo }, i) => (
                    <li key={i} className="group flex gap-3.5 rounded-2xl border border-line bg-white p-3 transition duration-300 hover:-translate-y-0.5 hover:shadow-card">
                      <span className={`relative size-16 shrink-0 overflow-hidden rounded-xl @xl:size-[4.5rem] ${photo ? "bg-sand" : `bg-gradient-to-br ${REGION_TONES[i % REGION_TONES.length]}`}`}>
                        {photo ? (
                          <Image src={photo.url} alt="" fill sizes="72px" className="object-cover transition-transform duration-500 group-hover:scale-110" />
                        ) : (
                          <svg aria-hidden viewBox="0 0 72 72" className="absolute inset-0 size-full text-white/35"><path fill="currentColor" d="M0 72V50l16-14 11 9 15-18 14 15 16-12v42z" /></svg>
                        )}
                        <span className="absolute left-1 top-1 flex size-5 items-center justify-center rounded-full bg-white/95 text-[0.625rem] font-bold text-ink">{i + 1}</span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="flex flex-wrap items-center gap-2 font-serif text-[1.0625rem] font-medium leading-snug text-ink">{it.title}<StatusPill status={it.status} /></h3>
                        <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-[#555]">{it.body}</p>
                        {refs.length || !preview ? (
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            {refs.slice(0, 4).map((m) => m.href ? <Link key={m.name} href={m.href} className="inline-flex items-center gap-1 rounded-full bg-[#EEF4F0] px-2.5 py-0.5 text-[0.6875rem] font-medium text-[#2D5A3F] transition hover:bg-[#2D5A3F] hover:text-white"><Icon name="pin" size={10} />{m.name}</Link> : null)}
                            {!refs.length && !preview ? <Link href={routes.chatWithPrompt(`What to see in ${it.title}, ${place.name}`)} className="inline-flex items-center gap-1 text-xs font-semibold text-[#2D5A3F] hover:text-coral"><Icon name="sparkles" size={12} /> Ask AI about {it.title}</Link> : null}
                          </div>
                        ) : null}
                        {photo && photo.kind === "photo" ? <p className="mt-1.5 truncate text-[0.625rem] text-[#999]">Photo: {photo.attribution ?? "—"} · {photo.license}</p> : null}
                      </div>
                    </li>
                  ))}
                </ul>
                {regionNotes.length ? (
                  <ul className="flex flex-col gap-2">
                    {regionNotes.map((it, i) => (
                      <li key={i} className="flex items-start gap-3 rounded-2xl border border-[#D5E3DA] bg-[#EEF4F0] px-4 py-3 text-sm leading-relaxed text-[#2F4A3A]">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#2D5A3F]"><Icon name={/river|lake|water/i.test(it.title ?? "") ? "waves" : "compass"} size={16} /></span>
                        <span><strong className="font-semibold text-ink">{it.title}.</strong> {it.body}{it.status ? <> <StatusPill status={it.status} className="ml-1 align-middle" /></> : null}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </Block>
          ) : null}

          {/* 3. Destinations and attractions */}
          {regionGroups.length ? (
            <Block id="destinations" eyebrow="Explore" title="Popular destinations" intro="Towns and bases, grouped by region.">
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
            <Block id="places" eyebrow="Explore" title={isState ? `Top places in ${place.name}` : `Places to visit in ${place.name}`} intro="Each card opens the full guide to that place.">
              <FilterGrid
                initial={6}
                items={[
                  ...attractions.map((a) => ({ key: a.slug, group: kindLabel(a.kind), node: <PlaceCard p={a} href={hrefOf(a)} meta={`${kindLabel(a.kind)}${a.parentName && a.parentName !== place.name ? ` · ${a.parentName}` : ""}`} /> })),
                  ...inlinePlaces.map((c) => ({ key: c.slug, group: kindLabel(c.snapshot.place.kind), node: <PlaceCard p={{ name: c.snapshot.place.name, summary: c.snapshot.place.summary, hero: c.snapshot.place.hero }} href={preview ? null : `#${c.slug}`} meta={kindLabel(c.snapshot.place.kind)} /> })),
                ]}
              />
            </Block>
          ) : null}

          {neighbourhoods ? (
            <Block id="areas" eyebrow="Explore" title={`Areas of ${place.name}`}>
              <ol className="grid gap-4 @xl:grid-cols-2">
                {(neighbourhoods.body.items ?? []).map((it, i) => {
                  const refs = mentions(`${it.title ?? ""} ${it.body}`);
                  const photo = refs.find((m) => m.hero && m.hero.kind === "photo")?.hero ?? null;
                  return (
                    <li key={i} className="flex overflow-hidden rounded-2xl border border-line bg-white transition duration-300 hover:-translate-y-0.5 hover:shadow-card">
                      <span className="relative w-24 shrink-0 bg-[#EEF4F0] @3xl:w-32">
                        {photo ? <Image src={photo.url} alt="" fill sizes="128px" className="object-cover" /> : <span className="flex size-full items-center justify-center text-[#2D5A3F]/60"><Icon name="map" size={26} /></span>}
                        <span className="absolute left-2 top-2 flex size-7 items-center justify-center rounded-full bg-white font-serif text-sm font-semibold text-ink shadow-sm">{i + 1}</span>
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col p-4">
                        <span className="flex items-center gap-2 font-serif text-[1.0625rem] font-medium leading-snug text-ink">{it.title}<StatusPill status={it.status} /></span>
                        <span className="mt-1 text-[0.8125rem] leading-relaxed text-[#555]">{it.body}</span>
                        {refs.length ? (
                          <span className="mt-auto flex flex-wrap gap-1.5 pt-3">
                            {refs.slice(0, 4).map((m) => m.href ? <Link key={m.name} href={m.href} className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-0.5 text-[0.6875rem] font-medium text-[#2D5A3F] transition hover:border-[#2D5A3F]"><Icon name="pin" size={10} />{m.name}</Link> : null)}
                          </span>
                        ) : null}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </Block>
          ) : null}

          {inline.length && !preview ? (
            <HashDialogs
              items={inline.map((c) => {
                const ip = c.snapshot.place;
                return {
                  slug: c.slug,
                  title: ip.name,
                  body: (
                    <div>
                      {ip.hero ? (
                        <div className="relative aspect-[16/9] bg-sand">
                          <Image src={ip.hero.url} alt={ip.hero.alt} fill sizes="(min-width: 768px) 672px, 100vw" className="object-cover" />
                          <CardCredit img={ip.hero} />
                        </div>
                      ) : null}
                      <div className="space-y-3 p-5 @xl:p-6">
                        <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-[#B9442B]">{ip.kind === "activity" && ip.category ? (categoryLabel(ip.category) ?? kindLabel(ip.kind)) : kindLabel(ip.kind)} · {place.name}</p>
                        <h2 className="font-serif text-2xl font-medium leading-tight text-ink">{ip.name}</h2>
                        {ip.summary ? <p className="text-[0.9375rem] leading-relaxed text-[#444]">{ip.summary}</p> : null}
                        {c.snapshot.sections.map((sec) => <SectionBody key={sec.key} s={sec} />)}
                        <a href={routes.chatWithPrompt(`Tell me about ${ip.name} in ${place.name}`)} className="inline-flex items-center gap-1.5 pt-1 text-sm font-semibold text-[#2D5A3F] hover:text-coral"><Icon name="sparkles" size={14} /> Ask AI about {ip.name}</a>
                      </div>
                    </div>
                  ),
                };
              })}
            />
          ) : null}

          {inline.length && preview ? (
            <Block id="more-places" title={`Places shown inside ${place.name}`}>
              <Accordion defaultOpen={-1} items={inline.map((c) => ({ title: c.snapshot.place.name, body: <div className="space-y-3">{c.snapshot.sections.map((sec) => <SectionBody key={sec.key} s={sec} />)}</div> }))} />
            </Block>
          ) : null}

          {/* 4. Things to do */}
          {activities.length || thingsToDo ? (
            <Block id="things" eyebrow="Experiences" title={`Things to do${isActivity ? " here" : ` in ${place.name}`}`} more={activities.length ? thingsMore : null}>
              <div className="space-y-6">
                {activities.length ? <ActivityGrid items={activityCards} /> : null}
                {thingsToDo && !activities.length ? <CheckList s={thingsToDo} columns /> : null}
              </div>
            </Block>
          ) : null}

          {/* 5. Itineraries */}
          {itineraries.length || itinerary ? (
            <Block id="itineraries" eyebrow="Ready-made plans" title="Itineraries" intro={itineraries.length ? `Day-by-day plans with a stop in ${place.name}.` : undefined} more={itineraries.length && !preview ? { href: "/itineraries", label: "All itineraries" } : null}>
              <div className="space-y-6">
                {itineraries.length ? (
                  <Rail label="Itineraries">
                    {itineraries.map((it) => {
                      const inner = (
                        <>
                          <span className="relative block aspect-[16/10] overflow-hidden bg-sand">
                            {it.hero ? <Image src={it.hero.url} alt="" fill sizes="360px" className="object-cover transition-transform duration-500 group-hover:scale-105" /> : null}
                            <span className="absolute left-2.5 top-2.5 rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-ink shadow-sm">{it.durationDays} day{it.durationDays === 1 ? "" : "s"}</span>
                            {it.hero ? <CardCredit img={it.hero} /> : null}
                          </span>
                          <span className="flex min-w-0 flex-1 flex-col gap-1 p-4">
                            <span className="text-[0.6875rem] font-semibold uppercase tracking-wider text-[#777]">Starts in {it.placeName}</span>
                            <span className="font-serif text-lg font-medium leading-snug text-ink group-hover:text-coral">{it.title}</span>
                            <span className="line-clamp-2 text-[0.8125rem] leading-relaxed text-[#555]">{it.summary}</span>
                            {it.stopNames.length ? (
                              <span className="flex flex-wrap gap-1 pt-2">
                                {it.stopNames.map((n) => <span key={n} className="rounded-full bg-[#EEF4F0] px-2 py-0.5 text-[0.6875rem] font-medium text-[#2D5A3F]">{n}</span>)}
                              </span>
                            ) : null}
                            {preview ? null : <span className="mt-auto inline-flex items-center gap-1 pt-3 text-sm font-semibold text-[#2D5A3F] group-hover:text-coral">View day-by-day plan <Icon name="arrowRight" size={14} className="transition-transform group-hover:translate-x-0.5" /></span>}
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

          {/* 6. Travel guides */}
          {guides.length ? (
            <Block id="guides" eyebrow="Read before you go" title="Travel guides" more={preview ? null : { href: "/travel-guides?tab=articles", label: "All guides" }}>
              <ul className="grid gap-3 @xl:grid-cols-2">
                {guides.map((g) => {
                  const to = link(`/travel-guides/${g.slug}`);
                  const inner = (
                    <>
                      <span className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-[#EEF4F0] @3xl:size-24">
                        {g.hero ? <Image src={g.hero.url} alt="" fill sizes="96px" className="object-cover transition-transform duration-500 group-hover:scale-105" /> : <span className="flex size-full items-center justify-center text-[#2D5A3F]"><Icon name="book" size={24} /></span>}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-[#B9442B]"><Icon name="fileText" size={12} /> Guide{g.placeNames.length ? ` · ${g.placeNames.slice(0, 2).join(", ")}` : ""}</span>
                        <span className="mt-0.5 block font-serif text-[1.0625rem] font-medium leading-snug text-ink group-hover:text-coral">{g.title}</span>
                        {g.summary ? <span className="mt-0.5 line-clamp-2 text-[0.8125rem] leading-relaxed text-[#555]">{g.summary}</span> : null}
                      </span>
                    </>
                  );
                  return (
                    <li key={g.slug} className="flex">
                      {to ? <Link href={to} className="group flex w-full items-center gap-4 rounded-2xl border border-line bg-white p-3 transition duration-300 hover:-translate-y-0.5 hover:border-[#D9D4CA] hover:shadow-card">{inner}</Link> : <div className="flex w-full items-center gap-4 rounded-2xl border border-line bg-white p-3">{inner}</div>}
                    </li>
                  );
                })}
              </ul>
            </Block>
          ) : null}

          {/* 7. Food, shopping and local culture */}
          {food || shopping || culture ? (
            <Block id="food" eyebrow="Local life" title={`${localTitle} in ${place.name}`} intro={[food ? "what to eat" : null, shopping ? "where to shop" : null, culture ? "how to fit in" : null].filter(Boolean).join(", ").replace(/^./, (c) => c.toUpperCase()).replace(/, ([^,]*)$/, " and $1") + "."}>
              <div className="space-y-5">
                <div className={`grid gap-4 ${[food, shopping, culture].filter(Boolean).length > 1 ? "@3xl:grid-cols-2" : ""}`}>
                  {food ? <LocalPanel s={food} title="Food to try" icon="utensils" tone="coral" /> : null}
                  {shopping ? <LocalPanel s={shopping} title="Shopping and markets" icon="bag" tone="green" /> : null}
                  {culture ? <div className={food && shopping ? "@3xl:col-span-2" : ""}><LocalPanel s={culture} title="Local culture and etiquette" icon="heart" tone="blue" wide={!!(food && shopping)} /></div> : null}
                </div>
                {localSpots.length ? (
                  <div>
                    <p className="mb-2.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-[#666]">Where to go for it</p>
                    <ul className="grid gap-3 @xl:grid-cols-2 @4xl:grid-cols-3">
                      {localSpots.map((a) => {
                        const to = hrefOf(a);
                        const inner = (
                          <>
                            <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-[#FBEDE8]">
                              {a.hero ? <Image src={a.hero.url} alt="" fill sizes="56px" className="object-cover transition-transform duration-500 group-hover:scale-110" /> : <span className="flex size-full items-center justify-center text-coral/70"><Icon name="utensils" size={20} /></span>}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold leading-snug text-ink group-hover:text-coral">{a.name}</span>
                              {a.summary ? <span className="line-clamp-2 text-xs leading-relaxed text-[#666]">{a.summary}</span> : null}
                            </span>
                            <Icon name="arrowRight" size={15} className="shrink-0 text-[#999] transition group-hover:translate-x-0.5 group-hover:text-coral" />
                          </>
                        );
                        return (
                          <li key={a.slug} className="flex">
                            {to ? <Link href={to} className="group flex w-full items-center gap-3 rounded-2xl border border-line bg-white p-2.5 pr-3.5 transition hover:-translate-y-0.5 hover:shadow-card">{inner}</Link> : <div className="flex w-full items-center gap-3 rounded-2xl border border-line bg-white p-2.5 pr-3.5">{inner}</div>}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
              </div>
            </Block>
          ) : null}

          {/* 8. Detailed planning */}
          {planTabs.length ? (
            <Block id="plan" eyebrow="Practical information" title={`Plan your ${place.name} trip`}>
              <Tabs variant="side" label="Plan your trip" tabs={planTabs} />
            </Block>
          ) : null}

          {/* 9. FAQs and nearby */}
          {faqs || nearby.length ? (
            <div className={`grid gap-10 ${faqs && nearby.length ? "@4xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]" : ""}`}>
              {faqs ? <Block id="faqs" eyebrow="Good to know" title="Frequently asked questions"><FaqList s={faqs} /></Block> : null}
              {nearby.length ? (
                <Block id="nearby" eyebrow="Go further" title="Nearby and day trips">
                  <ul className="grid gap-3 @xl:grid-cols-2">
                    {nearby.map((r) => {
                      const to = link(relatedHref(r));
                      const inner = (
                        <>
                          <span className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-sand">
                            {r.hero && r.hero.kind === "photo" ? <Image src={r.hero.url} alt="" fill sizes="64px" className="object-cover" /> : <span className="flex size-full items-center justify-center text-muted/50"><Icon name="mountain" size={20} /></span>}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[0.6875rem] font-semibold uppercase tracking-wider text-[#666]">{r.type === "day_trip" ? "Day trip" : "Nearby"} · {kindLabel(r.kind)}</span>
                            <span className="block truncate font-semibold text-ink">{r.name}</span>
                            {r.summary ? <span className="line-clamp-2 text-xs text-muted">{r.summary}</span> : null}
                          </span>
                        </>
                      );
                      return (
                        <li key={`${r.slug}-${r.type}`}>
                          {to ? <Link href={to} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3 transition hover:-translate-y-0.5 hover:border-coral">{inner}</Link> : <div className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3">{inner}</div>}
                        </li>
                      );
                    })}
                  </ul>
                </Block>
              ) : null}
            </div>
          ) : null}

          {/* 10. AI travel planner */}
          {preview ? null : (
            <section id="planner" aria-labelledby="ask-h" className="relative scroll-mt-36 overflow-hidden rounded-3xl bg-[#1F3F2C] text-white">
              {hero && hero.kind === "photo" ? (
                <>
                  <Image src={hero.url} alt="" fill sizes="(min-width: 1024px) 860px, 100vw" className="object-cover opacity-30" />
                  <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-[#1F3F2C] via-[#1F3F2C]/90 to-[#1F3F2C]/40" />
                </>
              ) : null}
              <div className="relative max-w-xl p-6 @xl:p-9">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#F3B6A6]"><Icon name="sparkles" size={14} /> AI travel planner</p>
                <h2 id="ask-h" className="mt-1.5 font-serif text-[1.625rem] font-medium leading-tight @3xl:text-[2rem]">Plan your {place.name} trip in minutes</h2>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-white/85">Get a day-by-day plan, how to get there and what to see. It answers from this guide first and shows the source for anything it looks up.</p>
                <div className="mt-5"><AskBox placeName={place.name} tone="hero" /></div>
                <Link href={routes.chatWithPrompt(plannerPrompt)} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-white/90 hover:text-white hover:underline">Or start with “{plannerPrompt}” <Icon name="arrowRight" size={14} /></Link>
              </div>
            </section>
          )}
        </div>
      </div>
    </article>
  );
}
