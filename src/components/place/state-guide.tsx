import type { ReactNode } from "react";
import Image from "@/components/media/image";
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
import { FilterCards, PlanAiButton, PracticalTabs, RegionAccordion, SeasonPanels, SectionNav, type RegionGeo, type SeasonPanel } from "./state-guide-client";
import { INDIA_MAP_PATHS } from "@/components/home/india-map-data";
import { shapeStates } from "@/components/home/regions";
import { pathBBox, projectIndia } from "@/lib/india-svg-geo";
import "./state-guide.css";

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

type PracticalHighlight = {
  emergency: { label?: string; title: string; subtitle: string; icon?: Name };
  permit: { label: string; title: string; subtitle: string; icon: Name };
  rule: { label: string; title: string; subtitle: string; icon: Name };
};

const STATE_PRACTICAL_HIGHLIGHTS: Record<string, PracticalHighlight> = {
  uttarakhand: {
    emergency: {
      label: "Emergency Contacts",
      title: "Dial 112 or 108",
      subtitle: "112 for police, fire & medical; 108 for 24x7 emergency mountain ambulance.",
      icon: "shield",
    },
    permit: {
      label: "Mandatory Registration",
      title: "Biometric Yatra Registration",
      subtitle: "Free QR registration at registrationandtouristcare.uk.gov.in mandatory for Char Dham & Hemkund.",
      icon: "fileText",
    },
    rule: {
      label: "Sacred Valley Law",
      title: "Strict Dry & Veg Zones",
      subtitle: "Alcohol and non-vegetarian food strictly banned by law in Rishikesh, Haridwar & holy pilgrimage towns.",
      icon: "checkCircle",
    },
  },
  "himachal-pradesh": {
    emergency: {
      label: "Emergency Contacts",
      title: "Dial 112 or 108",
      subtitle: "112 for police, fire & medical; 108 for free 24x7 emergency ambulance.",
      icon: "shield",
    },
    permit: {
      label: "Vehicle Pass",
      title: "Rohtang Pass Permit",
      subtitle: "₹500 + ₹50 congestion fee. Daily quota; printed copy mandatory.",
      icon: "fileText",
    },
    rule: {
      label: "Environmental Law",
      title: "Polythene Banned",
      subtitle: "Single-use plastic bags strictly prohibited statewide. Carry reusable cloth bags.",
      icon: "checkCircle",
    },
  },
  rajasthan: {
    emergency: {
      label: "Emergency Contacts",
      title: "Dial 112 or 100",
      subtitle: "112 for unified emergency response; 1363 for national 24x7 multi-lingual tourist assistance.",
      icon: "shield",
    },
    permit: {
      label: "Wildlife & Safari Permits",
      title: "Advance Online Safari Booking",
      subtitle: "Book Ranthambore & Sariska game drives 60–90 days in advance via official SSO/FMDSS portal.",
      icon: "fileText",
    },
    rule: {
      label: "Heritage Etiquette",
      title: "Dress Code & Sacred Ghats",
      subtitle: "Remove footwear; cover shoulders and knees at Pushkar ghats, Brahma temple, and active shrines.",
      icon: "checkCircle",
    },
  },
  goa: {
    emergency: {
      label: "Emergency Contacts",
      title: "Dial 112 or 108",
      subtitle: "112 for police emergency; 108 for medical; Drishti Marine lifeguard towers on all active beaches.",
      icon: "shield",
    },
    permit: {
      label: "Local Commute",
      title: "GoaMiles App & Rental Taxis",
      subtitle: "Ola & Uber do not operate. Use government GoaMiles app or self-drive registered black-yellow scooters.",
      icon: "compass",
    },
    rule: {
      label: "Beach Safety Law",
      title: "No Drinking on Open Sands",
      subtitle: "Fines up to ₹2,000 for public drinking on beaches. Strictly obey red flag swimming advisories.",
      icon: "checkCircle",
    },
  },
  kerala: {
    emergency: {
      label: "Emergency Contacts",
      title: "Dial 112 or 108",
      subtitle: "112 for police/fire; 108 for free 24x7 ambulance; 1091 for 24-hr women's helpline.",
      icon: "shield",
    },
    permit: {
      label: "Houseboat Regulations",
      title: "DTPC Approved Houseboats",
      subtitle: "Book official DTPC-certified 'Green Palm' or 'Gold Star' houseboats with mandated life jackets & certified crew.",
      icon: "fileText",
    },
    rule: {
      label: "Eco & Wildlife Law",
      title: "Plastic-Free Shola & Sanctuaries",
      subtitle: "Single-use plastics strictly banned in Eravikulam & Periyar. Strictly respect temple dress codes (dhoti/sari).",
      icon: "checkCircle",
    },
  },
  "jammu-and-kashmir": {
    emergency: {
      label: "Emergency Contacts",
      title: "Dial 112 or 108",
      subtitle: "112 for unified police/fire; 108 for 24x7 ambulance; 1800-103-1060 for J&K Tourist Police Helpline.",
      icon: "shield",
    },
    permit: {
      label: "SIM Card Regulations",
      title: "Postpaid SIM Only",
      subtitle: "Prepaid SIM cards from outside J&K do not work. Carry an Indian postpaid connection or buy a local SIM in Srinagar.",
      icon: "fileText",
    },
    rule: {
      label: "Yatra & Activity Safety",
      title: "RFID Registration & Gondola Quotas",
      subtitle: "Mandatory RFID cards for Vaishno Devi & Amarnath yatras. Pre-book Gulmarg Gondola exclusively on official JKCCC portal.",
      icon: "checkCircle",
    },
  },
};

const DEFAULT_PRACTICAL_HIGHLIGHT: PracticalHighlight = {
  emergency: {
    label: "Emergency Contacts",
    title: "Dial 112 or 108",
    subtitle: "112 unified emergency helpline across India; 108 for free 24x7 ambulance.",
    icon: "shield",
  },
  permit: {
    label: "Permits & Passes",
    title: "Entry & Activity Permits",
    subtitle: "Check local district portal for national park safaris, monument composite tickets, and camera fees.",
    icon: "fileText",
  },
  rule: {
    label: "Responsible Travel",
    title: "Eco & Cultural Etiquette",
    subtitle: "Respect local dress codes at spiritual sanctuaries and avoid single-use plastics.",
    icon: "checkCircle",
  },
};

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
function Credit({ img, tone = "light", compact = false }: { img: SnapshotImage; tone?: "light" | "dark"; compact?: boolean }) {
  const color = tone === "dark" ? "text-[#888888]" : "text-white/80";
  const by = img.attribution && compact && img.attribution.length > 60 ? `${img.attribution.slice(0, 57).trimEnd()}…` : img.attribution;
  if (img.kind === "ai_generated") return <p className={`text-[0.6875rem] ${color}`}>AI-generated illustration — not a photograph of the place.</p>;
  return (
    <p className={`text-[0.6875rem] ${color}`}>
      {by ? <><span title={img.attribution ?? undefined}>Photo: {by}</span> · </> : null}
      {img.licenseUrl && /^https?:\/\//.test(img.licenseUrl) ? <a href={img.licenseUrl} {...ext} rel="license nofollow noopener noreferrer" className="underline">{img.license}</a> : img.license}
      {img.sourceUrl && /^https?:\/\//.test(img.sourceUrl) ? <> · <a href={img.sourceUrl} {...ext} className="underline">source</a></> : null}
    </p>
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
      {children}
    </div>
  );
}

function SectionHead({ id, eyebrow, title, intro, more }: { id: string; eyebrow: string; title: string; intro?: string; more?: { href: string; label: string } | null }) {
  return (
    <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-coral">{eyebrow}</p>
        <h2 id={`${id}-h`} className="mt-2 font-serif text-[clamp(1.75rem,3vw,2.4rem)] font-normal leading-tight tracking-[-0.015em] text-ink">{title}</h2>
        {intro ? <p className="mt-2 max-w-2xl text-[0.9375rem] leading-relaxed text-[#666666]">{intro}</p> : null}
      </div>
      {more ? (
        <Link href={more.href} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-ink underline decoration-[#D9D4CC] underline-offset-4 hover:decoration-coral">
          {more.label} <Icon name="arrowRight" size={14} />
        </Link>
      ) : null}
    </div>
  );
}

/** "Title: body" rows with a sure-or-not badge. */
/** "Siddu, a steamed bun…" → bold "Siddu" and the rest in grey. Uses the item title when there is one. */
function splitHead(it: Item): { head: string; rest: string } {
  if (it.title) return { head: it.title, rest: it.body };
  const m = /^(.{2,45}?)(?:\s[—–]\s|,\s)(.+)$/s.exec(it.body);
  return m ? { head: m[1], rest: m[2].replace(/\.$/, "") } : { head: "", rest: it.body };
}

function AboutRow({ it }: { it: Item }) {
  const { head, rest } = splitHead(it);
  return (
    <li className="py-2.5 text-sm leading-relaxed">
      {head ? <span className="font-medium text-ink">{head}</span> : null}
      {head ? <span className="text-[#CCCCCC]"> · </span> : null}
      <span className="text-[#666666]">{rest}</span>
    </li>
  );
}

/** First four items, the rest folded under "+N more" (no script needed). */
function AboutList({ items }: { items: Item[] }) {
  const first = items.slice(0, 4);
  const more = items.slice(4);
  return (
    <div className="mt-2">
      <ul className="divide-y divide-[#F2EEE8]">{first.map((it, i) => <AboutRow key={i} it={it} />)}</ul>
      {more.length ? (
        <details className="group">
          <summary className="mt-2 inline-flex group-open:mb-1 cursor-pointer list-none items-center gap-1 text-xs font-semibold text-[#777777] hover:text-coral [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">+{more.length} more</span><span className="hidden group-open:inline">Show less</span>
          </summary>
          <ul className="divide-y divide-[#F2EEE8] border-t border-[#F2EEE8]">{more.map((it, i) => <AboutRow key={i} it={it} />)}</ul>
        </details>
      ) : null}
    </div>
  );
}

/** The two facts that help decide on a place: when it is open, what it costs, or when to go. */
const VISIT_KEYS: { label: string; re: RegExp }[] = [
  { label: "Open", re: /^(opening )?hours|timings?$|^opening hours and/i },
  { label: "Entry", re: /fee|ticket|price|^entry|entrance/i },
  { label: "Best time", re: /best (time|season)|^season|^when$/i },
];

function VisitFacts({ items }: { items: Item[] }) {
  const rows = VISIT_KEYS.map((k) => {
    const it = items.find((x) => k.re.test(x.title ?? "") && x.status !== "unconfirmed" && !/not (yet )?confirmed|unconfirmed|no official|unknown/i.test(x.body));
    return it ? { label: k.label, value: it.body } : null;
  }).filter(Boolean).slice(0, 2) as { label: string; value: string }[];
  if (!rows.length) return null;
  return (
    <dl className="mt-3 space-y-1 border-t border-[#F0ECE6] pt-3 text-[0.8125rem]">
      {rows.map((r) => (
        <div key={r.label} className="flex gap-3">
          <dt className="w-[4.5rem] shrink-0 text-[#999999]">{r.label}</dt>
          <dd className="line-clamp-1 min-w-0 text-ink" title={r.value}>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

// How to reach: a stock photo per way in. Licences: CC0 or CC BY-SA, credited under the cards.
const REACH_MODE: Record<"air" | "rail" | "road" | "sea", { title: string; icon: Name; img: string; alt: string; credit: string; src: string }> = {
  air: { title: "By air", icon: "plane", img: "/transport/air.webp", alt: "The terminal of Kempegowda International Airport, Bengaluru", credit: "Bengaluru airport, sarangib (CC0)", src: "https://commons.wikimedia.org/wiki/File:Kempegowda-international-airport.jpg" },
  rail: { title: "By rail", icon: "train", img: "/transport/rail.webp", alt: "Electric trains crossing green farmland in rural India", credit: "Trains in rural India, Saishna96 (CC BY-SA 4.0)", src: "https://commons.wikimedia.org/wiki/File:Electric_Trains_in_Rural_India_Landscape.jpg" },
  road: { title: "By road", icon: "car", img: "/transport/road.webp", alt: "The lit Ahmedabad–Vadodara Expressway at night", credit: "Ahmedabad–Vadodara Expressway, Ridham Nagralawala (CC0)", src: "https://commons.wikimedia.org/wiki/File:Ahmedabad%E2%80%93Vadodara_Expressway,_India_(2015).jpg" },
  sea: { title: "By sea", icon: "waves", img: "/transport/sea.webp", alt: "A Kochi Water Metro boat crossing the harbour", credit: "Kochi Water Metro, Tarunsamanta (CC BY-SA 4.0)", src: "https://commons.wikimedia.org/wiki/File:Water_metro_boat_at_Vypin_in_kochi_07.jpg" },
};
const REACH_RE: [keyof typeof REACH_MODE, RegExp][] = [
  ["air", /\b(air(ports?|strips?|ways?)?|fly|flights?|flying)\b|\bby air\b/i],
  ["rail", /\b(rail(way|head)?s?|trains?|stations?|metro)\b/i],
  ["sea", /\b(ferr(y|ies)|ships?|sail|boats?|cruises?|jett(y|ies)|harbour|sea)\b/i],
  ["road", /\b(road|bus(es)?|drive|driving|highways?|expressways?|taxis?|cars?|NH\s?\d+)\b/i],
];
/** Which way in a sentence is about: the mode whose keyword appears first. */
function modeOf(text: string): keyof typeof REACH_MODE | null {
  let best: { m: keyof typeof REACH_MODE; at: number } | null = null;
  for (const [m, re] of REACH_RE) {
    const hit = re.exec(text);
    if (hit && (!best || hit.index < best.at)) best = { m, at: hit.index };
  }
  return best?.m ?? null;
}
/**
 * Sorts the how-to-reach text into ways in. "By air: …" paragraphs are used as written; plain
 * paragraphs are split into sentences and sorted by their first transport word. Anything else
 * (permits, tips) becomes a note.
 */
function splitReach(text: string, items: Item[]) {
  const buckets = new Map<keyof typeof REACH_MODE, string[]>();
  const notes: string[] = [];
  const add = (m: keyof typeof REACH_MODE | null, line: string) => (m ? buckets.set(m, [...(buckets.get(m) ?? []), line]) : notes.push(line));
  for (const para of paragraphs(text)) {
    const lab = labelled(para);
    const labMode = lab ? modeOf(lab.label) : null;
    if (lab && labMode) { add(labMode, lab.text); continue; }
    for (const sent of para.split(/(?<=[.!?])\s+(?=[A-Z])/)) add(modeOf(sent), sent.trim());
  }
  for (const it of items) add(modeOf(`${it.title ?? ""} ${it.body}`), it.title ? `${it.title}: ${it.body}` : it.body);
  const order: (keyof typeof REACH_MODE)[] = ["air", "rail", "road", "sea"];
  return { modes: order.filter((m) => buckets.has(m)).map((m) => ({ mode: m, lines: buckets.get(m)! })), notes };
}
/** Picks out distances and times (e.g. "35 km", "5 hours", "1,190 km") in bold. */
function highlightTrip(text: string): ReactNode[] {
  const re = /(\b(?:about |around |some )?\d[\d,.]*(?:–\d[\d,.]*)?\s?(?:km|kilometres|hours?|hrs?|minutes?|mins?)\b)/gi;
  return text.split(re).map((part, i) => (i % 2 ? <strong key={i} className="font-semibold text-ink">{part}</strong> : part));
}

function formatPoint(body: string) {
  const clauseMatch = /^([^—;–]+[—;–])\s*(.*)$/s.exec(body);
  if (clauseMatch && clauseMatch[1].length < 100) {
    return { lead: clauseMatch[1], rest: clauseMatch[2] };
  }
  const firstSentenceMatch = /^([^.!?]+[.!?])\s*(.*)$/s.exec(body);
  if (firstSentenceMatch && firstSentenceMatch[1].length < 120) {
    return { lead: firstSentenceMatch[1], rest: firstSentenceMatch[2] };
  }
  return { lead: body, rest: "" };
}

function PracticalPointItem({ it }: { it: Item }) {
  const { lead, rest } = formatPoint(it.body);
  const icon = factIcon(it.title);
  return (
    <li className="flex items-start gap-3 rounded-xl border border-[#EFECE6] bg-[#FAF9F5]/70 p-3.5 transition-colors hover:border-coral/50 hover:bg-white">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-[#EAE6DE] bg-white text-emerald-800 shadow-2xs">
        <Icon name={icon} size={13} />
      </span>
      <div className="min-w-0 flex-1 text-[0.8125rem]">
        <div className="flex flex-wrap items-center gap-1.5 leading-snug">
          {it.title ? (
            <span className="rounded bg-coral/10 px-1.5 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wider text-coral">
              {it.title}
            </span>
          ) : null}
          <strong className="font-semibold text-ink">{lead}</strong>
          {it.status ? <StatusPill status={it.status} className="ml-1" /> : null}
        </div>
        {rest ? <p className="mt-1 text-[0.75rem] leading-relaxed text-[#666]">{rest}</p> : null}
      </div>
    </li>
  );
}

function PracticalParagraphItem({ text }: { text: string }) {
  const { lead, rest } = formatPoint(text);
  const icon = /train|rail/i.test(text) ? "train" : /flight|airport|air/i.test(text) ? "plane" : /bus|volvo|coach/i.test(text) ? "bus" : "car";
  return (
    <li className="flex items-start gap-3 rounded-xl border border-[#EFECE6] bg-[#FAF9F5]/70 p-3.5 transition-colors hover:border-coral/50 hover:bg-white">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-[#EAE6DE] bg-white text-emerald-800 shadow-2xs">
        <Icon name={icon} size={13} />
      </span>
      <div className="min-w-0 flex-1 text-[0.8125rem]">
        <strong className="font-semibold leading-snug text-ink">{lead}</strong>
        {rest ? <p className="mt-1 text-[0.75rem] leading-relaxed text-[#666]">{rest}</p> : null}
      </div>
    </li>
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

  const all = [...rollup.destinations, ...rollup.attractions, ...rollup.activities];
  const inside = (id: string) => all.filter((x) => x.parentId === id).length;
  // Cities, then valleys, then towns; within each, the ones with more places inside first.
  const KIND_RANK: Record<string, number> = { city: 0, region: 1, town: 2 };
  const destinations = [...rollup.destinations].sort((a, b) => a.depth - b.depth || (KIND_RANK[a.kind] ?? 3) - (KIND_RANK[b.kind] ?? 3) || inside(b.id) - inside(a.id) || a.name.localeCompare(b.name));
  // Coastal states read better as beach towns; mountain states keep the original wording.
  const destEyebrow = destinations.filter((x) => x.tripTypes.includes("beaches")).length * 2 >= destinations.length && destinations.length > 0 ? "Beach towns & cities" : "Towns, valleys & hill stations";
  // Unconfirmed details go last on a card.
  const sure = (list: Item[]) => [...list].sort((a, b) => Number(a.status === "unconfirmed") - Number(b.status === "unconfirmed"));
  const attractions = rollup.attractions
    .filter((a) => pageOf(a))
    .sort((a, b) => Number(!!b.facts?.visit_info) - Number(!!a.facts?.visit_info) || Number(!!b.hero) - Number(!!a.hero) || a.depth - b.depth);
  const activities = rollup.activities.filter((a) => pageOf(a)).sort((a, b) => Number(!!b.hero) - Number(!!a.hero));
  // Guides written for the whole state; town guides stay on their town's page (used here only when the state has none).
  const stateGuides = rollup.guides.filter((g) => g.placeName === name);
  const guides = stateGuides.length ? stateGuides : rollup.guides;
  // Only plans made for the whole state; town plans live on their town's page (used here only when the state has none).
  const statePlans = rollup.itineraries.filter((it) => it.placeName === name);
  const itineraries = (statePlans.length ? statePlans : rollup.itineraries).sort((a, b) => a.durationDays - b.durationDays);

  // Seasonal access, straight from the places' own visiting info.
  const seasonal = [...rollup.attractions, ...rollup.activities]
    .flatMap((p) => (p.facts?.visit_info?.items ?? []).filter((it) => /^(season|winter|closed)/i.test(it.title ?? "") && it.status !== "unconfirmed").slice(0, 1).map((it) => ({ p, it })))
    .slice(0, 6);

  // How to reach and best time: paragraphs written as "Label: text" become cards.
  const reachModes = reach ? splitReach(reach.body.text ?? "", reach.body.items ?? []) : null;

  const seasonParas = paragraphs(bestTime?.body.text);
  const seasonCards = seasonParas.map(labelled);
  const seasonSplit = seasonCards.length > 1 && seasonCards.every(Boolean);

  // Seasons that name a time of year become photo panels; other labelled notes (a region, the roads) go below.
  const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const monthsOf = (when: string | null) => {
    const found = [...(when ?? "").toLowerCase().matchAll(/jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/g)].map((m) => MONTHS.indexOf(m[0]));
    if (!found.length) return [];
    const [a, b] = [found[0], found[found.length - 1]];
    const out: number[] = [];
    for (let m = a; ; m = (m + 1) % 12) { out.push(m); if (m === b || out.length > 12) break; }
    return out;
  };
  const SNOWY = /snow|ski|winter|frozen|ice|frost|glacier/i;
  const SEASON_IMG: { re: RegExp; pick: RegExp; avoid?: RegExp }[] = [
    { re: /winter|snow/i, pick: SNOWY },
    { re: /autumn|post-monsoon|festive|october/i, pick: /festival|dussehra|autumn|orchard|apple|fair|monastery|gompa/i, avoid: SNOWY },
    { re: /monsoon|rain/i, pick: /monsoon|rain|waterfall|mist|cloud|river|forest|tea/i, avoid: SNOWY },
    { re: /summer|spring/i, pick: /meadow|lake|summer|trek|paraglid|blossom|flower|camp/i, avoid: SNOWY },
  ];
  // "November–February: …" labels are seasons too: name them from their months, keep the months as "when".
  const seasonName = (ms: number[]) =>
    ms.includes(0) || ms.includes(11) ? "Winter" : ms.some((m) => m >= 6 && m <= 8) ? "Monsoon" : ms.some((m) => m >= 3 && m <= 5) ? "Summer" : ms.some((m) => m === 9 || m === 10) ? "Autumn" : "Spring";
  const seasonCardsOk = (seasonSplit ? (seasonCards as NonNullable<(typeof seasonCards)[number]>[]) : []).map((c) => {
    const ms = monthsOf(c.label);
    return ms.length && !SEASON_IMG.some((x) => x.re.test(c.label)) && !c.when ? { ...c, label: seasonName(ms), when: c.label } : c;
  });
  const isSeason = (label: string) => SEASON_IMG.some((x) => x.re.test(label));
  const imgPool = [...destinations, ...attractions, ...activities].filter((x) => x.hero);
  const usedImg = new Set<string>();
  const imgText = (x: (typeof imgPool)[number]) => `${x.hero!.alt} ${x.name}`;
  // Pick photos rule by rule (most specific first), then lay the panels out in the text's order.
  const picked = new Map<string, (typeof imgPool)[number]>();
  for (const rule of SEASON_IMG) {
    for (const c of seasonCardsOk.filter((c) => rule.re.test(c.label) && !picked.has(c.label))) {
      const ok = (x: (typeof imgPool)[number]) => !usedImg.has(x.hero!.url) && !(rule.avoid && rule.avoid.test(imgText(x)));
      const hit = imgPool.find((x) => ok(x) && rule.pick.test(imgText(x))) ?? imgPool.find(ok);
      if (hit) { usedImg.add(hit.hero!.url); picked.set(c.label, hit); }
    }
  }
  const seasonPanels: SeasonPanel[] = seasonCardsOk.filter((c) => isSeason(c.label)).map((c) => {
    const hit = picked.get(c.label);
    return { label: c.label, when: c.when, text: c.text, months: monthsOf(c.when ?? c.label), image: hit ? { url: hit.hero!.url, alt: hit.hero!.alt, ai: hit.hero!.kind === "ai_generated" } : null };
  });
  const seasonNotes = seasonPanels.length > 1 ? seasonCardsOk.filter((c) => !isSeason(c.label)) : [];

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

  // Each destination is linked under its best matching region.
  const regionTowns: RollupPlace[][] = regions.map(() => []);
  const used = new Set<string>();

  // Pass 1: match by region title first (e.g. "Kinnaur", "Lahaul and Spiti")
  regions.forEach((r, idx) => {
    const title = (r.title ?? "").toLowerCase();
    destinations.forEach((d) => {
      if (used.has(d.slug)) return;
      const dName = d.name.toLowerCase();
      const coreWord = dName.replace(/\s+valley|\s+town/g, "").trim();
      if (title.includes(dName) || (coreWord.length > 3 && new RegExp(`\\b${coreWord}\\b`, "i").test(title))) {
        regionTowns[idx].push(d);
        used.add(d.slug);
      }
    });
  });

  // Pass 2: match remaining destinations in region body (avoiding transit-only mentions like "via Kinnaur")
  regions.forEach((r, idx) => {
    const body = r.body.toLowerCase();
    destinations.forEach((d) => {
      if (used.has(d.slug)) return;
      const dName = d.name.toLowerCase();
      const coreWord = dName.replace(/\s+valley|\s+town/g, "").trim();
      const transitPattern = new RegExp(`\\bvia\\s+${dName}\\b|\\bvia\\s+${coreWord}\\b`, "i");
      if (transitPattern.test(body) && !body.replace(transitPattern, "").includes(coreWord)) {
        return;
      }
      if (body.includes(dName) || (coreWord.length > 3 && new RegExp(`\\b${coreWord}\\b`, "i").test(body))) {
        regionTowns[idx].push(d);
        used.add(d.slug);
      }
    });
  });

  const sources = [...new Map(snapshot.sections.flatMap((s) => s.sources ?? []).filter((s: SectionSource) => /^https?:\/\//.test(s.url)).map((s) => [s.url, s])).values()];

  const nearbyStates = related.filter((r) => r.kind === "state");

  // Menu: only parts that are on the page.
  // Line-drawn map for the regions block: this state's outline, neighbours in faint lines, every destination as a dot.
  const regionGeo: RegionGeo | null = (() => {
    if (!regions.length) return null;
    const shape = INDIA_MAP_PATHS.find((p) => shapeStates(p.id, p.name).some((x) => x.slug === stateSlug));
    if (!shape) return null;
    const [x0, y0, x1, y1] = pathBBox(shape.path);
    if (![x0, y0, x1, y1].every(Number.isFinite)) return null;
    const pad = Math.max(x1 - x0, y1 - y0) * 0.1;
    const view: [number, number, number, number] = [x0 - pad, y0 - pad, x1 - x0 + pad * 2, y1 - y0 + pad * 2];
    const context = INDIA_MAP_PATHS.filter((p) => p !== shape).filter((p) => {
      const [a, b, c, d] = pathBBox(p.path);
      return c >= view[0] && a <= view[0] + view[2] && d >= view[1] && b <= view[1] + view[3];
    }).map((p) => p.path);
    const all = destinations.filter((d) => d.lat != null && d.lng != null).map((d) => ({ name: d.name, ...projectIndia(d.lat!, d.lng!) }));
    return { view, state: shape.path, context, all };
  })();

  const nav = [
    { id: "overview", label: "About", on: !!overview },
    { id: "destinations", label: "Destinations", on: destinations.length > 0 },
    { id: "regions", label: "Regions", on: regions.length > 0 },
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

  return (
    <div className="min-h-screen bg-white font-sans text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      {/* A. Hero: clean and white. Title and summary, a one-row facts bar, then a wide photo. */}
      <section className="sg-hero bg-white">
        <div className="container-site pb-10 pt-6 sm:pt-8 lg:pb-14">
          <nav aria-label="Breadcrumb" className="sg-in flex flex-wrap items-center gap-2 text-xs text-[#888888]">
            <Link href="/" className="transition-colors hover:text-ink">Home</Link>
            <span className="text-[#CCCCCC]">/</span>
            <Link href="/india" className="transition-colors hover:text-ink">Explore India</Link>
            <span className="text-[#CCCCCC]">/</span>
            <span className="font-medium text-ink" aria-current="page">{name}</span>
          </nav>

          <div className="mt-5 grid gap-5 lg:grid-cols-12 lg:items-end lg:gap-10">
            <div className="sg-in lg:col-span-7" style={{ ["--d" as string]: "60ms" }}>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-coral">{zone ? `${zone} India · ` : ""}State guide</p>
              <h1 className="mt-2 font-serif text-[clamp(2.4rem,5.2vw,4.25rem)] font-normal leading-[1.02] tracking-[-0.025em] text-ink">{name}</h1>
            </div>
            <div className="sg-in lg:col-span-5" style={{ ["--d" as string]: "120ms" }}>
              {place.summary ? <p className="text-[0.975rem] leading-relaxed text-[#555555]">{place.summary}</p> : null}
              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                {destinations.length ? (
                  <a href="#destinations" className="inline-flex items-center gap-2 rounded-full bg-ink px-4.5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-coral">
                    Explore destinations <Icon name="arrowRight" size={14} />
                  </a>
                ) : null}
                <PlanAiButton prompt={planPrompt} className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#E5E2DC] bg-white px-4.5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-coral hover:text-coral">
                  <Icon name="sparkles" size={15} className="text-coral" /> Plan with AI
                </PlanAiButton>
              </div>
            </div>
          </div>

          {keyFacts.length ? (
            <dl className="sg-in mt-8 grid grid-cols-2 overflow-hidden rounded-2xl border border-[#ECE8E2] bg-[#FBFAF8] lg:grid-cols-4" style={{ ["--d" as string]: "180ms" }}>
              {keyFacts.slice(0, 4).map((f, i) => (
                <div key={i} className="flex items-start gap-3 border-[#ECE8E2] p-4 max-lg:[&:nth-child(-n+2)]:border-b max-lg:[&:nth-child(odd)]:border-r lg:[&:not(:last-child)]:border-r">
                  <Icon name={factIcon(f.title)} size={16} className="mt-0.5 shrink-0 text-coral" />
                  <div className="min-w-0">
                    {f.title ? <dt className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[#999999]">{f.title}</dt> : null}
                    <dd className="mt-0.5 line-clamp-2 text-sm font-medium leading-snug text-ink" title={f.body}>{f.body}</dd>
                  </div>
                </div>
              ))}
            </dl>
          ) : null}

          <figure className="sg-in mt-4" style={{ ["--d" as string]: "240ms" }}>
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[#ECE8E0] sm:aspect-[16/8] lg:aspect-[12/5]">
              {place.hero ? <Image src={place.hero.url} alt={place.hero.alt} fill priority sizes="(min-width: 1280px) 1200px, 100vw" className="sg-hero__img object-cover" /> : <span className="flex size-full items-center justify-center text-[#B8B2A6]"><Icon name="mountain" size={40} /></span>}
              <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-md bg-white/90 px-2.5 py-1 text-xs font-semibold text-ink backdrop-blur-sm">
                <Icon name="pin" size={12} className="text-coral" /> {name}
              </span>
              {destinations.length || attractions.length || activities.length ? (
                <span className="absolute bottom-3 right-3 hidden items-center gap-3 rounded-md bg-white/90 px-3 py-1 text-xs text-[#555555] backdrop-blur-sm sm:inline-flex">
                  {[
                    { n: destinations.length, l: "destinations" },
                    { n: attractions.length, l: "places" },
                    { n: activities.length, l: "things to do" },
                  ].filter((x) => x.n > 0).map((x) => (
                    <span key={x.l}><b className="font-semibold text-ink">{x.n}</b> {x.l}</span>
                  ))}
                </span>
              ) : null}
            </div>
            {place.hero ? <figcaption className="mt-2 text-right"><Credit img={place.hero} tone="dark" compact /></figcaption> : null}
          </figure>
        </div>
      </section>

      {/* Section menu */}
      {nav.length > 1 ? (
        <SectionNav items={nav.map(({ id, label }) => ({ id, label }))}>
          <PlanAiButton prompt={planPrompt} className="hidden shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-coral sm:inline-flex">
            <Icon name="sparkles" size={12} /> Plan with AI
          </PlanAiButton>
        </SectionNav>
      ) : null}

      <main className="container-site space-y-16 py-10 sm:space-y-20 sm:py-14">
        {/* B. About: a short read, the facts not already in the hero, then food, festivals and etiquette in three short lists */}
        {overview || keyFacts.length > 4 || food.length || highlights.length || culture.length ? (
          <section id="overview" aria-labelledby="overview-h" className="scroll-mt-36">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
              <div className={keyFacts.length > 4 ? "lg:col-span-7" : "lg:col-span-9"}>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-coral">State overview</p>
                <h2 id="overview-h" className="mt-2 font-serif text-[clamp(1.75rem,3vw,2.4rem)] font-normal leading-tight tracking-[-0.015em] text-ink">About {name}</h2>
                {overview ? (() => {
                  const ps = paragraphs(overview.body.text);
                  return (
                    <div className="mt-5 space-y-4 text-[1rem] leading-[1.75] text-[#4A4A4A]">
                      {ps.slice(0, 2).map((p, i) => <p key={i} className={i === 0 ? "text-[1.0625rem] text-[#333333]" : undefined}>{p}</p>)}
                      {ps.length > 2 ? (
                        <details className="sg-more group">
                          <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-sm font-semibold text-ink underline decoration-[#D9D4CC] underline-offset-4 hover:decoration-coral [&::-webkit-details-marker]:hidden">
                            <span className="group-open:hidden">Read more</span><span className="hidden group-open:inline">Show less</span>
                            <Icon name="chevronDown" size={14} className="transition-transform group-open:rotate-180" />
                          </summary>
                          <div className="mt-4 space-y-4">{ps.slice(2).map((p, i) => <p key={i}>{p}</p>)}</div>
                        </details>
                      ) : null}
                    </div>
                  );
                })() : null}
              </div>

              {keyFacts.length > 4 ? (
                <aside className="lg:col-span-5 lg:border-l lg:border-[#ECE8E2] lg:pl-10">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#999999]">At a glance</h3>
                  <dl className="mt-3 divide-y divide-[#F0ECE6]">
                    {keyFacts.slice(4).map((f, i) => (
                      <div key={i} className="grid grid-cols-[7.5rem_1fr] gap-4 py-3 text-sm">
                        <dt className="text-[#888888]">{f.title}</dt>
                        <dd className="font-medium leading-snug text-ink">{f.body}</dd>
                      </div>
                    ))}
                  </dl>
                </aside>
              ) : null}
            </div>

            {(() => {
              const cols = [
                { id: "food", title: "What to eat", icon: "utensils" as Name, list: food },
                { id: "festivals", title: "Festivals", icon: "calendar" as Name, list: highlights },
                { id: "etiquette", title: "Respect local ways", icon: "heart" as Name, list: culture },
              ].filter((c) => c.list.length);
              if (!cols.length) return null;
              const grid = cols.length === 3 ? "md:grid-cols-3" : cols.length === 2 ? "md:grid-cols-2" : "";
              return (
                <div className={`mt-12 grid gap-x-10 gap-y-10 border-t border-[#ECE8E2] pt-10 ${grid}`}>
                  {cols.map((c) => (
                    <div key={c.id} id={c.id} className="scroll-mt-36">
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-ink"><Icon name={c.icon} size={16} className="text-coral" /> {c.title}</h3>
                      <AboutList items={c.list} />
                    </div>
                  ))}
                </div>
              );
            })()}
          </section>
        ) : null}

        {/* C. Destinations */}
        {destinations.length ? (
          <section id="destinations" aria-labelledby="destinations-h" className="scroll-mt-36">
            <SectionHead id="destinations" eyebrow={destEyebrow} title={`Destinations in ${name}`} intro="Open any destination for its full guide: what to see, where to stay and how to plan it." />
            <FilterCards
              label="Filter destinations"
              allLabel="All destinations"
              initial={8}
              gridClass="grid w-full grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4"
              items={destinations.map((d) => {
                const kf = d.facts?.key_facts?.items ?? [];
                const fact = kf.find((f) => /best time|season|when to go/i.test(f.title ?? "")) ?? kf.find((f) => /altitude|elevation/i.test(f.title ?? ""));
                const where = near(d);
                return {
                  key: d.slug,
                  groups: d.tripTypes.map(tripTypeLabel),
                  node: (
                    <Link href={pageOf(d)!} className="group block w-full">
                      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[#ECE8E0]">
                        {d.hero ? (
                          <Image src={d.hero.url} alt={d.hero.alt} fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]" />
                        ) : (
                          <span className="flex size-full items-center justify-center text-[#B8B2A6]"><Icon name="mountain" size={30} /></span>
                        )}
                        <span className="absolute left-3 top-3 rounded-md bg-white/90 px-2 py-0.5 text-[0.6875rem] font-semibold text-ink backdrop-blur-sm">{kindLabel(d.kind)}</span>
                      </div>
                      <div className="mt-3.5 px-0.5">
                        {where ? <p className="text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-[#999999]">Near {where}</p> : null}
                        <h3 className="mt-1 flex items-center justify-between gap-2 font-serif text-[1.3rem] leading-tight text-ink">
                          <span>{d.name}</span>
                          <Icon name="arrowRight" size={15} className="shrink-0 -translate-x-1 text-coral opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
                        </h3>
                        {d.summary ? <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-[#666666]">{d.summary}</p> : null}
                        {fact ? (
                          <p className="mt-2.5 flex items-start gap-1.5 text-xs text-[#777777]">
                            <Icon name={factIcon(fact.title)} size={13} className="mt-px shrink-0 text-coral" />
                            <span className="line-clamp-1"><span className="text-[#999999]">{fact.title}:</span> {fact.body}</span>
                          </p>
                        ) : null}
                      </div>
                    </Link>
                  ),
                };
              })}
            />
          </section>
        ) : null}

        {/* Regions & circuits */}
        {regions.length ? (
          <section id="regions" aria-labelledby="regions-h" className="scroll-mt-36">
            <SectionHead id="regions" eyebrow="Plan by region" title={`Regions of ${name}`} intro={`${name} is not one destination. Pick the region that fits your trip — the towns we cover in each are linked.`} />
            <RegionAccordion
              geo={regionGeo}
              regions={regions.map((r, i) => {
                const img = r.image ?? regionTowns[i][0]?.hero ?? null;
                return {
                  title: r.title ?? `Region ${i + 1}`,
                  body: r.body,
                  image: img ? { url: img.url, alt: img.alt, ai: img.kind === "ai_generated" } : null,
                  towns: regionTowns[i].map((d) => ({ name: d.name, href: pageOf(d)!, lat: d.lat, lng: d.lng, dot: regionGeo && d.lat != null && d.lng != null ? { name: d.name, ...projectIndia(d.lat, d.lng) } : null })),
                };
              })}
            />
          </section>
        ) : null}

        {/* D. Places to visit */}
        {attractions.length ? (
          <section id="places" aria-labelledby="places-h" className="scroll-mt-36">
            <SectionHead id="places" eyebrow="Monuments, nature & viewpoints" title={`Places to visit in ${name}`} intro="Opening hours, entry and permits at a glance. Open a place for its full guide." />
            <FilterCards
              label="Filter places"
              allLabel="All places"
              initial={6}
              gridClass="grid w-full grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3"
              items={attractions.map((a) => {
                const vi = sure(a.facts?.visit_info?.items ?? a.facts?.key_facts?.items ?? []);
                const permit = vi.find(isPermit);
                const href = pageOf(a)!;
                const where = near(a);
                return {
                  key: a.slug,
                  groups: [kindLabel(a.kind)],
                  node: (
                    <Link href={href} className="group block w-full">
                      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-[#ECE8E0]">
                        {a.hero ? (
                          <Image src={a.hero.url} alt={a.hero.alt} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]" />
                        ) : (
                          <span className="flex size-full items-center justify-center text-[#B8B2A6]"><Icon name="compass" size={30} /></span>
                        )}
                        <span className="absolute left-3 top-3 rounded-md bg-white/90 px-2 py-0.5 text-[0.6875rem] font-semibold text-ink backdrop-blur-sm">{kindLabel(a.kind)}</span>
                      </div>
                      <div className="mt-3.5 px-0.5">
                        {where ? <p className="text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-[#999999]">{where}</p> : null}
                        <h3 className="mt-1 flex items-center justify-between gap-2 font-serif text-[1.2rem] leading-tight text-ink">
                          <span>{a.name}</span>
                          <Icon name="arrowRight" size={15} className="shrink-0 -translate-x-1 text-coral opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
                        </h3>
                        {a.summary ? <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-[#666666]">{a.summary}</p> : null}
                        <VisitFacts items={vi} />
                        {permit ? (
                          <p className="mt-2 flex items-start gap-1.5 text-xs text-[#9A5B14]">
                            <Icon name="shield" size={13} className="mt-px shrink-0" />
                            <span className="line-clamp-1">Permit needed · {permit.body}</span>
                          </p>
                        ) : null}
                      </div>
                    </Link>
                  ),
                };
              })}
            />
          </section>
        ) : null}

        {/* E. Things to do */}
        {activities.length ? (
          <section id="things" aria-labelledby="things-h" className="scroll-mt-36">
            <SectionHead id="things" eyebrow="Adventure, culture & food" title={`Things to do in ${name}`} intro="Activities, festivals, food and shopping — with when to go and any permit you need." more={{ href: `/things-to-do?state=${stateSlug}`, label: "All things to do" }} />
            <FilterCards
              label="Filter experiences"
              allLabel="All"
              initial={8}
              gridClass="sg-rows grid w-full grid-cols-1 gap-x-10 border-t border-[#ECE8E2] lg:grid-cols-2"
              items={activities.map((a) => {
                const vi = (a.facts?.visit_info?.items ?? []).filter((x) => x.status !== "unconfirmed" && !/not (yet )?confirmed|unconfirmed/i.test(x.body));
                const whenIt = vi.find((x) => /^(season|when|closed|best time|dates?|open)\b/i.test(x.title ?? ""));
                const when = whenIt ? `${/^closed/i.test(whenIt.title ?? "") ? "Closed " : ""}${whenIt.body.replace(/\.$/, "")}` : null;
                const permit = vi.find(isPermit);
                const cat = categoryLabel(a.category);
                const where = near(a);
                return {
                  key: a.slug,
                  groups: cat ? [cat] : [],
                  node: (
                    <Link href={pageOf(a)!} className="group flex w-full items-start gap-4 border-b border-[#ECE8E2] py-4">
                      <span className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-[#ECE8E0] sm:size-24">
                        {a.hero ? (
                          <Image src={a.hero.url} alt={a.hero.alt} fill sizes="96px" className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.08]" />
                        ) : (
                          <span className="flex size-full items-center justify-center text-[#B8B2A6]"><Icon name="route" size={22} /></span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-[#999999]">
                          {cat}{cat && where ? " · " : ""}{where}
                        </span>
                        <span className="mt-0.5 flex items-start justify-between gap-2">
                          <span className="font-serif text-[1.1rem] leading-snug text-ink transition-colors group-hover:text-coral">{a.name}</span>
                          <Icon name="arrowRight" size={14} className="mt-1.5 shrink-0 -translate-x-1 text-coral opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
                        </span>
                        {a.summary ? <span className="mt-1 line-clamp-2 block text-sm leading-relaxed text-[#666666]">{a.summary}</span> : null}
                        {when || permit ? (
                          <span className="mt-2 flex flex-wrap gap-1.5">
                            {when ? (
                              <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-[#F3EFEA] px-2.5 py-0.5 text-xs text-ink">
                                <Icon name="calendar" size={11} className="shrink-0 text-coral" /> <span className="truncate">{when}</span>
                              </span>
                            ) : null}
                            {permit ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#FDF3E3] px-2.5 py-0.5 text-xs text-[#9A5B14]">
                                <Icon name="shield" size={11} /> Permit needed
                              </span>
                            ) : null}
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  ),
                };
              })}
            />
          </section>
        ) : null}

        {/* F. Best time: the seasons as photo panels, then short notes and seasonal access */}
        {bestTime ? (
          <section id="best-time" aria-labelledby="best-time-h" className="scroll-mt-36">
            <SectionHead id="best-time" eyebrow="When to go" title={`Best time to visit ${name}`} intro={seasonPanels.length > 1 ? "Each season suits a different trip. Point at one to see what to expect." : undefined} />
            {seasonPanels.length > 1 ? (
              <SeasonPanels seasons={seasonPanels} />
            ) : (
              <div className="flex gap-4 rounded-2xl bg-[#F6F1EA] p-6 sm:p-8">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-coral"><Icon name="calendar" size={18} /></span>
                <div className="max-w-3xl space-y-3 text-[1rem] leading-relaxed text-[#444]">
                  {seasonParas.map((p, i) => <p key={i} className={i === 0 ? "text-ink" : undefined}>{p}</p>)}
                </div>
              </div>
            )}

            {seasonNotes.length || bestTime.body.items?.length || seasonal.length ? (
              <div className="mt-10 grid gap-10 border-t border-[#ECE8E2] pt-8 lg:grid-cols-2">
                {seasonNotes.length || bestTime.body.items?.length ? (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#999999]">Good to know</h3>
                    <ul className="mt-2 divide-y divide-[#F2EEE8]">
                      {seasonNotes.map((n, i) => (
                        <li key={i} className="py-3 text-sm leading-relaxed">
                          <span className="font-medium text-ink">{n.label}</span>
                          {n.when ? <span className="text-[#999999]"> ({n.when})</span> : null}
                          <span className="text-[#CCCCCC]"> · </span>
                          <span className="text-[#666666]">{n.text}</span>
                        </li>
                      ))}
                      {(bestTime.body.items ?? []).map((it, i) => (
                        <li key={`i${i}`} className="py-3 text-sm leading-relaxed">
                          {it.title ? <><span className="font-medium text-ink">{it.title}</span><span className="text-[#CCCCCC]"> · </span></> : null}
                          <span className="text-[#666666]">{it.body}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {seasonal.length ? (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#999999]">When places open</h3>
                    <ul className="mt-2 divide-y divide-[#F2EEE8]">
                      {seasonal.map(({ p, it }) => (
                        <li key={p.slug} className="flex gap-4 py-3 text-sm">
                          <Link href={pageOf(p)!} className="w-40 shrink-0 font-medium text-ink hover:text-coral">{p.name}</Link>
                          <span className="min-w-0 text-[#666666]">{/^closed/i.test(it.title ?? "") ? "Closed " : ""}{it.body}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}

        {/* How to reach: one card per way in (air, rail, road, sea), distances and times picked out */}
        {reach && reachModes && (reachModes.modes.length || reachModes.notes.length) ? (
          <section id="reach" aria-labelledby="reach-h" className="scroll-mt-36">
            <SectionHead id="reach" eyebrow="Getting there" title={`How to reach ${name}`} intro={reachModes.modes.length > 1 ? "The main ways in, with the distances and times that matter." : undefined} />
            {reachModes.modes.length ? (
              <div className="reach relative">
                <svg aria-hidden className={`reach__route pointer-events-none absolute inset-x-0 top-0 hidden h-6 w-full ${reachModes.modes.length > 1 ? "lg:block" : ""}`} viewBox="0 0 100 6" preserveAspectRatio="none">
                  <path d="M2 3 H98" className="reach__line" fill="none" stroke="#E8553E" strokeWidth="2" strokeDasharray="2 7" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                </svg>
                <ol className={`relative grid gap-5 ${reachModes.modes.length === 1 ? "" : "sm:grid-cols-2 lg:pt-10"} ${reachModes.modes.length >= 4 ? "lg:grid-cols-4" : reachModes.modes.length === 3 ? "lg:grid-cols-3" : reachModes.modes.length === 2 ? "lg:grid-cols-2" : ""}`}>
                  {reachModes.modes.map((m, i) => (
                    <li key={m.mode} className={`reach__card group flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-[#ECE8E2] ${reachModes.modes.length === 1 ? "sm:flex-row" : ""}`} style={{ ["--i" as string]: i }}>
                      <div className={`relative aspect-[16/10] overflow-hidden bg-[#ECE8E0] ${reachModes.modes.length === 1 ? "sm:aspect-auto sm:min-h-[15rem] sm:w-[45%] sm:shrink-0" : ""}`}>
                        <Image src={REACH_MODE[m.mode].img} alt={REACH_MODE[m.mode].alt} fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]" />
                        <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                        <span className="absolute left-3 top-3 grid size-9 place-items-center rounded-full bg-white/90 text-coral backdrop-blur-sm"><Icon name={REACH_MODE[m.mode].icon} size={16} /></span>
                        <h3 className="absolute bottom-3 left-4 font-serif text-2xl leading-none text-white">{REACH_MODE[m.mode].title}</h3>
                      </div>
                      <div className={`flex-1 space-y-2 text-sm leading-relaxed text-[#555555] ${reachModes.modes.length === 1 ? "p-5 sm:self-center sm:p-8 sm:text-[0.9375rem]" : "p-4"}`}>
                        {m.lines.map((l, j) => <p key={j}>{highlightTrip(l)}</p>)}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
            {reachModes.notes.length ? (
              <ul className="mt-6 space-y-2 rounded-2xl bg-[#F6F1EA] p-5 text-sm leading-relaxed text-[#555555]">
                {reachModes.notes.map((n, i) => (
                  <li key={i} className="flex gap-2.5"><Icon name="bulb" size={15} className="mt-0.5 shrink-0 text-coral" /><span>{highlightTrip(n)}</span></li>
                ))}
              </ul>
            ) : null}
            {reachModes.modes.length ? (
              <p className="mt-3 text-[0.6875rem] text-[#999999]">
                Photos:{" "}
                {reachModes.modes.map((m, i) => (
                  <span key={m.mode}>{i ? " · " : ""}<a href={REACH_MODE[m.mode].src} {...ext} className="underline">{REACH_MODE[m.mode].credit}</a></span>
                ))}
              </p>
            ) : null}
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
          <section id="plan" aria-labelledby="plan-h" className="scroll-mt-36 space-y-6">
            <SectionHead
              id="plan"
              eyebrow="On the ground"
              title={`Practical info for ${name}`}
              intro="Key regulations, emergency contacts, local safety, permits, connectivity, and on-ground travel tips organized point-by-point."
            />

            {/* Quick-Scan Emergency & Essential Rules Bar */}
            {(() => {
              const highlights = STATE_PRACTICAL_HIGHLIGHTS[stateSlug] ?? DEFAULT_PRACTICAL_HIGHLIGHT;
              return (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="flex items-start gap-3.5 rounded-2xl border border-rose-200/80 bg-rose-50/60 p-4 shadow-2xs">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                      <Icon name={highlights.emergency.icon ?? "shield"} size={18} />
                    </div>
                    <div>
                      <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-rose-700">{highlights.emergency.label ?? "Emergency Contacts"}</span>
                      <p className="text-sm font-bold text-ink">{highlights.emergency.title}</p>
                      <p className="mt-0.5 text-xs text-[#666]">{highlights.emergency.subtitle}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5 rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4 shadow-2xs">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                      <Icon name={highlights.permit.icon} size={18} />
                    </div>
                    <div>
                      <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-amber-800">{highlights.permit.label}</span>
                      <p className="text-sm font-bold text-ink">{highlights.permit.title}</p>
                      <p className="mt-0.5 text-xs text-[#666]">{highlights.permit.subtitle}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5 rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-4 shadow-2xs">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                      <Icon name={highlights.rule.icon} size={18} />
                    </div>
                    <div>
                      <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-emerald-800">{highlights.rule.label}</span>
                      <p className="text-sm font-bold text-ink">{highlights.rule.title}</p>
                      <p className="mt-0.5 text-xs text-[#666]">{highlights.rule.subtitle}</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Tabbed Category Panels */}
            <PracticalTabs
              tabs={practical.map((p) => {
                const textParas = p.s!.body.text ? paragraphs(p.s!.body.text) : [];
                const itemsList = p.s!.body.items ?? [];
                const count = itemsList.length || textParas.length;
                return {
                  key: p.key,
                  title: p.title,
                  icon: p.icon,
                  count,
                  node: (
                    <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {itemsList.map((it, i) => (
                        <PracticalPointItem key={i} it={it} />
                      ))}
                      {textParas.map((t, i) => (
                        <PracticalParagraphItem key={i} text={t} />
                      ))}
                    </ul>
                  ),
                };
              })}
            />
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
