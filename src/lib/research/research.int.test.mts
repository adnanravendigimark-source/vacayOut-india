/**
 * Integration test for research runs against a real Postgres (local or *_test only; it truncates).
 * Model calls and page fetches are stubbed; everything else is real.
 */
import assert from "node:assert/strict";
import { after, before, test } from "node:test";

const url = process.env.TEST_DATABASE_URL;
const safe = !!url && (/@(localhost|127\.0\.0\.1)[:/]/.test(url) || /\/[a-z0-9_]*_test(\?|$)/.test(url));

if (!safe) {
  test("research integration (skipped: set TEST_DATABASE_URL to a local or *_test database)", { skip: true }, () => {});
} else {
  process.env.DATABASE_URL = url;
  process.env.OPENAI_API_KEY ||= "test-key";
  process.env.RESEARCH_RUN_RESERVE_USD = "1.5";
  delete process.env.RESEARCH_MONTHLY_BUDGET_USD;
  const { sql, eq } = await import("drizzle-orm");
  const { getDb } = await import("@/lib/db");
  const s = await import("@/lib/db/schema");
  const svc = await import("./service");
  type Deps = Parameters<typeof svc.executeRun>[1];

  const db = getDb();
  let actor = "";
  const ids: Record<string, string> = {};

  const response = (json: unknown, sources: string[], usage = { input_tokens: 20_000, output_tokens: 1_000 }) => ({
    id: "r",
    status: "completed",
    usage,
    output: [
      ...(sources.length ? [{ type: "web_search_call", action: { type: "search", sources: sources.map((u) => ({ type: "url", url: u })) } }] : []),
      { type: "message", content: [{ type: "output_text", text: JSON.stringify(json) }] },
    ],
  });

  const factsDeps: Deps = {
    fetchPage: async (u: string) => ({ ok: true, url: u, status: 200, title: "Official page", text: "Opening time - 08:00 AM. Closing time - 06:00 PM.", pageDate: "2026-05-01" }),
    call: async (body: Record<string, unknown>) =>
      body.tools
        ? response(
            {
              notes: "",
              findings: [
                {
                  section: "travel_tips",
                  topic: "Opening hours",
                  claim: "Open 8 AM to 6 PM.",
                  claim_type: "opening_hours",
                  conflict: null,
                  evidence: [{ url: "https://himachaltourism.gov.in/hadimba", title: null, quote: "Opening time - 08:00 AM. Closing time - 06:00 PM.", source_date: null }],
                },
              ],
            },
            ["https://himachaltourism.gov.in/hadimba"],
          )
        : response({ results: [{ id: 0, verdict: "supports", note: "ok" }] }, [], { input_tokens: 500, output_tokens: 50 }),
  } as unknown as Deps;

  before(async () => {
    await db.execute(sql`truncate audit_log, app_settings, sources, publish_jobs, search_documents, sections, place_versions, media, places, users cascade`);
    const [u] = await db.insert(s.users).values({ email: "r@test.local", name: "R", passwordHash: "x", role: "admin" }).returning();
    actor = u.id;
    const [hp] = await db.insert(s.places).values({ kind: "state", name: "Himachal Pradesh", slug: "himachal-pradesh" }).returning();
    const [manali] = await db.insert(s.places).values({ kind: "city", name: "Manali", slug: "manali", parentId: hp.id, stateId: hp.id }).returning();
    const [hadimba] = await db.insert(s.places).values({ kind: "temple", name: "Hadimba Temple", slug: "hadimba-temple", parentId: manali.id, stateId: hp.id }).returning();
    Object.assign(ids, { hp: hp.id, manali: manali.id, hadimba: hadimba.id });
  });

  after(async () => {
    await (getDb() as unknown as { $client: { end: () => Promise<void> } }).$client.end();
  });

  test("a run stores pending findings with evidence and real cost, and touches nothing public", async () => {
    const start = await svc.startRun({ kind: "place_facts", placeId: ids.hadimba, focus: ["travel_tips"], userId: actor });
    assert.ok(start.ok);
    if (!start.ok) return;
    const second = await svc.startRun({ kind: "place_facts", placeId: ids.hadimba, focus: [], userId: actor });
    assert.equal(second.ok, false, "one run per place at a time");

    await svc.executeRun(start.runId, factsDeps);
    const [run] = await db.select().from(s.researchRuns).where(eq(s.researchRuns.id, start.runId));
    assert.equal(run.status, "done");
    assert.equal(run.reservedMicroUsd, 0);
    // 20k in @ $5/M + 1k out @ $30/M + 1 search @ $0.01 + check call (500 in @0.75, 50 out @4.5)
    assert.equal(run.costMicroUsd, 100_000 + 30_000 + 10_000 + Math.ceil(375 + 225));

    const findings = await svc.listFindingsForPlace(ids.hadimba);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].status, "pending");
    assert.equal(findings[0].verification, "single_source", "one authoritative source is not 'verified'");
    assert.equal(findings[0].evidence[0].e.support, "supports");
    assert.equal(findings[0].evidence[0].s.authority, "government");
    assert.equal(findings[0].evidence[0].e.sourceDate, "2026-05-01");

    const touched = await db.execute(sql`select (select count(*) from sections) as s, (select count(*) from place_versions) as v, (select count(*) from search_documents) as d`);
    assert.deepEqual(touched.rows[0], { s: "0", v: "0", d: "0" });

    // A second run re-uses the same source row.
    const again = await svc.startRun({ kind: "place_facts", placeId: ids.hadimba, focus: [], userId: actor });
    assert.ok(again.ok);
    if (again.ok) await svc.executeRun(again.runId, factsDeps);
    const srcCount = await db.execute(sql`select count(*)::int as n from sources`);
    assert.equal(srcCount.rows[0].n, 1);
  });

  test("a failing run is recorded as failed with the cost already spent", async () => {
    const start = await svc.startRun({ kind: "place_facts", placeId: ids.manali, focus: [], userId: actor });
    assert.ok(start.ok);
    if (!start.ok) return;
    await svc.executeRun(start.runId, {
      fetchPage: factsDeps!.fetchPage,
      call: async () => ({ id: "r", status: "completed", usage: { input_tokens: 10_000, output_tokens: 0 }, output: [{ type: "message", content: [{ type: "output_text", text: "not json" }] }] }),
    } as unknown as Deps);
    const [run] = await db.select().from(s.researchRuns).where(eq(s.researchRuns.id, start.runId));
    assert.equal(run.status, "failed");
    assert.match(run.error ?? "", /unreadable/);
    assert.equal(run.costMicroUsd, 50_000);
    assert.equal(run.reservedMicroUsd, 0);
  });

  test("the monthly budget blocks new runs, counting money held by runs in progress", async () => {
    await svc.setBudgetUsd(2, actor); // already spent ≈ $0.33; one $1.50 reservation fits, a second doesn't
    const a = await svc.startRun({ kind: "place_facts", placeId: ids.hp, focus: [], userId: actor });
    assert.ok(a.ok);
    const b = await svc.startRun({ kind: "discover_places", placeId: ids.manali, focus: [], userId: actor });
    assert.equal(b.ok, false);
    if (!b.ok) assert.match(b.message, /budget/);
    if (a.ok) await db.update(s.researchRuns).set({ status: "failed", reservedMicroUsd: 0 }).where(eq(s.researchRuns.id, a.runId));
    await svc.setBudgetUsd(20, actor);
  });

  test("stale runs are expired so they stop holding budget", async () => {
    const [r] = await db
      .insert(s.researchRuns)
      .values({ kind: "place_facts", placeId: ids.hp, model: "m", status: "running", reservedMicroUsd: 1_500_000, createdAt: new Date(Date.now() - 60 * 60_000) })
      .returning();
    const status = await svc.budgetStatus();
    assert.equal(status.active, 0);
    const [after] = await db.select().from(s.researchRuns).where(eq(s.researchRuns.id, r.id));
    assert.equal(after.status, "failed");
  });

  test("discovery flags likely duplicates and skips repeats of pending suggestions", async () => {
    const deps = {
      fetchPage: factsDeps!.fetchPage,
      call: async () =>
        response(
          {
            notes: "",
            places: [
              { name: "Hadimba Temple", kind: "temple", reason: "Old wooden temple.", evidence: [{ url: "https://a.gov.in/x", title: null, quote: "Hadimba Temple" }] },
              { name: "Solang Valley", kind: "nature", reason: "Snow sports.", evidence: [{ url: "https://a.gov.in/x", title: null, quote: "Solang Valley" }] },
            ],
          },
          ["https://a.gov.in/x"],
        ),
    } as unknown as Deps;
    for (let i = 0; i < 2; i++) {
      const r = await svc.startRun({ kind: "discover_places", placeId: ids.manali, focus: [], userId: actor });
      assert.ok(r.ok);
      if (r.ok) await svc.executeRun(r.runId, deps);
    }
    const rows = await svc.listCandidates(ids.manali);
    assert.deepEqual(rows.map((r) => r.c.name).sort(), ["Hadimba Temple", "Solang Valley"], "second run adds no repeats");
    const dup = rows.find((r) => r.c.name === "Hadimba Temple");
    assert.equal(dup?.c.matchedPlaceId, ids.hadimba);
    assert.equal(dup?.matchedName, "Hadimba Temple");
  });

  test("discovery is refused on an attraction", async () => {
    const r = await svc.startRun({ kind: "discover_places", placeId: ids.hadimba, focus: [], userId: actor });
    assert.equal(r.ok, false);
  });


}
