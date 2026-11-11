import assert from "node:assert/strict";
import { test } from "node:test";
import { sentencesOf, splitSentences } from "./sentences";
import { assemble, isVolatile, NO_PRICES, partFromDestination, stripRefs, tripsFromOutput, type PlaceDraft, type Source } from "./pack";
import { parseDestinations, parseListings, toPlain } from "./wiki";

test("splitSentences keeps abbreviations and initials together", () => {
  assert.deepEqual(splitSentences("The fort is approx. 5 km away. It was built by A. Khan in 1600. Visit early!"), ["The fort is approx. 5 km away.", "It was built by A. Khan in 1600.", "Visit early!"]);
});

test("sentencesOf numbers sentences, tracks headings and skips markup", () => {
  const ss = sentencesOf("By plane:\nThe nearest airport is in Bengaluru, about a three hour drive away.\nShort.\nBroken {{template}} leftover sentence with enough text.", "SRC", 5, 10);
  assert.equal(ss.length, 1);
  assert.deepEqual(ss[0], { n: 5, source: "SRC", text: "The nearest airport is in Bengaluru, about a three hour drive away.", heading: "By plane" });
});

test("toPlain keeps station names and listing text", () => {
  assert.equal(toPlain("{{station|Mysuru Junction|city=india}} is the main station."), "Mysuru Junction is the main station.");
  assert.equal(toPlain("* {{see | name=[[Mysore Palace]] | content=Huge '''palace'''.}}"), "• Mysore Palace: Huge palace.");
});

test("parsers read destinations and See listings", () => {
  const raw = `==Cities==\n* {{marker|type=city|name=[[Mysore]]|wikidata=Q10086}} — royal city\n==Other destinations==\n* [[Hampi]] — ruins\n==See==\n* {{see| name=Mysore Palace | lat=12.3 | long=76.65 | wikidata=Q456575 | content=The palace.}}`;
  const d = parseDestinations(raw);
  assert.deepEqual(d.map((x) => [x.name, x.group, x.wikidata]), [["Mysore", "city", "Q10086"], ["Hampi", "other", null]]);
  const l = parseListings(raw);
  assert.equal(l[0].name, "Mysore Palace");
  assert.equal(l[0].lat, 12.3);
});

test("volatile details are recognised and refs stripped", () => {
  for (const s of ["Entry is ₹50.", "Tickets cost Rs 200", "Open 9am to 5pm", "Opens at 09:30", "Call +91 98765 43210"]) assert.ok(isVolatile(s), s);
  for (const s of ["The palace was built in 1912.", "It is 140 km from Bengaluru."]) assert.ok(!isVolatile(s), s);
  assert.equal(stripRefs("The palace is lit on Sundays (F2, F3)."), "The palace is lit on Sundays.");
});

const OVERVIEW = Array.from({ length: 30 }, () => "Mysore is a royal city known for palaces and festivals.").join(" ");
const drafts: PlaceDraft[] = [
  { ref: "D", key: "karnataka/mysore", name: "Mysore", kind: "city", lat: 12.3, lng: 76.65, wikidataId: "Q10086", image: "File:Mysore Palace.jpg", location: "Karnataka, India" },
  { ref: "P1", key: "karnataka/mysore-palace", name: "Mysore Palace", kind: "attraction", parent: "karnataka/mysore", lat: 12.3, lng: 76.65, image: null, location: "Mysore, Karnataka" },
];
const sentences = [
  { n: 1, source: "MYS_WV", text: "Mysore was the capital of the Wodeyar dynasty.", heading: null },
  { n: 2, source: "MYS_WV", text: "Mysore Palace is lit up on Sunday evenings.", heading: null },
  { n: 3, source: "MYS_WV", text: "Entry to the palace costs ₹100 for adults.", heading: null },
];
const sources: Record<string, Source> = { MYS_WV: { url: "https://en.wikivoyage.org/wiki/Mysore", title: "Mysore — Wikivoyage", authority: "travel_platform" } };
const block = (text: string, facts: string[]) => ({ text, facts });
const page = (over: Partial<Record<string, unknown>> = {}) => ({
  kind: "city", category: "none", summary: "A royal city of palaces in southern Karnataka.", seo_title: "Mysore travel guide: palaces and tips", seo_description: "Plan a trip to Mysore: the palace, history and practical tips for first-time visitors to Karnataka.", trip_types: ["heritage", "nonsense"],
  overview: block(OVERVIEW, ["F1"]), highlights: [block("The palace lights (F2)", ["F2"]), block("Unsourced claim", [])], things_to_do: [], best_time: block("", []), how_to_reach: block("Fly to Bengaluru.", ["F9"]), local_transport: block("", []), food: [], culture_etiquette: [], travel_tips: [block("Entry costs ₹100.", ["F2"])], faqs: [], regions: [], ...over,
});

test("partFromDestination keeps only grounded facts and prose", () => {
  const raw = {
    facts: [
      { id: "F1", about: "D", topic: "History", claim: "Mysore was the Wodeyar capital.", claim_type: "general", sentences: [1] },
      { id: "F2", about: "P1", topic: "Lights", claim: "The palace is lit on Sunday evenings.", claim_type: "general", sentences: [2, 99] },
      { id: "F3", about: "D", topic: "Entry", claim: "Entry costs ₹100.", claim_type: "price", sentences: [3] },
      { id: "F4", about: "D", topic: "Made up", claim: "There is a beach.", claim_type: "general", sentences: [42] },
    ],
    page: page(),
    sights: [{ ref: "P1", ...page({ kind: "attraction", overview: block("Mysore Palace is the former royal residence and the city's main sight, lit up on Sunday evenings with thousands of bulbs. " + "Visitors walk through the halls. ".repeat(4), ["F2"]) }) }],
    notes: "",
  };
  const part = partFromDestination(raw, { prefix: "mysore", drafts, sentences, sources, isState: false });
  assert.deepEqual(Object.keys(part.facts).sort(), ["mysore-F1", "mysore-F2"]);
  assert.equal(part.facts["mysore-F2"].evidence[0].quote, sentences[1].text);
  assert.equal(part.facts["mysore-F2"].evidence.length, 1);
  const city = part.places[0];
  assert.equal(city.key, "karnataka/mysore");
  assert.deepEqual(city.tripTypes, ["heritage"]);
  assert.deepEqual(city.sections.highlights, { items: [{ body: "The palace lights" }], facts: ["mysore-F2"] });
  assert.equal(city.sections.how_to_reach, undefined); // cites an unknown fact
  assert.equal(city.sections.travel_tips, undefined); // states a price
  assert.equal(city.images[0].hero, true);
  const sight = part.places[1];
  assert.equal(sight.displayMode, "parent_section"); // no photo
  assert.equal(sight.parent, "karnataka/mysore");
});

test("tripsFromOutput builds plans with linked stops and no prices", () => {
  const facts = { "mysore-F1": { place: "karnataka/mysore", topic: "History", claim: "x".repeat(10), claimType: "general" as const, kind: "verified" as const, evidence: [{ source: "MYS_WV", quote: "Mysore was the capital." }] } };
  const refs = new Map([["R1", { key: "karnataka/mysore", name: "Mysore" }], ["R2", { key: "karnataka/mysore-palace", name: "Mysore Palace" }]]);
  const out = tripsFromOutput(
    {
      itineraries: [{ title: "2 days in Mysore", summary: "Two relaxed days of palaces and markets in Mysore.", seo_title: "", seo_description: "", trip_types: ["heritage"], overview: "Palaces and markets.", start: "Mysore", end: "Mysore", season: "", transport: "", days: [{ title: "Palace day", morning: "See the palace.", afternoon: "Lunch, then rest.", evening: "Lights cost ₹50.", stops: ["R2", "R9"], overnight: "Mysore", facts: ["mysore-F1"] }], booking: [], alternatives: ["Add a day trip."], tips: [], facts: [] }],
      guides: [{ title: "Mysore travel guide", summary: "How to reach and get around Mysore, and when to go.", seo_title: "", seo_description: "", trip_types: [], intro: "Everything first-time visitors need to plan a visit to Mysore and its palaces.", sections: [{ heading: "History", text: "Royal capital.", facts: ["mysore-F1"] }, { heading: "Unsourced", text: "x", facts: [] }], checklist: [], places: ["R2"], facts: [] }],
      notes: "",
    },
    { mainKey: "karnataka/mysore", refs, facts, takenSlugs: new Set(["1-day-in-mysore"]) },
  );
  const it = out.itineraries[0];
  assert.equal(it.slug, "1-day-in-mysore-2"); // title follows the 1 day actually planned
  const plan = it.plan as { budget: { assumptions: string; lines: unknown[] }; days: { summary: string; stops: { name: string; placeSlug?: string }[] }[] };
  assert.equal(plan.budget.assumptions, NO_PRICES);
  assert.deepEqual(plan.days[0].stops, [{ name: "Mysore Palace", placeSlug: "karnataka/mysore-palace" }]);
  assert.ok(!plan.days[0].summary.includes("₹"));
  assert.equal(out.guides.length, 0); // only one sourced section
});

test("assemble prunes what fails the checks and returns a valid file", () => {
  const raw = {
    facts: [{ id: "F1", about: "D", topic: "History", claim: "Mysore was the Wodeyar capital.", claim_type: "general", sentences: [1] }],
    page: page({ summary: "x" }),
    sights: [],
    notes: "",
  };
  const part = partFromDestination(raw, { prefix: "mysore", drafts, sentences, sources, isState: false });
  const bad = structuredClone(part);
  bad.places[0] = { ...bad.places[0], key: "karnataka/bad-place", wikidataId: undefined, seoTitle: "short" } as never;
  const res = assemble([part, bad], { cluster: "karnataka", title: "Karnataka", date: "2026-11-10", selection: "One-click build test of the pack assembly.", knownKeys: new Set(["karnataka"]) });
  assert.ok(res.ok, res.ok ? "" : res.problems.join("\n"));
  if (res.ok) {
    assert.deepEqual(res.file.places.map((p) => p.key), ["karnataka/mysore"]);
    assert.equal(res.checks["mysore-F1#0"].support, "supports");
    assert.ok(res.dropped.some((d) => d.startsWith("karnataka/bad-place")));
  }
});

test("altFor uses a descriptive file title only when it names the place", async () => {
  const { altFor } = await import("./pack");
  assert.equal(altFor({ name: "Mysore Zoo", location: "Mysore, Karnataka", image: "File:Entrance of Mysore Zoo.jpg" }), "Entrance of Mysore Zoo");
  assert.equal(altFor({ name: "Hampi", location: "Karnataka, India", image: "File:IMG_2041.jpg" }), "Hampi, Karnataka, India");
  assert.equal(altFor({ name: "Karnataka", location: "India", image: "File:x.jpg", imageAlt: "Hampi, Karnataka" }), "Hampi, Karnataka");
});

test("stripRefs removes prefixed ids and empty brackets left behind", () => {
  assert.equal(stripRefs("Check road options. (dest:mysore-F3, karnataka-F2)"), "Check road options.");
  assert.equal(stripRefs("Rail links (,, dest:) exist."), "Rail links exist.");
});
