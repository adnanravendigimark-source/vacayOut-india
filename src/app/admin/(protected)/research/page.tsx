import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { PageTitle } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/guard";
import { getDb } from "@/lib/db";
import { placeCandidates, places, researchFindings, webResearch } from "@/lib/db/schema";
import { usd } from "@/lib/research/cost";
import { listRecentRuns } from "@/lib/research/service";
import { reviewWebResearchAction } from "../chat/actions";

export const metadata = { title: "Research & Review" };

const KIND: Record<string, string> = { place_facts: "Research", discover_places: "Discovery", draft: "Writing", generate: "Generation", image: "AI illustration" };

export default async function ResearchReviewPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  await requireUser();
  const { show } = await searchParams;
  const filter = show === "all" ? null : "new";
  const db = getDb();
  const [waiting, candidates, rows, runs] = await Promise.all([
    db
      .select({
        id: places.id,
        name: places.name,
        status: places.status,
        pending: sql<number>`count(*) filter (where ${researchFindings.verification} in ('single_source','corroborated'))::int`,
        flagged: sql<number>`count(*) filter (where ${researchFindings.verification} in ('conflicting','unsupported'))::int`,
      })
      .from(researchFindings)
      .innerJoin(places, eq(places.id, researchFindings.placeId))
      .where(eq(researchFindings.status, "pending"))
      .groupBy(places.id, places.name, places.status)
      .orderBy(desc(sql`count(*)`)),
    db
      .select({ id: places.id, name: places.name, n: sql<number>`count(*)::int` })
      .from(placeCandidates)
      .innerJoin(places, eq(places.id, placeCandidates.parentId))
      .where(eq(placeCandidates.status, "pending"))
      .groupBy(places.id, places.name),
    db
      .select({ r: webResearch, placeName: places.name })
      .from(webResearch)
      .leftJoin(places, eq(places.id, webResearch.placeId))
      .where(filter ? eq(webResearch.review, filter) : undefined)
      .orderBy(desc(webResearch.hits), desc(webResearch.retrievedAt))
      .limit(100),
    listRecentRuns(40),
  ]);
  const fmt = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
  const fmtTime = (d: Date) => d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
  const missing = rows.filter((x) => !x.r.placeId);

  return (
    <div className="max-w-5xl space-y-6">
      <PageTitle title="Research & Review" />

      <section className="rounded-xl border border-line bg-white p-5">
        <h2 className="font-semibold">Facts waiting for a decision</h2>
        <p className="mt-1 text-sm text-muted">Most facts are approved together with the section that uses them. Facts whose sources disagree, or that no checked source supports, need a decision here first.</p>
        {waiting.length ? (
          <ul className="mt-3 divide-y divide-line text-sm">
            {waiting.map((w) => (
              <li key={w.id} className="flex flex-wrap items-center gap-3 py-2">
                <Link href={`/admin/places/${w.id}?tab=sources`} className="font-semibold hover:underline">{w.name}</Link>
                <span className="text-muted">{w.pending} checked{w.flagged ? <> · <span className="text-amber-900">{w.flagged} need a decision</span></> : null}</span>
                <Link href={`/admin/places/${w.id}?tab=sources`} className="ml-auto text-xs font-semibold underline">Review →</Link>
              </li>
            ))}
          </ul>
        ) : <p className="mt-2 text-sm text-muted">Nothing waiting.</p>}
      </section>

      {candidates.length ? (
        <section className="rounded-xl border border-line bg-white p-5">
          <h2 className="font-semibold">Suggested places</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {candidates.map((c) => <li key={c.id}><Link href={`/admin/places/${c.id}#discover`} className="font-semibold hover:underline">{c.name}</Link> <span className="text-muted">— {c.n} suggestion{c.n === 1 ? "" : "s"} to add or reject</span></li>)}
          </ul>
        </section>
      ) : null}

      <section id="questions" className="rounded-xl border border-line bg-white p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-semibold">What travellers asked that needed web research</h2>
          <Link href={show === "all" ? "/admin/research#questions" : "/admin/research?show=all#questions"} className="ml-auto text-sm underline">{show === "all" ? "Show new only" : "Show all"}</Link>
        </div>
        <p className="mt-1 text-sm text-muted">
          These facts were used in chat answers with an “unreviewed” label. They never change your guides. Use them to decide what to research and publish next.
          {missing.length ? ` ${missing.length} request(s) are about places that have no published guide.` : ""}
        </p>
        {rows.length ? (
          <ul className="mt-4 space-y-3">
            {rows.map(({ r, placeName }) => (
              <li key={r.id} className="rounded-lg border border-line p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{r.destination}</span>
                  <span className="text-xs text-muted">{r.topic.replace("_", " ")} · asked {r.hits}× · retrieved {fmt(r.retrievedAt)} · {usd(r.costMicroUsd)}</span>
                  {placeName && r.placeId ? (
                    <Link href={`/admin/places/${r.placeId}#research`} className="text-xs underline">Guide: {placeName}</Link>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">No guide yet</span>
                  )}
                  <span className="ml-auto flex gap-3 text-xs">
                    {r.review !== "reviewed" ? <form action={reviewWebResearchAction.bind(null, r.id, "reviewed")}><button className="font-semibold underline">Mark reviewed</button></form> : <span className="text-emerald-800">Reviewed</span>}
                    {r.review !== "dismissed" ? <form action={reviewWebResearchAction.bind(null, r.id, "dismissed")}><button className="underline">Dismiss</button></form> : null}
                  </span>
                </div>
                <details className="mt-1">
                  <summary className="cursor-pointer text-xs text-muted">{r.facts.length} fact(s)</summary>
                  <ul className="mt-1 space-y-1 text-xs">
                    {r.facts.map((f, i) => (
                      <li key={i}>
                        {f.claim}{" "}
                        {f.sources.map((s) => (
                          <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="text-muted underline">[{s.site}]</a>
                        ))}
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
          </ul>
        ) : <p className="mt-3 text-sm text-muted">Nothing here yet.</p>}
      </section>

      <details className="rounded-xl border border-line bg-white p-5">
        <summary className="cursor-pointer font-semibold">Recent AI runs and costs</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted">
              <tr><th className="py-1 pr-3">When</th><th className="pr-3">Destination</th><th className="pr-3">Type</th><th className="pr-3">Status</th><th>Cost (est.)</th></tr>
            </thead>
            <tbody>
              {runs.map(({ run, placeName }) => (
                <tr key={run.id} className="border-t border-line align-top">
                  <td className="whitespace-nowrap py-1.5 pr-3">{fmtTime(run.createdAt)}</td>
                  <td className="pr-3"><Link href={`/admin/places/${run.placeId}`} className="underline">{placeName}</Link></td>
                  <td className="pr-3">{KIND[run.kind] ?? run.kind}{run.stepKey ? <span className="text-muted"> · {run.stepKey}</span> : null}</td>
                  <td className="pr-3">{run.status}{run.error ? <span className="block text-xs text-red-800">{run.error}</span> : null}</td>
                  <td>{usd(run.costMicroUsd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
