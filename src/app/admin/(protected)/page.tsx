import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { DestinationThumb } from "@/components/admin/destination-thumb";
import { PageTitle, StatusBadge } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/guard";
import { getDb } from "@/lib/db";
import { places, researchRuns } from "@/lib/db/schema";
import { isStalled } from "@/lib/generate/jobs";
import { dashboardCounts, listDestinations } from "@/lib/places/repo";

export const metadata = { title: "Overview" };

const when = (d: Date) => d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

export default async function Overview({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireUser();
  const { error } = await searchParams;
  const [counts, recent, jobs] = await Promise.all([
    dashboardCounts(),
    listDestinations({}),
    getDb()
      .select({ id: researchRuns.id, placeId: researchRuns.placeId, status: researchRuns.status, heartbeatAt: researchRuns.heartbeatAt, createdAt: researchRuns.createdAt, progress: researchRuns.progress, name: places.name })
      .from(researchRuns)
      .innerJoin(places, eq(places.id, researchRuns.placeId))
      .where(inArray(researchRuns.status, ["queued", "running"]))
      .orderBy(desc(researchRuns.createdAt))
      .limit(10),
  ]);
  const generating = jobs.filter((j) => j.progress);
  const tiles = [
    { label: "Published", value: counts.published, href: "/admin/places?status=published" },
    { label: "Drafts", value: counts.drafts, href: "/admin/places?status=draft" },
    { label: "Need review", value: counts.needsReview, href: "/admin/research" },
  ];
  return (
    <div className="max-w-5xl space-y-8">
      <PageTitle title="Overview">
        <a href="/india" target="_blank" rel="noreferrer" className="text-sm font-semibold underline underline-offset-4">View public directory ↗</a>
      </PageTitle>
      {error === "forbidden" ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">That needs an admin account.</p> : null}

      <section className="flex flex-col gap-5 rounded-2xl border border-line bg-white p-6 sm:flex-row sm:items-center">
        <div className="flex-1">
          <h2 className="font-serif text-xl font-medium">Create a destination</h2>
          <p className="mt-1 text-sm text-muted">Pick a state and a place. AI researches it, writes every section with sources, finds a photo and prepares SEO — you review and publish.</p>
        </div>
        <Link href="/admin/places/new" className="inline-flex h-11 items-center justify-center rounded-lg bg-coral px-5 font-semibold text-white hover:bg-coral-hover">+ Create destination</Link>
      </section>

      <section className="grid grid-cols-3 gap-3">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className="rounded-xl border border-line bg-white px-4 py-3 hover:border-ink">
            <p className="text-2xl font-semibold">{t.value}</p>
            <p className="text-sm text-muted">{t.label}</p>
          </Link>
        ))}
      </section>

      {generating.length ? (
        <section>
          <h2 className="font-semibold">Generating now</h2>
          <ul className="mt-2 space-y-2">
            {generating.map((j) => {
              const steps = j.progress?.steps ?? [];
              const doneN = steps.filter((s) => s.status === "done" || s.status === "skipped").length;
              const stalled = isStalled(j);
              return (
                <li key={j.id}>
                  <Link href={`/admin/places/${j.placeId}/generate`} className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 text-sm hover:border-ink">
                    <span className="font-semibold">{j.name}</span>
                    <span className="text-muted">{stalled ? "Stalled — open to resume" : `${doneN} of ${steps.length} steps`}</span>
                    <span className="ml-auto h-1.5 w-32 overflow-hidden rounded-full bg-sand"><span className="block h-full bg-coral" style={{ width: `${steps.length ? (doneN / steps.length) * 100 : 0}%` }} /></span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Recently updated</h2>
          <Link href="/admin/places" className="text-sm underline underline-offset-4">All destinations</Link>
        </div>
        {recent.length ? (
          <ul className="mt-2 divide-y divide-line rounded-xl border border-line bg-white">
            {recent.slice(0, 8).map((d) => (
              <li key={d.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <DestinationThumb url={d.heroUrl} kind={d.heroKind} name={d.name} />
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/places/${d.id}`} className="font-semibold hover:underline">{d.name}</Link>
                  <p className="truncate text-xs text-muted">{d.kind === "state" ? "State" : d.stateName}</p>
                </div>
                <StatusBadge status={d.status} />
                <span className="hidden w-28 text-right text-xs text-muted sm:block">{when(d.updatedAt)}</span>
                {d.publicUrl ? <a href={d.publicUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold underline">View ↗</a> : <Link href={`/admin/places/${d.id}`} className="text-xs font-semibold underline">Continue</Link>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">No destinations yet — create your first one above.</p>
        )}
      </section>
    </div>
  );
}
