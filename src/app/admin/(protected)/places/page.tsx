import Link from "next/link";
import { DestinationThumb } from "@/components/admin/destination-thumb";
import { PageTitle, StatusBadge, inputClass } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/guard";
import { listDestinations, listStateOptions } from "@/lib/places/repo";
import { RowActions } from "@/components/admin/row-actions";

export const metadata = { title: "Destinations" };

const when = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const STATUSES = [
  ["", "All statuses"],
  ["draft", "Draft"],
  ["in_review", "In review"],
  ["published", "Published"],
  ["archived", "Archived"],
] as const;

export default async function DestinationsPage({ searchParams }: { searchParams: Promise<{ q?: string; state?: string; status?: string; error?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const [rows, states] = await Promise.all([listDestinations(sp), listStateOptions()]);
  const isAdmin = user.role === "admin";
  return (
    <div className="max-w-6xl space-y-5">
      <PageTitle title="Destinations">
        <a href="/india" target="_blank" rel="noreferrer" className="text-sm font-semibold underline underline-offset-4">Public directory ↗</a>
        <Link href="/admin/places/new" className="inline-flex h-9 items-center rounded-lg bg-coral px-4 text-sm font-semibold text-white hover:bg-coral-hover">+ Create destination</Link>
      </PageTitle>

      <form className="flex flex-wrap gap-2" role="search">
        <input name="q" defaultValue={sp.q ?? ""} placeholder="Search by name" aria-label="Search destinations" className={`${inputClass} mt-0 w-56`} />
        <select name="state" defaultValue={sp.state ?? ""} aria-label="Filter by state" className={`${inputClass} mt-0 w-52`}>
          <option value="">All states</option>
          {states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select name="status" defaultValue={sp.status ?? ""} aria-label="Filter by status" className={`${inputClass} mt-0 w-40`}>
          {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button type="submit" className="h-10 rounded-lg border border-line bg-white px-4 text-sm font-semibold hover:border-ink">Filter</button>
        {sp.q || sp.state || sp.status ? <Link href="/admin/places" className="self-center text-sm underline">Clear</Link> : null}
      </form>

      {rows.length ? (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Destination</th>
                <th className="px-3 font-semibold">State</th>
                <th className="px-3 font-semibold">Status</th>
                <th className="px-3 font-semibold">Updated</th>
                <th className="px-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((d) => (
                <tr key={d.id} className="align-middle">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <DestinationThumb url={d.heroUrl} kind={d.heroKind} name={d.name} />
                      <div className="min-w-0">
                        <Link href={`/admin/places/${d.id}`} className="font-semibold hover:underline">{d.name}</Link>
                        <p className="text-xs text-muted">{d.kind}{d.parentName && d.parentKind !== "state" ? ` in ${d.parentName}` : ""}{d.pending ? ` · ${d.pending} fact${d.pending === 1 ? "" : "s"} to review` : ""}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 text-muted">{d.stateName ?? "—"}</td>
                  <td className="px-3"><StatusBadge status={d.status} /></td>
                  <td className="whitespace-nowrap px-3 text-muted">{when(d.updatedAt)}</td>
                  <td className="px-4">
                    <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs font-semibold">
                      {d.publicUrl ? <a href={d.publicUrl} target="_blank" rel="noreferrer" className="underline">View ↗</a> : null}
                      <Link href={`/admin/places/${d.id}`} className="underline">Edit</Link>
                      <Link href={`/admin/places/${d.id}/preview`} className="underline">Preview</Link>
                      {isAdmin ? <RowActions id={d.id} status={d.status} /> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-line p-8 text-center text-muted">{sp.q || sp.state || sp.status ? "Nothing matches these filters." : "No destinations yet."}</p>
      )}
      {sp.error ? <p className="text-sm text-red-800">{sp.error}</p> : null}
    </div>
  );
}
