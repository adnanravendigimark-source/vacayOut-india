import Link from "next/link";
import { notFound } from "next/navigation";
import { inArray, sql } from "drizzle-orm";
import { GuideEditor, GuidePublishControls } from "@/components/admin/guide-editor";
import { StatusBadge } from "@/components/admin/ui";
import { GuideArticle } from "@/components/guides/guide-article";
import { requireUser } from "@/lib/auth/guard";
import { getDb } from "@/lib/db";
import { researchFindings } from "@/lib/db/schema";
import { getGuideForAdmin } from "@/lib/guides/service";

export const metadata = { title: "Travel guide" };

export default async function GuideAdminPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const row = await getGuideForAdmin(id);
  if (!row) notFound();
  const { g } = row;
  const facts = g.findingIds.length
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
        .where(inArray(researchFindings.id, g.findingIds))
    : [];
  return (
    <div className="max-w-5xl space-y-6">
      <Link href="/admin/guides" className="text-sm text-muted hover:underline">← Travel guides</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-[1.75rem] font-medium leading-tight">{g.title}</h1>
        <StatusBadge status={g.status} />
        {g.status === "published" ? <a href={`/travel-guides/${g.slug}`} target="_blank" rel="noreferrer" className="text-sm font-semibold underline underline-offset-4">View live ↗</a> : null}
      </div>
      <p className="text-sm text-muted">Main place: {row.placeName} ({row.placeStatus}){g.locked ? " · edited by a person" : ""}</p>
      <GuidePublishControls id={g.id} published={g.status === "published"} />

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
        ) : <p className="text-sm text-muted">No cited facts.</p>}
        <p className="text-xs text-muted">Publishing approves verified facts and is blocked by conflicting or unsupported ones.</p>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Preview</h2>
        <div className="rounded-2xl border border-line bg-[#FBFAF7] p-5"><GuideArticle body={g.body} /></div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Edit</h2>
        <GuideEditor
          id={g.id}
          options={row.options}
          initial={{ slug: g.slug, title: g.title, summary: g.summary, tripTypes: g.tripTypes, seoTitle: g.seoTitle ?? "", seoDescription: g.seoDescription ?? "", bodyJson: JSON.stringify(g.body, null, 2), places: row.linked }}
        />
      </section>
    </div>
  );
}
