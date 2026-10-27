/**
 * Integration test for the content seed and the itinerary workflow. Local or
 * *_test database only (it truncates tables). Run: npm run test:db
 */
import assert from "node:assert/strict";
import { after, before, test } from "node:test";

const url = process.env.TEST_DATABASE_URL;
const safe = !!url && (/@(localhost|127\.0\.0\.1)[:/]/.test(url) || /\/[a-z0-9_]*_test(\?|$)/.test(url));

if (!safe) {
  test("content seed integration (skipped: set TEST_DATABASE_URL to a local or *_test database)", { skip: true }, () => {});
} else {
  process.env.DATABASE_URL = url;
  const { sql, eq, and } = await import("drizzle-orm");
  const { getDb } = await import("@/lib/db");
  const s = await import("@/lib/db/schema");
  const { checkContentFile, contentFileSchema } = await import("./content-file");
  const { applyContentFile } = await import("./apply");
  const { publishPlace } = await import("@/lib/publish/service");
  const { approveSectionWithFacts } = await import("@/lib/places/review");
  const { publishItinerary, listPublishedItineraries, getPublishedItinerary, resolveStopLinks } = await import("@/lib/itineraries/service");
  const lists = await import("@/lib/places/public-lists");

  const db = getDb();
  let editor = "";
  const long = "Agra sits on the Yamuna river in Uttar Pradesh and is best known for the Taj Mahal, a white marble mausoleum. ".repeat(7).trim();

  const fixture = () => ({
    cluster: "agra-test",
    title: "Agra (test)",
    researchedAt: "2026-10-26",
    selection: "Test fixture for the content seed integration test.",
    sources: {
      S1: { url: "https://www.tajmahal.gov.in/", title: "Taj Mahal official website", authority: "government" },
      S2: { url: "https://en.wikipedia.org/wiki/Agra", title: "Agra — Wikipedia", authority: "reference" },
    },
    facts: {
      F1: { place: "uttar-pradesh-t/agra", topic: "Taj Mahal closed on Fridays", claim: "The Taj Mahal is closed to visitors on Fridays.", claimType: "opening_hours", evidence: [{ source: "S1", quote: "Taj Mahal remains closed only on Fridays" }] },
      F2: { place: "uttar-pradesh-t/agra", topic: "Agra on the Yamuna", claim: "Agra is on the banks of the Yamuna river.", claimType: "general", evidence: [{ source: "S2", quote: "on the banks of the Yamuna" }] },
      F3: { place: "uttar-pradesh-t/agra", topic: "Disputed fact", claim: "Something sources disagree on.", claimType: "general", conflictNote: "Two sources disagree.", evidence: [{ source: "S2", quote: "another quoted sentence here" }] },
    },
    places: [
      { key: "uttar-pradesh-t", kind: "state", name: "Uttar Pradesh", summary: "A large state in northern India with Agra and Varanasi.", seoTitle: "Uttar Pradesh travel guide", seoDescription: "Plan a trip to Uttar Pradesh: Agra, Varanasi and more, with sourced travel information and practical tips.", lat: 26.8, lng: 80.9, images: [], sections: { overview: { text: long, facts: ["F2"] }, travel_tips: { items: [{ body: "Carry water in summer." }] } } },
      {
        key: "uttar-pradesh-t/agra", kind: "city", name: "Agra", summary: "City of the Taj Mahal on the Yamuna river.", seoTitle: "Agra travel guide", seoDescription: "Plan a trip to Agra: the Taj Mahal, Agra Fort, best time, how to reach and practical tips from official sources.", lat: 27.18, lng: 78.01, tripTypes: ["heritage"], images: [],
        sections: { overview: { text: long, facts: ["F2"] }, visit_info: { items: [{ title: "Closed", body: "Taj Mahal: closed on Fridays." }], facts: ["F1"] }, faqs: { items: [{ title: "Disputed?", body: "Yes." }], facts: ["F3"] } },
      },
    ],
    itineraries: [
      {
        place: "uttar-pradesh-t/agra", slug: "agra-2-days-test", title: "Two days in Agra", summary: "A relaxed two-day plan for Agra's Mughal monuments.", durationDays: 2, tripTypes: ["heritage"],
        seoTitle: "2 days in Agra itinerary", seoDescription: "A realistic two-day Agra itinerary with the Taj Mahal, Agra Fort and Mehtab Bagh, travel times and budget estimates.",
        plan: {
          overview: "An unhurried plan.",
          days: [
            { title: "Taj Mahal", stops: [{ time: "Sunrise", name: "Taj Mahal", duration: "2–3 hours" }] },
            { title: "Agra Fort", stops: [{ name: "Agra Fort", duration: "2 hours" }] },
          ],
          budget: { assumptions: "Two adults, mid-range.", lines: [] },
          booking: [],
          alternatives: ["Visit Fatehpur Sikri instead of Mehtab Bagh."],
        },
        facts: ["F1"],
        sources: ["S1"],
      },
    ],
  });

  const checks = {
    "F1#0": { support: "supports" as const, checkedAt: "2026-10-26T00:00:00Z" },
    "F2#0": { support: "supports" as const, checkedAt: "2026-10-26T00:00:00Z" },
    "F3#0": { support: "quote_not_found" as const, checkedAt: "2026-10-26T00:00:00Z" },
  };

  before(async () => {
    await db.execute(sql`truncate audit_log, itineraries, content_suggestions, finding_evidence, research_findings, research_runs, sources, publish_jobs, search_documents, sections, place_versions, place_relations, media, places, users cascade`);
    const [u] = await db.insert(s.users).values({ email: "seed@test.local", name: "Seed", passwordHash: "x", role: "admin" }).returning();
    editor = u.id;
  });
  after(async () => {
    await (getDb() as unknown as { $client: { end: () => Promise<void> } }).$client.end();
  });

  test("content files are validated before seeding", () => {
    const bad = fixture() as Record<string, unknown> & ReturnType<typeof fixture>;
    bad.places[1].sections = { ...bad.places[1].sections, overview: { text: long, facts: ["F9"] } };
    const r = checkContentFile(bad);
    assert.equal(r.ok, false);
    if (!r.ok) assert.ok(r.problems.some((p) => p.includes("unknown fact F9")), r.problems.join("; "));
    const noHero = fixture();
    // Pages need a hero image (fixture places have none on purpose, so the checker must say so).
    const r2 = checkContentFile(noHero);
    assert.equal(r2.ok, false);
    if (!r2.ok) assert.ok(r2.problems.some((p) => p.includes("needs a hero image")));
  });

  test("seeding is idempotent, drafts only, and never overwrites people's work", async () => {
    // A user-created place that already exists (archived) with an untouched draft section.
    const [pre] = await db.insert(s.places).values({ kind: "state", name: "Uttar Pradesh", slug: "uttar-pradesh-t", status: "archived", summary: "User summary." }).returning();
    await db.insert(s.sections).values({ placeId: pre.id, key: "overview", body: { text: "User-written overview." }, status: "draft" });

    // Parsed like the seed command does (defaults applied); the hero-image rule is checked separately above.
    const file = contentFileSchema.parse(fixture());
    const r1 = await applyContentFile(file, checks, { images: false });
    assert.equal(r1.places.created, 1, "only Agra is new");
    assert.deepEqual(r1.places.unarchived, ["uttar-pradesh-t"]);
    const r2 = await applyContentFile(file, checks, { images: false });
    assert.equal(r2.places.created, 0);
    assert.equal(r2.facts.created, 0);
    assert.equal(r2.evidence, 0);
    assert.equal(r2.itineraries.created, 0);

    const [up] = await db.select().from(s.places).where(eq(s.places.id, pre.id));
    assert.equal(up.status, "draft");
    assert.equal(up.summary, "User summary.", "existing fields are never overwritten");
    const [ov] = await db.select().from(s.sections).where(and(eq(s.sections.placeId, pre.id), eq(s.sections.key, "overview")));
    assert.equal(ov.body.text, "User-written overview.", "user section kept");
    const sugg = await db.select().from(s.contentSuggestions).where(eq(s.contentSuggestions.placeId, pre.id));
    assert.equal(sugg.length, 1, "research arrives as one pending suggestion, not duplicated on re-run");

    const allPlaces = await db.select().from(s.places);
    assert.equal(allPlaces.length, 2);
    assert.ok(allPlaces.every((p) => p.status === "draft"), "nothing published");
    const facts = await db.select().from(s.researchFindings);
    assert.equal(facts.length, 3);
    const byTopic = Object.fromEntries(facts.map((f) => [f.topic, f]));
    assert.equal(byTopic["Taj Mahal closed on Fridays"].verification, "single_source");
    assert.equal(byTopic["Disputed fact"].verification, "conflicting");
    assert.ok(facts.every((f) => f.status === "pending"));
    const [agra] = allPlaces.filter((p) => p.slug === "agra");
    assert.deepEqual(agra.tripTypes, [], "trip types are only suggested");
    assert.deepEqual(agra.suggestedTripTypes, ["heritage"]);

    // An editor edits the seeded overview: the next seed run must not replace it.
    await db.update(s.sections).set({ body: { text: `${long} Edited.` }, locked: true }).where(and(eq(s.sections.placeId, agra.id), eq(s.sections.key, "overview")));
    await applyContentFile(file, checks, { images: false });
    const [agraOv] = await db.select().from(s.sections).where(and(eq(s.sections.placeId, agra.id), eq(s.sections.key, "overview")));
    assert.ok(agraOv.body.text?.endsWith("Edited."));
    // Seeded itinerary is a draft; once edited (locked) re-seeding leaves it alone.
    await db.update(s.itineraries).set({ title: "Edited title", locked: true }).where(eq(s.itineraries.slug, "agra-2-days-test"));
    const r4 = await applyContentFile(file, checks, { images: false });
    assert.deepEqual(r4.itineraries.skipped, ["agra-2-days-test (edited by a person)"]);
  });

  test("itineraries publish only after the guide is published and cited facts are verified; pages list only published", async () => {
    const [it] = await db.select().from(s.itineraries).where(eq(s.itineraries.slug, "agra-2-days-test"));
    assert.deepEqual(await listPublishedItineraries(), []);
    let r = await publishItinerary(it.id, editor);
    assert.equal(r.ok, false);
    if (!r.ok) assert.ok(r.problems?.some((p) => p.includes("Publish the destination guide first")), JSON.stringify(r));

    // Publish state + Agra the normal way (approve sections, add heroes).
    const [state] = await db.select().from(s.places).where(eq(s.places.slug, "uttar-pradesh-t"));
    const [agra] = await db.select().from(s.places).where(eq(s.places.slug, "agra"));
    for (const p of [state, agra]) {
      const [m] = await db.insert(s.media).values({ placeId: p.id, url: "/uploads/x.jpg", storageKey: "local:x.jpg", contentType: "image/jpeg", bytes: 1, alt: `${p.name} view`, license: "CC BY-SA 4.0", attribution: "Someone via Wikimedia Commons" }).returning();
      await db.update(s.places).set({ heroMediaId: m.id }).where(eq(s.places.id, p.id));
    }
    await db.update(s.sections).set({ body: { text: long }, status: "draft" }).where(and(eq(s.sections.placeId, state.id), eq(s.sections.key, "overview")));
    assert.ok((await approveSectionWithFacts(state.id, "overview", editor)).ok);
    assert.ok((await approveSectionWithFacts(state.id, "travel_tips", editor)).ok);
    assert.ok((await publishPlace(state.id, editor)).ok);
    assert.ok((await approveSectionWithFacts(agra.id, "overview", editor)).ok);
    assert.ok((await approveSectionWithFacts(agra.id, "visit_info", editor)).ok);
    const faq = await approveSectionWithFacts(agra.id, "faqs", editor);
    assert.equal(faq.ok, false, "a section citing a conflicting fact can't be approved");
    assert.ok((await publishPlace(agra.id, editor)).ok);

    r = await publishItinerary(it.id, editor);
    assert.ok(r.ok, JSON.stringify(r));
    const pub = await listPublishedItineraries();
    assert.equal(pub.length, 1);
    assert.equal(pub[0].title, "Edited title");
    assert.equal(pub[0].place.path, "/india/uttar-pradesh-t/agra");
    assert.ok(pub[0].hero, "falls back to the destination's hero");
    assert.ok(await getPublishedItinerary("agra-2-days-test"));

    // The listing pages read published snapshots only.
    const explore = await lists.exploreIndiaData();
    assert.deepEqual(explore.states.map((x) => [x.slug, x.destinationsCount]), [["uttar-pradesh-t", 1]]);
    const guides = await lists.travelGuidesData();
    assert.deepEqual(guides.guides.map((g) => g.href).sort(), ["/india/uttar-pradesh-t", "/india/uttar-pradesh-t/agra"]);
    const ttd = await lists.thingsToDoData();
    assert.deepEqual(ttd.items, [], "no attractions published");

    // Stop links resolve only to published places, same-state or "state/slug".
    assert.deepEqual(await resolveStopLinks(["agra", "uttar-pradesh-t/agra", "taj-mahal", "rajasthan/amber-fort"], "uttar-pradesh-t"), {
      agra: "/india/uttar-pradesh-t/agra",
      "uttar-pradesh-t/agra": "/india/uttar-pradesh-t/agra",
    });

    // Re-seeding after approval: sections identical to the research aren't re-suggested.
    const r5 = await applyContentFile(contentFileSchema.parse(fixture()), checks, { images: false });
    assert.ok(r5.sections.unchanged >= 2, JSON.stringify(r5.sections));
    const agraSuggestions = await db.select().from(s.contentSuggestions).where(eq(s.contentSuggestions.placeId, agra.id));
    assert.deepEqual(agraSuggestions.map((x) => x.sectionKey), ["overview"], "one suggestion for the edited overview however often the seed runs; none for approved, unchanged sections");
  });
}
