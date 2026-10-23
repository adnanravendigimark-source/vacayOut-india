/**
 * Integration test: one publish action keeps every public surface consistent.
 * Runs against a real Postgres ONLY when TEST_DATABASE_URL points at a local
 * or *_test database (it truncates tables). Run: npm run test:db
 */
import assert from "node:assert/strict";
import { after, before, test } from "node:test";

const url = process.env.TEST_DATABASE_URL;
const safe = !!url && (/@(localhost|127\.0\.0\.1)[:/]/.test(url) || /\/[a-z0-9_]*_test(\?|$)/.test(url));

if (!safe) {
  test("publish integration (skipped: set TEST_DATABASE_URL to a local or *_test database)", { skip: true }, () => {});
} else {
  process.env.DATABASE_URL = url;
  const { sql, eq } = await import("drizzle-orm");
  const { getDb } = await import("@/lib/db");
  const s = await import("@/lib/db/schema");
  const { publishPlace, unpublishPlace } = await import("./service");
  const repo = await import("@/lib/places/repo");

  const db = getDb();
  const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(" ");
  let actor = "";
  const ids: Record<string, string> = {};

  async function makePlace(v: Partial<typeof s.places.$inferInsert> & { kind: (typeof s.placeKind.enumValues)[number]; name: string; slug: string }, opts: { hero?: boolean; words?: number } = {}) {
    const [p] = await db.insert(s.places).values({ summary: `${v.name} summary.`, seoTitle: `${v.name} guide`, seoDescription: `Plan ${v.name}.`, ...v }).returning();
    await db.insert(s.sections).values([
      { placeId: p.id, key: "overview", body: { text: words(opts.words ?? 130) }, status: "approved" },
      { placeId: p.id, key: "travel_tips", body: { items: [{ body: "Carry layers." }] }, status: "approved" },
      { placeId: p.id, key: "best_time", body: { text: "DRAFT-SECRET text" }, status: "draft" },
    ]);
    if (opts.hero !== false) {
      const [m] = await db.insert(s.media).values({ placeId: p.id, url: "/uploads/test.jpg", storageKey: "local:test.jpg", contentType: "image/jpeg", bytes: 10, alt: `${v.name} view`, license: "Own photo" }).returning();
      await db.update(s.places).set({ heroMediaId: m.id }).where(eq(s.places.id, p.id));
    }
    return p.id;
  }

  before(async () => {
    await db.execute(sql`truncate audit_log, auth_failures, publish_jobs, search_documents, place_relations, redirects, sections, place_versions, media, places, users cascade`);
    const [u] = await db.insert(s.users).values({ email: "t@test.local", name: "T", passwordHash: "x", role: "admin" }).returning();
    actor = u.id;
    ids.hp = await makePlace({ kind: "state", name: "Himachal Pradesh", slug: "himachal-pradesh" });
    ids.manali = await makePlace({ kind: "city", name: "Manali", slug: "manali", parentId: ids.hp, stateId: ids.hp });
    ids.hadimba = await makePlace({ kind: "temple", name: "Hadimba Temple", slug: "hadimba-temple", parentId: ids.manali, stateId: ids.hp, displayMode: "parent_section", seoTitle: null, seoDescription: null }, { hero: false, words: 45 });
  });

  after(async () => {
    const { getDb: g } = await import("@/lib/db");
    await (g() as unknown as { $client: { end: () => Promise<void> } }).$client.end();
  });

  const searchPaths = async () => (await db.select({ path: s.searchDocuments.path }).from(s.searchDocuments)).map((r) => r.path).sort();
  const sitemap = async () => (await repo.listPublishedForSitemap()).map((r) => (r.kind === "state" ? r.slug : `${r.stateSlug}/${r.slug}`)).sort();
  const directory = async () => (await repo.listDirectory()).map((g) => [g.state.slug, g.places.map((p) => p.slug)]);

  test("child can't publish before its parent", async () => {
    const r = await publishPlace(ids.manali, actor);
    assert.equal(r.ok, false);
    assert.ok(!r.ok && r.problems?.some((p) => p.includes("parent")));
    assert.deepEqual(await searchPaths(), []);
  });

  test("publishing updates page data, directory, sitemap and AI search together", async () => {
    assert.deepEqual(await publishPlace(ids.hp, actor), { ok: true, version: 1 });
    assert.deepEqual(await publishPlace(ids.manali, actor), { ok: true, version: 1 });
    assert.deepEqual(await publishPlace(ids.hadimba, actor), { ok: true, version: 1 });

    const page = await repo.getPublishedPlace("himachal-pradesh", "manali");
    assert.ok(page);
    assert.ok(!JSON.stringify(page.snapshot).includes("DRAFT-SECRET"), "drafts never published");
    assert.equal(page.snapshot.place.hero?.alt, "Manali view");

    assert.deepEqual(await directory(), [["himachal-pradesh", ["manali"]]]);
    assert.deepEqual(await sitemap(), ["himachal-pradesh", "himachal-pradesh/manali"]);
    assert.deepEqual(await searchPaths(), ["/india/himachal-pradesh", "/india/himachal-pradesh/manali", "/india/himachal-pradesh/manali#hadimba-temple"]);

    const inline = await repo.listInlineChildren(ids.manali);
    assert.deepEqual(inline.map((i) => i.slug), ["hadimba-temple"]);
    assert.equal(await repo.findInlinePlacement("himachal-pradesh", "hadimba-temple"), "/india/himachal-pradesh/manali#hadimba-temple");
    assert.equal(await repo.getPublishedPlace("himachal-pradesh", "hadimba-temple"), null, "inline places have no own page");

    const jobs = await db.select().from(s.publishJobs);
    assert.equal(jobs.length, 3, "one refresh job per publish");
    const [hpRow] = await db.select({ updatedAt: s.places.updatedAt, versionId: s.places.publishedVersionId }).from(s.places).where(eq(s.places.id, ids.hp));
    const [ver] = await db.select({ at: s.placeVersions.publishedAt }).from(s.placeVersions).where(eq(s.placeVersions.id, hpRow.versionId!));
    assert.equal(hpRow.updatedAt.getTime(), ver.at.getTime(), "not shown as 'edited since publish' right after publishing");
  });

  test("editing after publish doesn't leak until republished", async () => {
    await db.update(s.sections).set({ body: { text: `CHANGED ${words(130)}` } }).where(sql`${s.sections.placeId} = ${ids.manali} and ${s.sections.key} = 'overview'`);
    const before = await repo.getPublishedPlace("himachal-pradesh", "manali");
    assert.ok(!JSON.stringify(before).includes("CHANGED"));
    const [doc] = await db.select().from(s.searchDocuments).where(eq(s.searchDocuments.placeId, ids.manali));
    assert.ok(!doc.content.includes("CHANGED"), "AI search unchanged until publish");
    assert.deepEqual(await publishPlace(ids.manali, actor), { ok: true, version: 2 });
    const [doc2] = await db.select().from(s.searchDocuments).where(eq(s.searchDocuments.placeId, ids.manali));
    assert.ok(doc2.content.includes("CHANGED"));
  });

  test("unpublish is refused while children are live, then removes everything", async () => {
    const refused = await unpublishPlace(ids.hp, actor);
    assert.equal(refused.ok, false);
    assert.ok((await repo.getPublishedState("himachal-pradesh")) !== null);

    assert.equal((await unpublishPlace(ids.hadimba, actor)).ok, true);
    assert.equal((await unpublishPlace(ids.manali, actor, { archive: true })).ok, true);
    assert.equal(await repo.getPublishedPlace("himachal-pradesh", "manali"), null);
    assert.deepEqual(await directory(), [["himachal-pradesh", []]]);
    assert.deepEqual(await sitemap(), ["himachal-pradesh"]);
    assert.deepEqual(await searchPaths(), ["/india/himachal-pradesh"]);
    const [m] = await db.select({ status: s.places.status }).from(s.places).where(eq(s.places.id, ids.manali));
    assert.equal(m.status, "archived");
  });

  test("a failed page refresh is recorded for retry, never lost", async () => {
    // Outside a Next.js request, revalidatePath throws: exactly the failure we must survive.
    const jobs = await db.select({ status: s.publishJobs.status, lastError: s.publishJobs.lastError }).from(s.publishJobs);
    assert.ok(jobs.length >= 5);
    assert.ok(jobs.every((j) => j.status === "done" || (j.status === "failed" && j.lastError)), JSON.stringify(jobs[0]));
  });
}
