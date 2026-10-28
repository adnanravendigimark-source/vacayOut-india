/**
 * Integration test for the shared page template's data: activities and
 * travel guides from the content seed, publishing guides, and the rollup a
 * state / destination page shows. Local or *_test database only (it
 * truncates tables). Run: npm run test:db
 */
import assert from "node:assert/strict";
import { after, before, test } from "node:test";

const url = process.env.TEST_DATABASE_URL;
const safe = !!url && (/@(localhost|127\.0\.0\.1)[:/]/.test(url) || /\/[a-z0-9_]*_test(\?|$)/.test(url));

if (!safe) {
  test("rollup integration (skipped: set TEST_DATABASE_URL to a local or *_test database)", { skip: true }, () => {});
} else {
  process.env.DATABASE_URL = url;
  const { sql, eq } = await import("drizzle-orm");
  const { getDb } = await import("@/lib/db");
  const s = await import("@/lib/db/schema");
  const { checkContentFile, contentFileSchema } = await import("@/lib/seed/content-file");
  const { applyContentFile } = await import("@/lib/seed/apply");
  const { publishPlace } = await import("@/lib/publish/service");
  const { approveSectionWithFacts } = await import("@/lib/places/review");
  const { publishItinerary } = await import("@/lib/itineraries/service");
  const { publishGuide, listPublishedGuides, getPublishedGuide } = await import("@/lib/guides/service");
  const { placeRollup } = await import("./rollup");
  const lists = await import("./public-lists");

  const db = getDb();
  let editor = "";
  const long = (name: string) => `${name} is a place in the Kullu valley of Himachal Pradesh with temples, forests and mountain views for visitors. `.repeat(7).trim();
  const P = (key: string, kind: string, name: string, extra: Record<string, unknown> = {}) => ({
    key, kind, name, summary: `${name}, a test place in the Kullu valley.`, seoTitle: `${name} travel guide`, seoDescription: `Plan a visit to ${name}: what to see and do, when to go and how to get there, from checked sources.`,
    lat: 32.2, lng: 77.18, images: [{ commons: "File:Test.jpg", alt: `${name} test image`, hero: true }], sections: { overview: { text: long(name), facts: [] }, travel_tips: { items: [{ body: "Carry layers." }], facts: [] } }, ...extra,
  });

  const fixture = () => ({
    cluster: "kullu-test",
    title: "Kullu (test)",
    researchedAt: "2026-10-28",
    selection: "Test fixture for the shared-template rollup.",
    sources: { S1: { url: "https://himachaltourism.gov.in/", title: "Himachal Tourism", authority: "government" } },
    facts: {
      F1: { place: "hp-t/solang-t", topic: "Paragliding season", claim: "Paragliding runs in the summer months at Solang.", claimType: "schedule", kind: "seasonal", evidence: [{ source: "S1", quote: "paragliding in summer" }] },
    },
    places: [
      P("hp-t", "state", "Himachal Pradesh"),
      P("hp-t/manali-t", "town", "Manali"),
      P("hp-t/solang-t", "nature", "Solang Valley", { parent: "hp-t/manali-t" }),
      P("hp-t/paragliding-t", "activity", "Paragliding at Solang", { parent: "hp-t/solang-t", category: "adventure", sections: { overview: { text: long("Paragliding"), facts: ["F1"] }, visit_info: { items: [{ title: "Season", body: "Summer months.", status: "seasonal" }], facts: ["F1"] } } }),
    ],
    itineraries: [
      {
        place: "hp-t", slug: "hp-2-days-t", title: "Two days in the valley", summary: "A short test plan that stops at Solang Valley.", durationDays: 2, tripTypes: [],
        seoTitle: "2 days in the valley", seoDescription: "A two-day test itinerary through the Kullu valley with a stop at Solang Valley for the rollup integration test.",
        plan: {
          overview: "Test plan.",
          days: [{ title: "Solang", stops: [{ name: "Solang Valley", placeSlug: "solang-t" }] }, { title: "Rest", stops: [{ name: "Rest day" }] }],
          budget: { assumptions: "None.", lines: [] }, booking: [], alternatives: [],
        },
        facts: [], sources: [],
      },
    ],
    guides: [
      {
        place: "hp-t/manali-t", places: ["hp-t/paragliding-t"], slug: "paragliding-guide-t", title: "Paragliding near Manali, explained", summary: "Where and when to paraglide near Manali, for the test.", tripTypes: ["adventure"],
        seoTitle: "Paragliding near Manali guide", seoDescription: "A test guide to paragliding near Manali: the season, where flights take off and how to choose an operator, from checked sources.",
        body: { intro: "Paragliding near Manali happens at Solang Valley in the summer months; this test guide covers the basics.", sections: [{ heading: "When", text: "Summer months.", items: [{ body: "Summer", status: "seasonal" }] }, { heading: "Where", text: "Solang Valley." }] },
        facts: ["F1"], sources: ["S1"],
      },
    ],
  });
  const checks = { "F1#0": { support: "supports" as const, checkedAt: "2026-10-28T00:00:00Z" } };

  before(async () => {
    await db.execute(sql`truncate audit_log, travel_guide_places, travel_guides, itineraries, content_suggestions, finding_evidence, research_findings, research_runs, sources, publish_jobs, search_documents, sections, place_versions, place_relations, media, places, users cascade`);
    const [u] = await db.insert(s.users).values({ email: "rollup@test.local", name: "Rollup", passwordHash: "x", role: "admin" }).returning();
    editor = u.id;
  });
  after(async () => {
    await (getDb() as unknown as { $client: { end: () => Promise<void> } }).$client.end();
  });

  test("activities need a category; guides are checked like itineraries", () => {
    const ok = checkContentFile(fixture());
    assert.equal(ok.ok, true, ok.ok ? "" : ok.problems.join("; "));
    const bad = fixture();
    delete (bad.places[3] as Record<string, unknown>).category;
    bad.guides[0].places = ["hp-t/nowhere"];
    const r = checkContentFile(bad);
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.ok(r.problems.some((p) => p.includes("activities need a category")), r.problems.join("; "));
      assert.ok(r.problems.some((p) => p.includes("unknown linked place hp-t/nowhere")), r.problems.join("; "));
    }
  });

  test("seed → publish → the rollup lists everything inside a place, at any depth", async () => {
    const file = contentFileSchema.parse(fixture());
    const r1 = await applyContentFile(file, checks, { images: false });
    assert.equal(r1.guides.created, 1);
    assert.equal((await applyContentFile(file, checks, { images: false })).guides.created, 0, "idempotent");

    const all = await db.select().from(s.places);
    const by = Object.fromEntries(all.map((p) => [p.slug, p]));
    assert.equal(by["paragliding-t"].category, "adventure");
    const [g] = await db.select().from(s.travelGuides);
    assert.equal(g.status, "draft");
    const links = await db.select().from(s.travelGuidePlaces).where(eq(s.travelGuidePlaces.guideId, g.id));
    assert.equal(links.length, 2, "main place + linked activity");

    // Guide can't publish before its place.
    const early = await publishGuide(g.id, editor);
    assert.equal(early.ok, false);

    for (const slug of ["hp-t", "manali-t", "solang-t", "paragliding-t"]) {
      const p = by[slug];
      const [m] = await db.insert(s.media).values({ placeId: p.id, url: "/uploads/x.jpg", storageKey: "local:x.jpg", contentType: "image/jpeg", bytes: 1, alt: `${p.name} view`, license: "CC BY 4.0", attribution: "Someone" }).returning();
      await db.update(s.places).set({ heroMediaId: m.id }).where(eq(s.places.id, p.id));
      for (const sec of await db.select().from(s.sections).where(eq(s.sections.placeId, p.id))) {
        const a = await approveSectionWithFacts(p.id, sec.key, editor);
        assert.ok(a.ok, JSON.stringify(a));
      }
      const pub = await publishPlace(p.id, editor);
      assert.ok(pub.ok, JSON.stringify(pub));
    }
    const [it] = await db.select().from(s.itineraries);
    assert.ok((await publishItinerary(it.id, editor)).ok);
    const gp = await publishGuide(g.id, editor);
    assert.ok(gp.ok, JSON.stringify(gp));
    const live = await getPublishedGuide("paragliding-guide-t");
    assert.ok(live);
    assert.deepEqual(live.places.map((p) => p.slug).sort(), ["manali-t", "paragliding-t"]);
    assert.equal((await listPublishedGuides()).length, 1);

    const state = await placeRollup({ id: by["hp-t"].id, slug: "hp-t", kind: "state" }, "hp-t");
    assert.deepEqual(state.destinations.map((p) => p.slug), ["manali-t"]);
    assert.deepEqual(state.attractions.map((p) => p.slug), ["solang-t"], "grandchildren roll up to the state");
    assert.deepEqual(state.activities.map((p) => [p.slug, p.category]), [["paragliding-t", "adventure"]]);
    assert.deepEqual(state.itineraries.map((i) => i.slug), ["hp-2-days-t"]);
    assert.deepEqual(state.guides.map((x) => x.slug), ["paragliding-guide-t"]);

    const manali = await placeRollup({ id: by["manali-t"].id, slug: "manali-t", kind: "town" }, "hp-t");
    assert.deepEqual(manali.itineraries.map((i) => i.slug), ["hp-2-days-t"], "matched through a stop inside Manali");
    assert.deepEqual(manali.activities.map((p) => p.slug), ["paragliding-t"]);

    const solang = await placeRollup({ id: by["solang-t"].id, slug: "solang-t", kind: "nature" }, "hp-t");
    assert.deepEqual(solang.guides.map((x) => x.slug), ["paragliding-guide-t"], "a guide linked to a child shows on the parent");

    // Things-to-do hub: activity first with its category and destination; travel-guides hub has the article.
    const ttd = await lists.thingsToDoData();
    assert.deepEqual(ttd.items.map((i) => [i.slug, i.category, i.destination?.slug ?? null]), [["paragliding-t", "adventure", "manali-t"], ["solang-t", "sightseeing", "manali-t"]]);
    const tg = await lists.travelGuidesData();
    assert.deepEqual(tg.articles.map((a) => a.href), ["/travel-guides/paragliding-guide-t"]);

    // An unpublished main place hides the guide everywhere.
    await db.update(s.places).set({ status: "draft" }).where(eq(s.places.id, by["manali-t"].id));
    assert.equal(await getPublishedGuide("paragliding-guide-t"), null);
  });
}
