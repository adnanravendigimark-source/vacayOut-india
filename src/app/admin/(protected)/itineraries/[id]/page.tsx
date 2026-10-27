import Link from "next/link";
import { notFound } from "next/navigation";
import { inArray, sql } from "drizzle-orm";
import { ItineraryEditor, ItineraryPublishControls } from "@/components/admin/itinerary-editor";
import { StatusBadge } from "@/components/admin/ui";
import { ItineraryPlanView } from "@/components/itineraries/itinerary-plan";
import { requireUser } from "@/lib/auth/guard";
import { getDb } from "@/lib/db";
import { researchFindings } from "@/lib/db/schema";
import { getItineraryForAdmin } from "@/lib/itineraries/service";

export const metadata = { title: "Itinerary" };

export default async function ItineraryAdminPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const row = await getItineraryForAdmin(id);
  if (!row) notFound();
  const { it } = row;
  const facts = it.findingIds.length
    ? await getDb()
        .select({
          id: researchFindings.id,
          topic: researchFindings.topic,
          claim: researchFindings.claim,
          status: researchFindings.status,
          verification: researchFindings.verification,
          supports: sql<number>`(select count(*) from finding_evidence e where e.finding_id = "research_findings"."id" and e.support = 'supports')::int`,
        })
        .from(researchFindings)
        .where(inArray(researchFindings.id, it.findingIds))
    : [];
  return (
    <div className="max-w-5xl space-y-6">
      <Link href="/admin/itineraries" className="text-sm text-muted hover:underline">← Itineraries</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-[1.75rem] font-medium leading-tight">{it.title}</h1>
        <StatusBadge status={it.status} />
        {it.status === "published" ? <a href={`/itineraries/${it.slug}`} target="_blank" rel="noreferrer" className="text-sm font-semibold underline underline-offset-4">View live ↗</a> : null}
      </div>
      <p className="text-sm text-muted">{row.placeName} ({row.placeStatus}) · {it.durationDays} days{it.locked ? " · edited by a person" : ""}</p>
      <ItineraryPublishControls id={it.id} published={it.status === "published"} />

      <section className="space-y-2">
        <h2 className="font-semibold">Cited facts ({facts.length})</h2>
        {facts.length ? (
          <ul className="divide-y divide-line rounded-xl border border-line bg-white text-sm">
            {facts.map((f) => (
              <li key={f.id} className="px-4 py-2.5">
                <p className="font-medium">{f.topic} <span className="text-xs text-muted">· {f.status} · {f.verification} · {f.supports} supporting source(s)</span></p>
                <p className="text-muted">{f.claim}</p>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted">No cited facts — the plan uses only general advice and estimates.</p>}
        <p className="text-xs text-muted">Review facts one by one in <Link href="/admin/research" className="underline">Research & Review</Link>. Publishing approves verified facts and is blocked by conflicting or unsupported ones.</p>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Preview</h2>
        <div className="rounded-2xl border border-line bg-[#FBFAF7] p-5"><ItineraryPlanView plan={it.plan} preview /></div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Edit</h2>
        <ItineraryEditor
          id={it.id}
          initial={{ slug: it.slug, title: it.title, summary: it.summary, durationDays: it.durationDays, tripTypes: it.tripTypes, seoTitle: it.seoTitle ?? "", seoDescription: it.seoDescription ?? "", planJson: JSON.stringify(it.plan, null, 2) }}
        />
      </section>
    </div>
  );
}
