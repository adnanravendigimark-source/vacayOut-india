import "server-only";
import { revalidatePath } from "next/cache";
import { and, eq, inArray, lt, max, ne, or, sql } from "drizzle-orm";
import { audit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { media, placeVersions, places, publishJobs, searchDocuments, sections, type SnapshotImage } from "@/lib/db/schema";
import { buildSnapshot, publishProblems, snapshotText } from "@/lib/places/publish";
import { unapprovedCitations } from "@/lib/places/review";
import { pathsToRefresh, publicLocation } from "./paths";

/**
 * The ONLY way content goes live or comes down.
 *
 * 1. One database transaction writes the published version, the place status,
 *    the search index the AI reads, a publish job and the audit entry.
 * 2. After commit, page caches are refreshed from the job. A transaction can't
 *    include cache refreshes, so a failed refresh leaves the job "failed" for
 *    the cron/admin retry instead of being lost. Directory, homepage and
 *    sitemap read the database on each request, so they are correct at commit.
 */

const MAX_ATTEMPTS = 5;
type Result = { ok: true; version?: number } | { ok: false; message: string; problems?: string[] };

async function placePaths(tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0], placeId: string) {
  const [place] = await tx.select().from(places).where(eq(places.id, placeId)).for("update").limit(1);
  if (!place) return null;
  const [parent] = place.parentId ? await tx.select().from(places).where(eq(places.id, place.parentId)).limit(1) : [];
  const [state] = place.stateId ? await tx.select().from(places).where(eq(places.id, place.stateId)).limit(1) : [];
  const stateSlug = place.kind === "state" ? place.slug : (state?.slug ?? null);
  const parentPath = parent ? (parent.kind === "state" ? `/india/${parent.slug}` : stateSlug ? `/india/${stateSlug}/${parent.slug}` : null) : null;
  return { place, parent: parent ?? null, state: state ?? null, stateSlug, parentPath };
}

export async function publishPlace(placeId: string, actorId: string): Promise<Result> {
  const db = getDb();
  const result = await db.transaction(async (tx) => {
    const ctx = await placePaths(tx, placeId);
    if (!ctx) return { ok: false as const, message: "Unknown place." };
    const { place, parent, state, stateSlug, parentPath } = ctx;
    const secs = await tx.select().from(sections).where(eq(sections.placeId, placeId));
    const [heroRow] = place.heroMediaId ? await tx.select().from(media).where(eq(media.id, place.heroMediaId)).limit(1) : [];
    const hero: SnapshotImage | null = heroRow
      ? { url: heroRow.url, alt: heroRow.alt, caption: heroRow.caption, kind: heroRow.kind, license: heroRow.license, licenseUrl: heroRow.licenseUrl, attribution: heroRow.attribution, sourceUrl: heroRow.sourceUrl }
      : null;

    const problems = [
      ...publishProblems(place, secs, { parentPublished: parent?.status === "published", isState: place.kind === "state", hero }),
      // Approved text must not rest on facts that were never approved (or were rejected later).
      ...(await unapprovedCitations(tx, placeId)),
    ];
    if (problems.length) return { ok: false as const, message: "This page isn’t ready to publish yet.", problems };

    const snapshot = buildSnapshot(place, secs, {
      state: state ? { name: state.name, slug: state.slug } : null,
      parent: parent && parent.kind !== "state" ? { name: parent.name, slug: parent.slug, kind: parent.kind } : null,
      hero,
    });
    const [{ v }] = await tx.select({ v: max(placeVersions.version) }).from(placeVersions).where(eq(placeVersions.placeId, placeId));
    const version = (v ?? 0) + 1;
    const [row] = await tx.insert(placeVersions).values({ placeId, version, snapshot, publishedBy: actorId }).returning({ id: placeVersions.id });
    await tx.update(places).set({ status: "published", publishedVersionId: row.id, updatedAt: sql`now()` }).where(eq(places.id, placeId));

    const loc = { kind: place.kind, slug: place.slug, displayMode: place.displayMode, stateSlug, parentPath };
    const doc = {
      versionId: row.id,
      path: publicLocation(loc) ?? "",
      name: place.name,
      kind: place.kind,
      stateName: place.kind === "state" ? place.name : (state?.name ?? null),
      content: snapshotText(snapshot),
      updatedAt: new Date(),
    };
    await tx.insert(searchDocuments).values({ placeId, ...doc }).onConflictDoUpdate({ target: searchDocuments.placeId, set: doc });

    const [job] = await tx.insert(publishJobs).values({ placeId, action: "publish", paths: pathsToRefresh(loc) }).returning({ id: publishJobs.id });
    await audit({ actorId, action: "place.publish", entityType: "place", entityId: placeId, details: { version } }, tx);
    return { ok: true as const, version, jobId: job.id };
  });

  if (!result.ok) return result;
  await runJob(result.jobId);
  return { ok: true, version: result.version };
}

export async function unpublishPlace(placeId: string, actorId: string, opts: { archive?: boolean } = {}): Promise<Result> {
  const db = getDb();
  const result = await db.transaction(async (tx) => {
    const ctx = await placePaths(tx, placeId);
    if (!ctx) return { ok: false as const, message: "Unknown place." };
    const { place, stateSlug, parentPath } = ctx;
    const [liveChild] = await tx
      .select({ name: places.name })
      .from(places)
      .where(and(eq(places.parentId, placeId), eq(places.status, "published"), ne(places.id, placeId)))
      .limit(1);
    if (liveChild) return { ok: false as const, message: `Unpublish places inside it first (for example “${liveChild.name}”).` };

    await tx
      .update(places)
      .set({ status: opts.archive ? "archived" : "draft", publishedVersionId: null, updatedAt: new Date() })
      .where(eq(places.id, placeId));
    await tx.delete(searchDocuments).where(eq(searchDocuments.placeId, placeId));
    const loc = { kind: place.kind, slug: place.slug, displayMode: place.displayMode, stateSlug, parentPath };
    const [job] = await tx.insert(publishJobs).values({ placeId, action: opts.archive ? "archive" : "unpublish", paths: pathsToRefresh(loc) }).returning({ id: publishJobs.id });
    await audit({ actorId, action: opts.archive ? "place.archive" : "place.unpublish", entityType: "place", entityId: placeId }, tx);
    return { ok: true as const, jobId: job.id };
  });
  if (!result.ok) return result;
  await runJob(result.jobId);
  return { ok: true };
}

/** Refreshes the cached pages listed in a job; records failure for retry. */
export async function runJob(jobId: string) {
  const db = getDb();
  const [job] = await db.select().from(publishJobs).where(eq(publishJobs.id, jobId)).limit(1);
  if (!job || job.status === "done") return;
  try {
    for (const path of job.paths) revalidatePath(path);
    await db.update(publishJobs).set({ status: "done", attempts: job.attempts + 1, lastError: null, updatedAt: new Date() }).where(eq(publishJobs.id, jobId));
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 500) : "Unknown error";
    console.error("[publish] page refresh failed", jobId, message);
    await db.update(publishJobs).set({ status: "failed", attempts: job.attempts + 1, lastError: message, updatedAt: new Date() }).where(eq(publishJobs.id, jobId));
  }
}

/** Retries pending/failed jobs (cron and the admin "Retry" button). */
export async function runPendingJobs(opts: { placeId?: string; limit?: number } = {}) {
  const db = getDb();
  const rows = await db
    .select({ id: publishJobs.id })
    .from(publishJobs)
    .where(
      and(
        inArray(publishJobs.status, ["pending", "failed"]),
        lt(publishJobs.attempts, MAX_ATTEMPTS),
        opts.placeId ? eq(publishJobs.placeId, opts.placeId) : undefined,
      ),
    )
    .limit(opts.limit ?? 50);
  for (const r of rows) await runJob(r.id);
  return rows.length;
}

export async function openJobsFor(placeId: string) {
  return getDb()
    .select({ id: publishJobs.id, action: publishJobs.action, status: publishJobs.status, attempts: publishJobs.attempts, lastError: publishJobs.lastError, createdAt: publishJobs.createdAt })
    .from(publishJobs)
    .where(and(eq(publishJobs.placeId, placeId), or(eq(publishJobs.status, "pending"), eq(publishJobs.status, "failed"))));
}
