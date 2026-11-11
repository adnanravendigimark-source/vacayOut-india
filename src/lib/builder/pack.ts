/**
 * Turns the writing model's output into a content pack (the same format as
 * content/travel/*.json) and prunes it until checkContentFile passes. Pure:
 * no I/O, fully unit-tested.
 *
 * Trust model: the model is untrusted. Facts survive only when they cite real
 * sentence numbers (their quotes are those sentences, verbatim); prose
 * survives only when it cites surviving facts; anything that reads like a
 * price, fare, time or phone number is dropped.
 */
import { z } from "zod";
import { checkContentFile, slugOf, stateOf, type Checks, type ContentFact, type ContentFile, type ContentPlace } from "@/lib/seed/content-file";
import { slugify } from "@/lib/places/slug";
import { cleanTripTypes } from "@/lib/places/trip-types";
import { isCategory } from "@/lib/places/categories";
import type { Sentence } from "./sentences";
import { PLACE_KINDS } from "./prompts";

export type Source = ContentFile["sources"][string];

/** A place the builder found and will write (before the model). */
export type PlaceDraft = {
  ref: string;
  key: string;
  name: string;
  kind: string;
  parent?: string;
  lat: number;
  lng: number;
  wikidataId?: string;
  /** Commons file title ("File:….jpg") or null. */
  image: string | null;
  /** Alt text when the photo shows something other than the place itself (e.g. a state's hero borrowed from a destination). */
  imageAlt?: string;
  location: string;
};

/** What one build step contributes. Stored as JSON on the job between steps. */
export type Part = {
  sources: Record<string, Source>;
  facts: Record<string, ContentFact>;
  places: ContentPlace[];
  itineraries: ContentFile["itineraries"];
  guides: ContentFile["guides"];
  notes: string[];
};

export const emptyPart = (): Part => ({ sources: {}, facts: {}, places: [], itineraries: [], guides: [], notes: [] });

// ---------- guards ----------

/** Prices, fares, clock times and phone numbers: these change, so generated text never states them. */
const VOLATILE = /₹|\bRs\.?\s?\d|\bINR\b|\$\s?\d|\b\d{1,2}(?::\d{2})?\s?(?:am|pm|a\.m\.|p\.m\.)\b|\b\d{1,2}:\d{2}\b|\+91|\b\d{5}\s?\d{5}\b|\bper (?:person|head|night)\b/i;
export const isVolatile = (s: string) => VOLATILE.test(s);

/** Removes fact ids or sentence numbers the model sometimes writes into prose. */
export function stripRefs(text: string): string {
  return text
    .replace(/\s*[([]\s*(?:[A-Za-z0-9:-]+-)?[FS]\d+(?:\s*[,;&]\s*(?:[A-Za-z0-9:-]+-)?[FS]\d+)*\s*[)\]]/g, "")
    .replace(/\b(?:[a-z0-9:-]+-)?F\d+\b/g, "")
    .replace(/\b[a-z]+:(?=[\s,;)\]])/g, "")
    .replace(/\s*[([][\s,;]*[)\]]/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([.,;:])/g, "$1")
    .trim();
}

/** Alt text for a Commons photo: its cleaned file title when that names the place, else "Place, Location". */
export function altFor(d: Pick<PlaceDraft, "name" | "location" | "image" | "imageAlt">): string {
  if (d.imageAlt) return d.imageAlt;
  const t = (d.image ?? "").replace(/^File:/, "").replace(/\.[a-z]+$/i, "").replace(/[_]+/g, " ").replace(/\s*\((?:\d{4}|photo[^)]*|cropped)\)/gi, "").trim();
  return t.toLowerCase().includes(d.name.toLowerCase()) && t.length >= 10 && !/^(img|dsc|p\d)/i.test(t) ? t : `${d.name}, ${d.location}`;
}

const clip = (s: string, max: number) => (s.length <= max ? s : s.slice(0, max - 1).replace(/\s+\S*$/, "") + "…");
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

// ---------- model output ----------

const refsZ = z.array(z.string()).catch([]);
const blockZ = z.object({ text: z.string().catch(""), facts: refsZ });
const linesZ = z.array(blockZ).catch([]);
const pageZ = z.object({
  kind: z.string().catch("city"),
  category: z.string().catch("none"),
  summary: z.string().catch(""),
  seo_title: z.string().catch(""),
  seo_description: z.string().catch(""),
  trip_types: z.array(z.string()).catch([]),
  overview: blockZ.catch({ text: "", facts: [] }),
  highlights: linesZ,
  things_to_do: linesZ.optional(),
  best_time: blockZ.optional(),
  how_to_reach: blockZ.optional(),
  local_transport: blockZ.optional(),
  food: linesZ.optional(),
  culture_etiquette: linesZ.optional(),
  travel_tips: linesZ,
  faqs: z.array(z.object({ question: z.string(), answer: z.string(), facts: refsZ })).catch([]).optional(),
  regions: z.array(z.object({ label: z.string(), detail: z.string(), facts: refsZ })).catch([]).optional(),
});
const destinationZ = z.object({
  facts: z.array(z.object({ id: z.string(), about: z.string(), topic: z.string(), claim: z.string(), claim_type: z.string(), sentences: z.array(z.number()) })).catch([]),
  page: pageZ,
  sights: z.array(pageZ.extend({ ref: z.string() })).catch([]),
  notes: z.string().catch(""),
});
export type DestinationOutput = z.input<typeof destinationZ>;

type Sec = ContentPlace["sections"][string];

/**
 * Model output for one destination (or the state page) → a Part.
 * `drafts` maps refs ("D", "P1"…) to places; `prefix` keeps fact ids unique across the build.
 */
export function partFromDestination(raw: unknown, ctx: { prefix: string; drafts: PlaceDraft[]; sentences: Sentence[]; sources: Record<string, Source>; isState: boolean }): Part {
  const part = emptyPart();
  const parsed = destinationZ.safeParse(raw);
  if (!parsed.success) {
    part.notes.push(`${ctx.prefix}: the writing model returned an unreadable answer`);
    return part;
  }
  const out = parsed.data;
  const byRef = new Map(ctx.drafts.map((d) => [d.ref, d]));
  const byN = new Map(ctx.sentences.map((s) => [s.n, s]));
  const localToGlobal = new Map<string, string>();

  for (const f of out.facts) {
    const draft = byRef.get(f.about.trim());
    const ss = [...new Set(f.sentences)].map((n) => byN.get(n)).filter((s): s is Sentence => Boolean(s));
    const claim = f.claim.trim();
    if (!draft || !ss.length || claim.length < 8 || isVolatile(claim)) continue;
    const id = `${ctx.prefix}-${f.id.replace(/[^A-Za-z0-9]/g, "")}`;
    if (part.facts[id]) continue;
    localToGlobal.set(f.id.replace(/[^A-Za-z0-9]/g, ""), id);
    part.facts[id] = {
      place: draft.key,
      topic: clip(f.topic.trim() || "General", 120).padEnd(3, "."),
      claim: clip(claim, 600),
      claimType: f.claim_type === "distance" ? "distance" : f.claim_type === "rule" ? "rule" : "general",
      kind: "verified",
      evidence: ss.slice(0, 4).map((s) => ({ source: s.source, quote: clip(s.text, 1200) })),
    };
  }

  const cite = (ids: string[]) => [...new Set(ids.flatMap((x) => x.match(/\bF\d+\b/g) ?? []).map((x) => localToGlobal.get(x)).filter((x): x is string => Boolean(x)))];
  const okText = (t: string) => t.trim().length > 0 && !isVolatile(t);
  const text = (b: { text: string; facts: string[] } | undefined): Sec | null => {
    if (!b) return null;
    const facts = cite(b.facts);
    const t = stripRefs(b.text);
    return facts.length && okText(t) ? { text: clip(t, 6000), facts } : null;
  };
  const list = (bs: { text: string; facts: string[] }[] | undefined): Sec | null => {
    const items: { body: string }[] = [];
    const facts: string[] = [];
    for (const b of bs ?? []) {
      const f = cite(b.facts);
      const t = stripRefs(b.text);
      if (!f.length || !okText(t)) continue;
      items.push({ body: clip(t, 500) });
      facts.push(...f);
    }
    return items.length ? { items: items.slice(0, 30), facts: [...new Set(facts)] } : null;
  };
  const qa = (bs: { label: string; detail: string; facts: string[] }[] | undefined, max: number): Sec | null => {
    const items: { title: string; body: string }[] = [];
    const facts: string[] = [];
    for (const b of bs ?? []) {
      const f = cite(b.facts);
      const title = stripRefs(b.label);
      const body = stripRefs(b.detail);
      if (!f.length || !okText(title) || !okText(body)) continue;
      items.push({ title: clip(title, 500), body: clip(body, 2000) });
      facts.push(...f);
    }
    return items.length ? { items: items.slice(0, max), facts: [...new Set(facts)] } : null;
  };

  const build = (draft: PlaceDraft, p: z.infer<typeof pageZ>, isSight: boolean): ContentPlace | null => {
    const sections: Record<string, Sec> = {};
    const put = (key: string, s: Sec | null) => {
      if (s) sections[key] = s;
    };
    put("overview", text(p.overview));
    if (!sections.overview) {
      part.notes.push(`${draft.name}: skipped — no overview backed by the sources`);
      return null;
    }
    put("highlights", list(p.highlights));
    put("things_to_do", list(p.things_to_do));
    put("best_time", text(p.best_time));
    put("how_to_reach", text(p.how_to_reach));
    put("local_transport", text(p.local_transport));
    put("food", list(p.food));
    put("culture_etiquette", list(p.culture_etiquette));
    put("travel_tips", list(p.travel_tips));
    put("faqs", qa(p.faqs?.map((f) => ({ label: f.question, detail: f.answer, facts: f.facts })), 20));
    if (draft.kind === "state") put("regions", qa(p.regions, 20));

    let kind = draft.kind;
    let category: string | undefined;
    if (draft.kind !== "state") {
      const allowed: readonly string[] = isSight ? ["attraction", "temple", "lake", "viewpoint", "trek", "nature", "museum", "activity"] : ["city", "town", "region", "nature"];
      kind = (PLACE_KINDS as readonly string[]).includes(p.kind) && allowed.includes(p.kind) ? p.kind : draft.kind;
      // Small models over-use "trek": only a named trek, trail or hike is one.
      if (kind === "trek" && !/trek|trail|hike|walk/i.test(draft.name)) kind = "attraction";
      if (kind === "activity") {
        if (isCategory(p.category)) category = p.category;
        else kind = "attraction";
      }
    }
    const overviewText = (sections.overview as { text: string }).text;
    const firstSentence = overviewText.split(/(?<=[.!?])\s/)[0] ?? "";
    let summary = stripRefs(p.summary);
    if (summary.length < 20 || isVolatile(summary)) summary = firstSentence;
    let seoTitle = stripRefs(p.seo_title);
    if (seoTitle.length < 10 || seoTitle.length > 70 || isVolatile(seoTitle)) seoTitle = clip(`${draft.name} travel guide: things to do and tips`, 70);
    let seoDescription = stripRefs(p.seo_description);
    if (seoDescription.length < 50 || isVolatile(seoDescription)) seoDescription = clip(summary.length >= 50 ? summary : `${summary} Plan your visit to ${draft.name}: what to see, when to go and how to get there.`, 170);
    const displayMode: "page" | "parent_section" = draft.image ? "page" : "parent_section";
    const place: ContentPlace = {
      key: draft.key,
      kind: kind as ContentPlace["kind"],
      name: draft.name,
      ...(draft.parent ? { parent: draft.parent } : {}),
      summary: clip(summary, 300),
      seoTitle: clip(seoTitle, 70),
      seoDescription: clip(seoDescription, 170),
      lat: draft.lat,
      lng: draft.lng,
      ...(draft.wikidataId ? { wikidataId: draft.wikidataId } : {}),
      displayMode,
      featured: false,
      ...(category ? { category } : {}),
      tripTypes: cleanTripTypes(p.trip_types).slice(0, 3),
      images: draft.image ? [{ commons: draft.image, alt: clip(altFor(draft), 200), hero: true }] : [],
      sections,
      relations: [],
    };
    if (!draft.image && !isSight) {
      part.notes.push(`${draft.name}: skipped — no free-licence photo found`);
      return null;
    }
    if (words(Object.values(sections).map((s) => ("text" in s && s.text) || (s.items ?? []).map((i) => `${i.title ?? ""} ${i.body}`).join(" ")).join(" ")) < (displayMode === "page" ? 120 : 40)) {
      part.notes.push(`${draft.name}: skipped — too little sourced material`);
      return null;
    }
    return place;
  };

  const main = ctx.drafts[0];
  const mainPlace = build(main, out.page, false);
  if (mainPlace) part.places.push(mainPlace);
  else return { ...emptyPart(), notes: part.notes };
  if (!ctx.isState) {
    for (const s of out.sights) {
      const d = byRef.get(s.ref);
      if (!d || d === main) continue;
      const p = build(d, s, true);
      if (p) part.places.push(p);
    }
  }
  // Keep only facts something cites, and the sources those facts use.
  const used = new Set(part.places.flatMap((p) => Object.values(p.sections).flatMap((s) => s.facts)));
  for (const id of Object.keys(part.facts)) if (!used.has(id)) delete part.facts[id];
  for (const f of Object.values(part.facts)) for (const e of f.evidence) if (ctx.sources[e.source]) part.sources[e.source] = ctx.sources[e.source];
  if (out.notes.trim()) part.notes.push(`${main.name}: ${clip(out.notes.trim(), 300)}`);
  return part;
}

// ---------- itineraries and guides ----------

const tripsZ = z.object({
  itineraries: z
    .array(
      z.object({
        title: z.string(),
        summary: z.string().catch(""),
        seo_title: z.string().catch(""),
        seo_description: z.string().catch(""),
        trip_types: z.array(z.string()).catch([]),
        overview: z.string().catch(""),
        start: z.string().catch(""),
        end: z.string().catch(""),
        season: z.string().catch(""),
        transport: z.string().catch(""),
        days: z.array(z.object({ title: z.string(), morning: z.string().catch(""), afternoon: z.string().catch(""), evening: z.string().catch(""), stops: z.array(z.string()).catch([]), overnight: z.string().catch(""), facts: refsZ })).catch([]),
        booking: z.array(z.object({ item: z.string(), detail: z.string() })).catch([]),
        alternatives: z.array(z.string()).catch([]),
        tips: z.array(z.string()).catch([]),
        facts: refsZ,
      }),
    )
    .catch([]),
  guides: z
    .array(
      z.object({
        title: z.string(),
        summary: z.string().catch(""),
        seo_title: z.string().catch(""),
        seo_description: z.string().catch(""),
        trip_types: z.array(z.string()).catch([]),
        intro: z.string().catch(""),
        sections: z.array(z.object({ heading: z.string(), text: z.string(), facts: refsZ })).catch([]),
        checklist: z.array(z.string()).catch([]),
        places: refsZ,
        facts: refsZ,
      }),
    )
    .catch([]),
});

export const NO_PRICES =
  "Prices weren’t researched for this plan, so it has no cost lines. Rates for stays, transport, guides and entry tickets change often — check current prices with the official sites or your booking platform before you go.";

/** Itineraries and guides from the trips step. `places` maps refs to place keys; `facts` are the build's facts. */
export function tripsFromOutput(raw: unknown, ctx: { mainKey: string; refs: Map<string, { key: string; name: string }>; facts: Record<string, ContentFact>; takenSlugs: Set<string> }): Pick<Part, "itineraries" | "guides" | "notes"> {
  const res: Pick<Part, "itineraries" | "guides" | "notes"> = { itineraries: [], guides: [], notes: [] };
  const parsed = tripsZ.safeParse(raw);
  if (!parsed.success) {
    res.notes.push("Trip plans and guides: the writing model returned an unreadable answer");
    return res;
  }
  const state = stateOf(ctx.mainKey);
  // The model sometimes writes ids inside text ("[mysore-F3]") or whole sentences into the facts list: take every known id it mentions.
  const idsIn = (...texts: string[]) => texts.flatMap((t) => t.match(/[a-z0-9-]+-F\d+/g) ?? []);
  const cite = (ids: string[]) => [...new Set(idsIn(...ids).filter((x) => ctx.facts[x]))];
  const sourcesOf = (ids: string[]) => [...new Set(ids.flatMap((id) => ctx.facts[id].evidence.map((e) => e.source)))];
  const clean = (s: string, max: number) => (isVolatile(s) ? "" : clip(stripRefs(s), max));
  const uniqueSlug = (title: string) => {
    const base = slugify(title) || "plan";
    let s = base;
    for (let i = 2; ctx.takenSlugs.has(s); i++) s = `${base}-${i}`;
    ctx.takenSlugs.add(s);
    return s;
  };
  const seo = (title: string, summary: string, t: string, d: string) => ({
    seoTitle: t.length >= 10 && t.length <= 70 && !isVolatile(t) ? t : clip(title, 70),
    seoDescription: d.length >= 50 && !isVolatile(d) ? clip(d, 170) : clip(summary.length >= 50 ? summary : `${summary} A day-by-day plan with what to see and how to get around.`, 170),
  });

  for (const it of parsed.data.itineraries) {
    const days = it.days
      .map((d) => {
        const stops = d.stops.map((r) => ctx.refs.get(r.trim())).filter((p): p is { key: string; name: string } => Boolean(p));
        const plan = [["Morning", d.morning], ["Afternoon", d.afternoon], ["Evening", d.evening]]
          .map(([label, t]) => [label, clean(t, 380)])
          .filter(([, t]) => t)
          .map(([label, t]) => `${label}: ${t}`)
          .join("\n\n");
        const title = clean(d.title, 120);
        if (!title || !plan) return null;
        const seen = new Set<string>();
        return {
          title,
          summary: clip(plan, 1200),
          stops: (stops.length ? stops : [{ key: "", name: clean(d.overnight, 120) || title }])
            .filter((s) => !seen.has(s.key || s.name) && seen.add(s.key || s.name))
            .slice(0, 8)
            .map((s) => ({ name: clip(s.name, 120), ...(s.key && s.key.includes("/") ? { placeSlug: `${state}/${slugOf(s.key)}` } : {}) })),
          ...(clean(d.overnight, 160) ? { overnight: clean(d.overnight, 160) } : {}),
          facts: cite([...d.facts, d.morning, d.afternoon, d.evening]),
        };
      })
      .filter((d): d is NonNullable<typeof d> => Boolean(d));
    const facts = cite([...it.facts, it.overview, it.summary, ...days.flatMap((d) => d.facts)]);
    // Keep "N days" in the title in line with the plan actually written.
    const title = clean(it.title, 100).replace(/\b(\d+)([- ])days?\b/i, (m, n, sep) => (Number(n) === days.length ? m : `${days.length}${sep}day${days.length === 1 ? "" : "s"}`));
    const summary = clean(it.summary, 300);
    if (days.length < 1 || !facts.length || title.length < 3 || summary.length < 20) {
      res.notes.push(`Trip plan "${it.title}": skipped — not enough sourced detail`);
      continue;
    }
    const overview = clean(it.overview, 1500) || summary;
    res.itineraries.push({
      place: ctx.mainKey,
      slug: uniqueSlug(title),
      title,
      summary,
      durationDays: Math.min(days.length, 21),
      tripTypes: cleanTripTypes(it.trip_types).slice(0, 4),
      ...seo(title, summary, clean(it.seo_title, 70), clean(it.seo_description, 170)),
      plan: {
        overview,
        ...(clean(it.start, 160) ? { start: clean(it.start, 160) } : {}),
        ...(clean(it.end, 160) ? { end: clean(it.end, 160) } : {}),
        ...(clean(it.season, 300) ? { season: clean(it.season, 300) } : {}),
        ...(clean(it.transport, 300) ? { transport: clean(it.transport, 300) } : {}),
        days: days.map((d) => ({ title: d.title, summary: d.summary, stops: d.stops, ...(d.overnight ? { overnight: d.overnight } : {}) })),
        budget: { assumptions: NO_PRICES, lines: [] },
        booking: it.booking.map((b) => ({ item: clean(b.item, 120), detail: clean(b.detail, 300) })).filter((b) => b.item && b.detail).slice(0, 12),
        alternatives: it.alternatives.map((a) => clean(a, 300)).filter(Boolean).slice(0, 10),
        tips: it.tips.map((a) => clean(a, 300)).filter(Boolean).slice(0, 10),
      },
      facts,
      sources: sourcesOf(facts),
    });
  }

  for (const g of parsed.data.guides) {
    const sections = g.sections
      .map((s) => ({ heading: clean(s.heading, 120), text: clean(s.text, 4000), facts: cite([...s.facts, s.text]) }))
      .filter((s) => s.heading.length >= 2 && s.text && s.facts.length);
    const facts = cite([...g.facts, g.intro, ...sections.flatMap((s) => s.facts)]);
    const title = clean(g.title, 110);
    const summary = clean(g.summary, 300);
    const intro = clean(g.intro, 1500);
    if (sections.length < 2 || title.length < 8 || summary.length < 20 || intro.length < 40) {
      res.notes.push(`Guide "${g.title}": skipped — not enough sourced detail`);
      continue;
    }
    res.guides.push({
      place: ctx.mainKey,
      places: [...new Set(g.places.map((r) => ctx.refs.get(r.trim())?.key).filter((k): k is string => Boolean(k) && k !== ctx.mainKey))].slice(0, 30),
      slug: uniqueSlug(title),
      title,
      summary,
      tripTypes: cleanTripTypes(g.trip_types).slice(0, 4),
      ...seo(title, summary, clean(g.seo_title, 70), clean(g.seo_description, 170)),
      body: {
        intro,
        sections: sections.slice(0, 14).map(({ heading, text }) => ({ heading, text })),
        ...(g.checklist.length ? { checklist: g.checklist.map((c) => clean(c, 300)).filter(Boolean).slice(0, 20) } : {}),
      },
      facts,
      sources: sourcesOf(facts),
    });
  }
  return res;
}

// ---------- assembly ----------

/** Merges parts into one file and removes whatever fails the content checks, until the file passes. */
export function assemble(
  parts: Part[],
  meta: { cluster: string; title: string; date: string; selection: string; knownKeys: Set<string>; requiredKeys?: string[] },
): { ok: true; file: ContentFile; checks: Checks; dropped: string[] } | { ok: false; problems: string[]; dropped: string[] } {
  const f = {
    cluster: meta.cluster,
    title: meta.title,
    researchedAt: meta.date,
    selection: meta.selection,
    sources: {} as Record<string, Source>,
    facts: {} as Record<string, ContentFact>,
    places: [] as ContentPlace[],
    itineraries: [] as ContentFile["itineraries"],
    guides: [] as ContentFile["guides"],
  };
  for (const p of parts) {
    Object.assign(f.sources, p.sources);
    Object.assign(f.facts, p.facts);
    for (const pl of p.places) if (!f.places.some((x) => x.key === pl.key)) f.places.push(pl);
    f.itineraries.push(...p.itineraries);
    f.guides.push(...p.guides);
  }
  const dropped: string[] = [];
  const dropPlace = (key: string, why: string) => {
    if (meta.requiredKeys?.includes(key)) return false;
    const before = f.places.length;
    f.places = f.places.filter((p) => p.key !== key && p.parent !== key);
    if (f.places.length === before) return false;
    dropped.push(`${key}: ${why}`);
    for (const id of Object.keys(f.facts)) if (!f.places.some((p) => p.key === f.facts[id].place) && !meta.knownKeys.has(f.facts[id].place)) delete f.facts[id];
    f.itineraries = f.itineraries.filter((it) => {
      const bad = (it.plan as { days: { stops: { placeSlug?: string }[] }[] }).days.some((d) => d.stops.some((s) => s.placeSlug && !f.places.some((p) => p.key === s.placeSlug) && !meta.knownKeys.has(s.placeSlug!)));
      if (bad) dropped.push(`itinerary ${it.slug}: links a dropped place`);
      return !bad;
    });
    for (const g of f.guides) g.places = g.places.filter((k) => f.places.some((p) => p.key === k) || meta.knownKeys.has(k));
    return true;
  };
  const uncite = (id: string) => {
    for (const p of f.places)
      for (const [k, s] of Object.entries(p.sections)) {
        s.facts = s.facts.filter((x) => x !== id);
        if (!s.facts.length) delete p.sections[k];
      }
    for (const it of f.itineraries) it.facts = it.facts.filter((x) => x !== id);
    for (const g of f.guides) g.facts = g.facts.filter((x) => x !== id);
    delete f.facts[id];
  };

  for (let round = 0; round < 40; round++) {
    // Sources nothing cites any more are dropped quietly.
    const usedSources = new Set([...Object.values(f.facts).flatMap((x) => x.evidence.map((e) => e.source)), ...f.itineraries.flatMap((i) => i.sources), ...f.guides.flatMap((g) => g.sources)]);
    for (const id of Object.keys(f.sources)) if (!usedSources.has(id)) delete f.sources[id];
    const r = checkContentFile(f, meta.knownKeys);
    if (r.ok) {
      const now = new Date().toISOString();
      const checks: Checks = {};
      for (const [id, fc] of Object.entries(r.file.facts))
        fc.evidence.forEach((_, i) => (checks[`${id}#${i}`] = { support: "supports", checkedAt: now, note: "Quote copied verbatim from the source article when it was fetched." }));
      return { ok: true, file: r.file, checks, dropped };
    }
    let progress = false;
    for (const pr of r.problems) {
      let m: RegExpExecArray | null;
      if ((m = /^places\.(\d+)/.exec(pr))) progress = dropPlace(f.places[Number(m[1])]?.key ?? "", pr) || progress;
      else if ((m = /^itineraries\.(\d+)/.exec(pr)) || (m = /^itinerary ([a-z0-9-]+):/.exec(pr))) {
        const slug = /^\d+$/.test(m[1]) ? f.itineraries[Number(m[1])]?.slug : m[1];
        const n = f.itineraries.length;
        f.itineraries = f.itineraries.filter((i) => i.slug !== slug);
        if (f.itineraries.length < n) {
          dropped.push(`itinerary ${slug}: ${pr}`);
          progress = true;
        }
      } else if ((m = /^guides\.(\d+)/.exec(pr)) || (m = /^guide ([a-z0-9-]+):/.exec(pr))) {
        const slug = /^\d+$/.test(m[1]) ? f.guides[Number(m[1])]?.slug : m[1];
        const n = f.guides.length;
        f.guides = f.guides.filter((g) => g.slug !== slug);
        if (f.guides.length < n) {
          dropped.push(`guide ${slug}: ${pr}`);
          progress = true;
        }
      } else if ((m = /^(?:facts\.|fact )([A-Za-z0-9-]+)/.exec(pr))) {
        if (f.facts[m[1]]) {
          uncite(m[1]);
          progress = true;
        }
      } else if ((m = /^([a-z0-9-]+(?:\/[a-z0-9-]+)?)\.([a-z_]+): /.exec(pr))) {
        const p = f.places.find((x) => x.key === m![1]);
        if (p && m[2] !== "overview" && p.sections[m[2]]) {
          delete p.sections[m[2]];
          progress = true;
        } else progress = dropPlace(m[1], pr) || progress;
      } else if ((m = /^(?:duplicate place )?([a-z0-9-]+(?:\/[a-z0-9-]+)?)(?::|$)/.exec(pr))) progress = dropPlace(m[1], pr) || progress;
    }
    // Facts left uncited by the removals above.
    const used = new Set([...f.places.flatMap((p) => Object.values(p.sections).flatMap((s) => s.facts)), ...f.itineraries.flatMap((i) => i.facts), ...f.guides.flatMap((g) => g.facts)]);
    for (const id of Object.keys(f.facts))
      if (!used.has(id)) {
        delete f.facts[id];
        progress = true;
      }
    if (!progress) return { ok: false, problems: r.problems, dropped };
  }
  return { ok: false, problems: ["the content kept failing its checks"], dropped };
}
