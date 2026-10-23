/**
 * Generation steps against a real Postgres and a local mock of the OpenAI API.
 * Covers: atomic budget holds, retry/resume without paying twice, protecting
 * edited sections, approving sections with their facts, shared facts, and the
 * publish block. (The workflow engine itself is exercised in the browser test.)
 */
import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";

const url = process.env.TEST_DATABASE_URL;
const safe = !!url && (/@(localhost|127\.0\.0\.1)[:/]/.test(url) || /\/[a-z0-9_]*_test(\?|$)/.test(url));

if (!safe) {
  test("generation integration (skipped)", { skip: true }, () => {});
} else {
  // ---- mock OpenAI ----
  const calls = { posts: 0, backgroundPosts: 0, gets: 0, byName: {} as Record<string, number> };
  let pendingPolls = 0;
  const reply = (name: string) => {
    if (name === "place_research")
      return {
        notes: "",
        findings: [
          { section: "travel_tips", topic: "Hours", claim: "Open 8 AM to 6 PM.", claim_type: "opening_hours", conflict: null, evidence: [{ url: "https://example.invalid/hours", title: null, quote: "Open from 8 AM to 6 PM daily.", source_date: null }] },
        ],
      };
    if (name === "draft_list") return { notes: "", items: [{ text: "Go at 8 AM when it opens.", facts: ["F1"], places: [] }, { text: "Fees changed in 2025.", facts: ["F2"], places: [] }] };
    if (name === "draft_text") return { notes: "", paragraphs: [{ text: "A cedar-forest temple that opens at 8 AM.", facts: ["F1"] }] };
    if (name === "draft_details") return { summary: "Cedar-forest temple.", seo_title: "Hadimba Temple guide", seo_description: "Visit from 8 AM.", trip_types: ["spiritual", "not-a-type", "heritage"], facts: ["F1"], notes: "" };
    return { notes: "", items: [] };
  };
  const out = (id: string, name: string, sources: string[] = []) => ({
    id,
    status: "completed",
    usage: { input_tokens: 10_000, output_tokens: 1_000 },
    output: [
      ...(sources.length ? [{ type: "web_search_call", action: { type: "search", sources: sources.map((u) => ({ type: "url", url: u })) } }] : []),
      { type: "message", content: [{ type: "output_text", text: JSON.stringify(reply(name)) }] },
    ],
  });
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      res.setHeader("content-type", "application/json");
      if (req.method === "POST" && req.url === "/responses") {
        const b = JSON.parse(body);
        const name = b.text?.format?.name ?? "";
        calls.posts++;
        calls.byName[name] = (calls.byName[name] ?? 0) + 1;
        if (b.background) {
          calls.backgroundPosts++;
          return res.end(JSON.stringify({ id: `resp_bg_${calls.backgroundPosts}`, status: "queued", output: [] }));
        }
        return res.end(JSON.stringify(out(`resp_${calls.posts}`, name)));
      }
      if (req.method === "GET" && req.url?.startsWith("/responses/")) {
        calls.gets++;
        const id = req.url.split("/").pop()!;
        if (pendingPolls > 0) {
          pendingPolls--;
          return res.end(JSON.stringify({ id, status: "in_progress", output: [] }));
        }
        return res.end(JSON.stringify(out(id, "place_research", ["https://example.invalid/hours"])));
      }
      res.statusCode = 404;
      res.end("{}");
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  process.env.OPENAI_BASE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  process.env.OPENAI_API_KEY = "test";
  process.env.OPENAI_BACKGROUND_WAIT_MS = "300";
  process.env.OPENAI_BACKGROUND_POLL_MS = "50";
  process.env.DATABASE_URL = url;

  const { sql, eq, and } = await import("drizzle-orm");
  const { getDb } = await import("@/lib/db");
  const s = await import("@/lib/db/schema");
  const jobs = await import("./jobs");
  const steps = await import("./steps");
  const review = await import("@/lib/places/review");
  const research = await import("@/lib/research/service");

  const db = getDb();
  let actor = "";
  const ids: Record<string, string> = {};

  before(async () => {
    await db.execute(sql`truncate audit_log, app_settings, sources, content_suggestions, research_runs, sections, place_versions, media, places, users cascade`);
    const [u] = await db.insert(s.users).values({ email: "g@test.local", name: "G", passwordHash: "x", role: "admin" }).returning();
    actor = u.id;
    const [hp] = await db.insert(s.places).values({ kind: "state", name: "Himachal Pradesh", slug: "himachal-pradesh" }).returning();
    const [t] = await db.insert(s.places).values({ kind: "temple", name: "Hadimba Temple", slug: "hadimba-temple", parentId: hp.id, stateId: hp.id }).returning();
    Object.assign(ids, { hp: hp.id, temple: t.id });
    await research.setBudgetUsd(20, actor);
  });
  after(async () => {
    server.close();
    await (getDb() as unknown as { $client: { end: () => Promise<void> } }).$client.end();
  });

  const newJob = async (sections: string[] = ["travel_tips"], research = true) => {
    const r = await jobs.createJob({ placeId: ids.temple, userId: actor, sections, include: { coordinates: false, research, discover: false, details: false, image: false } });
    assert.ok(r.ok, JSON.stringify(r));
    return r.ok ? r.jobId : "";
  };

  test("budget holds are atomic: two steps racing for the last money → one waits", async () => {
    const job = await newJob();
    await research.setBudgetUsd(0.4, actor); // room for one $0.25 draft hold, not two
    const [a, b] = await Promise.all([jobs.claimStep(job, "draft:x", "draft", 250_000), jobs.claimStep(job, "draft:y", "draft", 250_000)]);
    assert.deepEqual([a.state, b.state].sort(), ["claimed", "waiting_budget"]);
    // A retry of the claimed step (after its lease is released) keeps its hold instead of adding another.
    const claimed = a.state === "claimed" ? a : b;
    if (claimed.state !== "claimed") return;
    await jobs.releaseLease(claimed.runId);
    const again = await jobs.claimStep(job, a.state === "claimed" ? "draft:x" : "draft:y", "draft", 250_000);
    assert.equal(again.state, "claimed");
    const [row] = await db.select().from(s.researchRuns).where(eq(s.researchRuns.id, claimed.runId));
    assert.equal(row.reservedMicroUsd, 250_000);
    // While held (lease live), a duplicate delivery is told "busy".
    assert.equal((await jobs.claimStep(job, a.state === "claimed" ? "draft:x" : "draft:y", "draft", 250_000)).state, "busy");
    await jobs.finishJob(job, "failed", "test");
    await research.setBudgetUsd(20, actor);
    const [after] = await db.select().from(s.researchRuns).where(eq(s.researchRuns.id, claimed.runId));
    assert.equal(after.reservedMicroUsd, 0, "stopping a job returns its holds");
  });

  test("research: a retry resumes the same background request and is billed once", async () => {
    const job = await newJob();
    pendingPolls = 100; // still running after the first attempt's wait
    await assert.rejects(steps.researchStep(job), (e: Error) => e instanceof steps.RetryLater);
    assert.equal(calls.backgroundPosts, 1);
    const [child] = await db.select().from(s.researchRuns).where(and(eq(s.researchRuns.parentRunId, job), eq(s.researchRuns.stepKey, "research")));
    assert.equal(child.openaiResponseId, "resp_bg_1", "request id saved before waiting");
    pendingPolls = 0;
    assert.equal(await steps.researchStep(job), "done");
    assert.equal(calls.backgroundPosts, 1, "no second paid request");
    const [done] = await db.select().from(s.researchRuns).where(eq(s.researchRuns.id, child.id));
    assert.equal(done.status, "done");
    assert.deepEqual(done.billedResponses, ["resp_bg_1"]);
    const costAfter = done.costMicroUsd;
    assert.ok(costAfter > 0);
    // Running the step again does nothing and costs nothing.
    assert.equal(await steps.researchStep(job), "done");
    assert.equal(calls.backgroundPosts, 1);
    const findings = await db.select().from(s.researchFindings).where(eq(s.researchFindings.placeId, ids.temple));
    assert.equal(findings.length, 1, "findings saved once");
    await jobs.finishJob(job, "done");
  });

  async function seedFacts() {
    await db.delete(s.researchFindings).where(eq(s.researchFindings.placeId, ids.temple));
    const [src] = await db.insert(s.sources).values({ url: "https://example.org/a", host: "example.org", site: "example.org" }).onConflictDoUpdate({ target: s.sources.url, set: { title: null } }).returning();
    const [run] = await db.insert(s.researchRuns).values({ kind: "place_facts", placeId: ids.temple, model: "m", status: "done" }).returning();
    const [ok] = await db.insert(s.researchFindings).values({ runId: run.id, placeId: ids.temple, sectionKey: "travel_tips", topic: "Hours", claim: "Open 8 AM to 6 PM.", claimType: "general", verification: "single_source" }).returning();
    const [conf] = await db.insert(s.researchFindings).values({ runId: run.id, placeId: ids.temple, sectionKey: "travel_tips", topic: "Fees", claim: "Fees changed in 2025.", claimType: "general", verification: "conflicting", conflictNote: "Sites disagree" }).returning();
    await db.insert(s.findingEvidence).values([
      { findingId: ok.id, sourceId: src.id, quote: "Open 8 AM to 6 PM", support: "supports" },
      { findingId: conf.id, sourceId: src.id, quote: "Fees changed in 2025", support: "contradicts" },
    ]);
    return { ok: ok.id, conf: conf.id };
  }

  test("drafting writes untouched sections, never overwrites edits, and is not repeated on retry", async () => {
    const facts = await seedFacts();
    const job = await newJob(["travel_tips", "overview"], false);
    const before = calls.byName["draft_list"] ?? 0;
    assert.equal(await steps.draftStep(job, "travel_tips"), "done");
    assert.equal(await steps.draftStep(job, "travel_tips"), "done");
    assert.equal(calls.byName["draft_list"], before + 1, "retry didn't call the model again");
    const [sec] = await db.select().from(s.sections).where(and(eq(s.sections.placeId, ids.temple), eq(s.sections.key, "travel_tips")));
    assert.equal(sec.status, "draft");
    assert.deepEqual(new Set(sec.findingIds), new Set([facts.ok, facts.conf]), "conflicting (checked) facts may be used; shown as Needs review");

    // A person edits overview, then a new job regenerates it → suggestion, text kept.
    await db.insert(s.sections).values({ placeId: ids.temple, key: "overview", body: { text: "My own words about the temple." }, status: "draft", locked: true });
    assert.equal(await steps.draftStep(job, "overview"), "done");
    const [ov] = await db.select().from(s.sections).where(and(eq(s.sections.placeId, ids.temple), eq(s.sections.key, "overview")));
    assert.equal(ov.body.text, "My own words about the temple.");
    const sugg = await db.select().from(s.contentSuggestions).where(and(eq(s.contentSuggestions.placeId, ids.temple), eq(s.contentSuggestions.sectionKey, "overview"), eq(s.contentSuggestions.status, "pending")));
    assert.equal(sugg.length, 1);
    await jobs.finishJob(job, "done");
  });

  test("approving a section approves only verified facts; conflicts block until decided; shared facts stay consistent", async () => {
    const [tips] = await db.select().from(s.sections).where(and(eq(s.sections.placeId, ids.temple), eq(s.sections.key, "travel_tips")));
    const [okId, confId] = tips.findingIds.length === 2 ? [tips.findingIds[0], tips.findingIds[1]] : ["", ""];
    const conflicting = (await db.select().from(s.researchFindings).where(eq(s.researchFindings.verification, "conflicting")))[0].id;
    const verified = [okId, confId].find((x) => x !== conflicting)!;

    const blocked = await review.approveSectionWithFacts(ids.temple, "travel_tips", actor);
    assert.equal(blocked.ok, false);
    if (!blocked.ok) assert.match(blocked.problems.join(" "), /sources disagree/);
    const stillPending = await db.select().from(s.researchFindings).where(eq(s.researchFindings.id, verified));
    assert.equal(stillPending[0].status, "pending", "nothing approved when blocked");

    // Admin decides the conflict (rejects it) → section must be rewritten first; approve the other way: drop the fact from the section.
    await db.update(s.sections).set({ findingIds: [verified], body: { items: [{ body: "Go at 8 AM when it opens." }] } }).where(eq(s.sections.id, tips.id));
    // Same fact also cited by FAQs (shared).
    await db.insert(s.sections).values({ placeId: ids.temple, key: "faqs", body: { items: [{ title: "When does it open?", body: "8 AM." }] }, status: "draft", findingIds: [verified] });

    const ok = await review.approveSectionWithFacts(ids.temple, "travel_tips", actor);
    assert.deepEqual(ok, { ok: true, approvedFacts: 1 });
    const [fact] = await db.select().from(s.researchFindings).where(eq(s.researchFindings.id, verified));
    assert.equal(fact.status, "approved");
    const states = await review.sectionReview(ids.temple);
    const faq = states.find((x) => x.key === "faqs")!;
    assert.equal(faq.cited[0].status, "approved", "shared fact shows approved in FAQs too");
    assert.deepEqual(faq.cited[0].usedIn.sort(), ["FAQs", "Travel tips"]);
    assert.ok((await review.approveSectionWithFacts(ids.temple, "faqs", actor)).ok);

    // Rejecting the shared fact later sends BOTH approved sections back to draft, and publishing is blocked.
    await db.transaction(async (tx) => {
      await tx.update(s.researchFindings).set({ status: "rejected" }).where(eq(s.researchFindings.id, verified));
      await review.reopenSectionsCiting(tx, verified);
    });
    const after = await db.select({ key: s.sections.key, status: s.sections.status }).from(s.sections).where(eq(s.sections.placeId, ids.temple));
    assert.equal(after.find((x) => x.key === "travel_tips")?.status, "draft");
    assert.equal(after.find((x) => x.key === "faqs")?.status, "draft");

    // If an approved section somehow cites a non-approved fact, publish refuses.
    await db.update(s.sections).set({ status: "approved" }).where(and(eq(s.sections.placeId, ids.temple), eq(s.sections.key, "faqs")));
    const problems = await review.unapprovedCitations(db, ids.temple);
    assert.match(problems.join(" "), /FAQs.*aren’t approved/);
  });

  test("details fill only empty fields; existing text gets a suggestion", async () => {
    await db.update(s.places).set({ seoTitle: "My title" }).where(eq(s.places.id, ids.temple));
    await db.update(s.researchFindings).set({ status: "approved" }).where(eq(s.researchFindings.placeId, ids.temple));
    const r = await jobs.createJob({ placeId: ids.temple, userId: actor, sections: [], include: { coordinates: false, research: false, discover: false, details: true, image: false } });
    assert.ok(r.ok);
    if (!r.ok) return;
    assert.equal(await steps.detailsStep(r.jobId), "done");
    const [p] = await db.select().from(s.places).where(eq(s.places.id, ids.temple));
    assert.equal(p.seoTitle, "My title");
    assert.equal(p.summary, "Cedar-forest temple.");
    // Trip types are only suggested (unknown values dropped); confirmed tags stay untouched.
    assert.deepEqual(p.suggestedTripTypes, ["heritage", "spiritual"]);
    assert.deepEqual(p.tripTypes, []);
    const sug = await db.select().from(s.contentSuggestions).where(and(eq(s.contentSuggestions.placeId, ids.temple), sql`${s.contentSuggestions.sectionKey} is null`, eq(s.contentSuggestions.status, "pending")));
    assert.equal(sug.length, 1);
    await jobs.finishJob(r.jobId, "done");
  });

  test("auto-picked photos must name the place", async () => {
    const { namesPlace } = await import("@/lib/media/import");
    assert.equal(namesPlace({ title: "File:Kasol village, Parvati valley.jpg", description: "" }, "Kasol"), true);
    assert.equal(namesPlace({ title: "File:Hadimba Temple Manali.jpg", description: "Near Kullu" }, "Kasol"), false);
    assert.equal(namesPlace({ title: "File:Manikaran.jpg", description: "Gurdwara at Manikaran Sahib" }, "Manikaran"), true);
    assert.equal(namesPlace({ title: "File:Old Manali.jpg", description: "" }, "Manali"), true);
    assert.equal(namesPlace({ title: "File:Manalisa.jpg", description: "" }, "Manali"), false);
  });

  test("one active job per destination; stalled jobs are detected", async () => {
    const a = await jobs.createJob({ placeId: ids.temple, userId: actor, sections: [], include: { coordinates: false, research: false, discover: false, details: false, image: false } });
    assert.ok(a.ok);
    const b = await jobs.createJob({ placeId: ids.temple, userId: actor, sections: [], include: { coordinates: false, research: false, discover: false, details: false, image: false } });
    assert.equal(b.ok, false);
    if (a.ok) {
      await db.update(s.researchRuns).set({ status: "running", heartbeatAt: new Date(Date.now() - 60 * 60_000) }).where(eq(s.researchRuns.id, a.jobId));
      const j = await jobs.getJob(a.jobId);
      assert.equal(jobs.isStalled(j!), true);
      // A stalled job's generation-level row never holds budget and isn't expired as a research run.
      await research.budgetStatus();
      assert.equal((await jobs.getJob(a.jobId))!.status, "running");
    }
  });
}
