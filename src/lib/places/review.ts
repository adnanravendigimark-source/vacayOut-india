import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { audit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { contentSuggestions, places, researchFindings, sections, type SectionBody, type SectionSource } from "@/lib/db/schema";
import { needsDateCheck } from "@/lib/research/verify";
import { SECTION_DEFS, validateSectionBody, type SectionKey } from "./sections";

/**
 * Section review rules shared by generation, the review screen and publishing.
 *
 * - A fact is "verified" for approval when our check found at least one source
 *   that contains the quote and supports the claim, with no conflict.
 * - Approving a section approves its cited verified facts. Conflicting,
 *   unsupported or rejected cited facts block it until decided one by one.
 * - A fact has ONE status, so every section that cites it sees the same result.
 */

type Db = ReturnType<typeof getDb>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export type SectionState = "approved" | "ready" | "needs_review" | "missing";

export type FactInfo = {
  id: string;
  topic: string;
  claim: string;
  status: "pending" | "approved" | "rejected";
  verification: "unsupported" | "single_source" | "corroborated" | "conflicting";
  verified: boolean;
  dateCheck: boolean;
  usedIn: string[];
};

function isEmpty(body: SectionBody | null | undefined) {
  return !body || (!body.text?.trim() && !(body.items ?? []).length);
}

async function factInfo(db: Db | Tx, ids: string[]) {
  if (!ids.length) return new Map<string, Omit<FactInfo, "usedIn">>();
  const rows = await db
    .select({
      id: researchFindings.id,
      topic: researchFindings.topic,
      claim: researchFindings.claim,
      status: researchFindings.status,
      verification: researchFindings.verification,
      claimType: researchFindings.claimType,
      supports: sql<number>`(select count(*) from finding_evidence e where e.finding_id = "research_findings"."id" and e.support = 'supports')::int`,
      dates: sql<(string | null)[]>`(select coalesce(array_agg(e.source_date), '{}') from finding_evidence e where e.finding_id = "research_findings"."id")`,
    })
    .from(researchFindings)
    .where(inArray(researchFindings.id, ids));
  return new Map(
    rows.map((r) => [
      r.id,
      {
        id: r.id,
        topic: r.topic,
        claim: r.claim,
        status: r.status,
        verification: r.verification,
        verified: r.supports > 0 && (r.verification === "single_source" || r.verification === "corroborated"),
        dateCheck: needsDateCheck(r.claimType, r.dates ?? []),
      },
    ]),
  );
}

/** Problems that stop a fact from being approved together with its section. */
export function factProblem(f: Pick<FactInfo, "status" | "verified" | "verification" | "topic">): string | null {
  if (f.status === "approved") return null;
  if (f.status === "rejected") return `“${f.topic}” was rejected — edit or regenerate this section.`;
  if (f.verification === "conflicting") return `“${f.topic}”: sources disagree — decide on this fact first.`;
  if (!f.verified) return `“${f.topic}”: no checked source supports it — decide on this fact first.`;
  return null;
}

/** Status, reasons and cited facts for every section of a place (for the review screen). */
export async function sectionReview(placeId: string) {
  const db = getDb();
  const [secs, pendingSug] = await Promise.all([
    db.select().from(sections).where(eq(sections.placeId, placeId)),
    db.select({ key: contentSuggestions.sectionKey }).from(contentSuggestions).where(and(eq(contentSuggestions.placeId, placeId), eq(contentSuggestions.status, "pending"))),
  ]);
  const allIds = [...new Set(secs.flatMap((s) => s.findingIds))];
  const facts = await factInfo(db, allIds);
  const usedIn = new Map<string, string[]>();
  for (const s of secs) for (const id of s.findingIds) usedIn.set(id, [...(usedIn.get(id) ?? []), SECTION_DEFS.find((d) => d.key === s.key)?.label ?? s.key]);
  const hasSuggestion = new Set(pendingSug.map((p) => p.key));

  return SECTION_DEFS.map((d) => {
    const s = secs.find((x) => x.key === d.key);
    const cited: FactInfo[] = (s?.findingIds ?? []).map((id) => facts.get(id)).filter((f): f is Omit<FactInfo, "usedIn"> => Boolean(f)).map((f) => ({ ...f, usedIn: usedIn.get(f.id) ?? [] }));
    const reasons: string[] = [];
    for (const f of cited) {
      const p = factProblem(f);
      if (p) reasons.push(p);
      else if (f.dateCheck && f.status !== "approved") reasons.push(`“${f.topic}” is time-sensitive and its source is undated or over a year old — check it.`);
    }
    if (hasSuggestion.has(d.key)) reasons.push("A newer AI draft is waiting — use it or discard it.");
    let state: SectionState;
    if (!s || isEmpty(s.body)) state = "missing";
    else if (s.status === "approved" && !cited.some((f) => f.status !== "approved")) state = reasons.length ? "needs_review" : "approved";
    else state = reasons.length ? "needs_review" : "ready";
    return { key: d.key as SectionKey, label: d.label, state, reasons, cited, section: s ?? null };
  });
}

/**
 * Writes a generated section. Untouched AI drafts are replaced; anything a
 * person has edited (locked) or approved gets a suggestion instead. Runs under
 * a row lock so a manual save can't be lost in a race.
 */
export async function writeGeneratedSection(
  tx: Tx,
  input: { placeId: string; key: SectionKey; body: SectionBody; sources: SectionSource[]; findingIds: string[]; runId: string | null; notes: string | null },
): Promise<"written" | "suggested"> {
  const v = validateSectionBody(input.key, input.body);
  if (!v.ok) throw new Error(`Generated “${input.key}” is invalid: ${v.error}`);
  const [cur] = await tx.select().from(sections).where(and(eq(sections.placeId, input.placeId), eq(sections.key, input.key))).for("update").limit(1);
  if (!cur || (!cur.locked && cur.status === "draft") || isEmpty(cur.body)) {
    await tx
      .insert(sections)
      .values({ placeId: input.placeId, key: input.key, body: v.body, sources: input.sources, findingIds: input.findingIds, status: "draft", locked: false })
      .onConflictDoUpdate({
        target: [sections.placeId, sections.key],
        set: { body: v.body, sources: input.sources, findingIds: input.findingIds, status: "draft", locked: false, approvedBy: null, approvedAt: null, updatedAt: new Date() },
      });
    await tx.update(places).set({ updatedAt: new Date() }).where(eq(places.id, input.placeId));
    return "written";
  }
  await tx
    .update(contentSuggestions)
    .set({ status: "discarded", resolvedAt: new Date() })
    .where(and(eq(contentSuggestions.placeId, input.placeId), eq(contentSuggestions.sectionKey, input.key), eq(contentSuggestions.status, "pending")));
  await tx.insert(contentSuggestions).values({ placeId: input.placeId, runId: input.runId, sectionKey: input.key, body: v.body, sources: input.sources, findingIds: input.findingIds, notes: input.notes });
  return "suggested";
}

/** Approves a section and its verified cited facts, or explains what must be decided first. */
export async function approveSectionWithFacts(placeId: string, key: SectionKey, userId: string): Promise<{ ok: true; approvedFacts: number } | { ok: false; problems: string[] }> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [sec] = await tx.select().from(sections).where(and(eq(sections.placeId, placeId), eq(sections.key, key))).for("update").limit(1);
    if (!sec || isEmpty(sec.body)) return { ok: false as const, problems: ["This section is empty."] };
    const v = validateSectionBody(key, sec.body);
    if (!v.ok) return { ok: false as const, problems: [v.error] };
    if (sec.findingIds.length) {
      // Lock the cited facts so a concurrent reject/approve can't interleave.
      await tx.select({ id: researchFindings.id }).from(researchFindings).where(inArray(researchFindings.id, sec.findingIds)).for("update");
    }
    const facts = await factInfo(tx, sec.findingIds);
    const problems = [...facts.values()].map(factProblem).filter((p): p is string => Boolean(p));
    if (problems.length) return { ok: false as const, problems };
    const toApprove = [...facts.values()].filter((f) => f.status === "pending" && f.verified).map((f) => f.id);
    const label = SECTION_DEFS.find((d) => d.key === key)?.label ?? key;
    if (toApprove.length) {
      await tx
        .update(researchFindings)
        .set({ status: "approved", reviewedBy: userId, reviewedAt: new Date(), reviewNote: `Approved with the “${label}” section.` })
        .where(and(inArray(researchFindings.id, toApprove), eq(researchFindings.status, "pending")));
    }
    await tx.update(sections).set({ status: "approved", approvedBy: userId, approvedAt: new Date(), updatedAt: new Date() }).where(eq(sections.id, sec.id));
    await tx.update(places).set({ updatedAt: new Date() }).where(eq(places.id, placeId));
    await audit({ actorId: userId, action: "section.approve", entityType: "place", entityId: placeId, details: { key, factsApproved: toApprove.length } }, tx);
    return { ok: true as const, approvedFacts: toApprove.length };
  });
}

/** After a fact is rejected or reopened: every APPROVED section citing it goes back to draft. Returns the section keys. */
export async function reopenSectionsCiting(tx: Tx, findingId: string) {
  const rows = await tx
    .update(sections)
    .set({ status: "draft", approvedBy: null, approvedAt: null, updatedAt: new Date() })
    .where(and(sql`${sections.findingIds} ? ${findingId}`, eq(sections.status, "approved")))
    .returning({ key: sections.key, placeId: sections.placeId });
  return rows;
}

/** For publishing: approved sections whose cited facts aren't all approved. */
export async function unapprovedCitations(tx: Tx | Db, placeId: string): Promise<string[]> {
  const rows = await tx.execute(sql`
    select s.key, count(*)::int as n
    from sections s
    cross join lateral jsonb_array_elements_text(s.finding_ids) as fid(id)
    join research_findings f on f.id = fid.id::uuid
    where s.place_id = ${placeId} and s.status = 'approved' and f.status <> 'approved'
    group by s.key`);
  return (rows.rows as { key: string; n: number }[]).map((r) => `“${SECTION_DEFS.find((d) => d.key === r.key)?.label ?? r.key}” uses ${r.n} fact(s) that aren’t approved — review the section again.`);
}

