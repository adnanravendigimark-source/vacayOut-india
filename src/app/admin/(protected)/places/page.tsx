import Link from "next/link";
import { DestinationThumb } from "@/components/admin/destination-thumb";
import { AddDestinationForms } from "@/components/admin/build-forms";
import { PageTitle, StatusBadge, inputClass } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/guard";
import { isActive, recentBuilds } from "@/lib/builder/jobs";
import { stateOverview } from "@/lib/builder/overview";
import { listDestinations, listStateOptions } from "@/lib/places/repo";
import { RowActions } from "@/components/admin/row-actions";
import { usd } from "@/lib/research/cost";
import { slugify } from "@/lib/places/slug";

export const metadata = { title: "Destinations" };

const when = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const STATUSES = [
  ["", "All statuses"],
  ["draft", "Draft"],
  ["in_review", "In review"],
  ["published", "Published"],
  ["archived", "Archived"],
] as const;
const BUILD_LABEL: Record<string, string> = { queued: "Starting", running: "Building", done: "Done", failed: "Stopped" };

type Build = Awaited<ReturnType<typeof recentBuilds>>[number];

function Builds({ rows, title }: { rows: Build[]; title: string }) {
  if (!rows.length) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
      <ul className="divide-y divide-line rounded-xl border border-line bg-white text-sm">
        {rows.map((b) => {
          const running = isActive(b);
          const label = running ? BUILD_LABEL[b.status] : b.status === "running" || b.status === "queued" ? "Stalled" : BUILD_LABEL[b.status];
          return (
            <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
              <Link href={`/admin/places/build/${b.id}`} className="font-semibold hover:underline">
                {b.kind === "destination" ? `${b.target}, ${b.stateName}` : b.kind === "more" ? `More destinations · ${b.stateName}` : b.stateName}
              </Link>
              <span className="text-xs text-muted">
                <span className={running ? "font-semibold text-amber-800" : b.status === "failed" || label === "Stalled" ? "font-semibold text-red-800" : ""}>{label}</span> · {usd(b.costMicroUsd)} · {when(b.createdAt)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default async function DestinationsPage({ searchParams }: { searchParams: Promise<{ q?: string; state?: string; status?: string; error?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const isAdmin = user.role === "admin";
  const filtered = Boolean(sp.q || sp.state || sp.status);

  // No filter: the states view.
  if (!filtered) {
    const [states, builds] = await Promise.all([stateOverview(), recentBuilds(6)]);
    return (
      <div className="max-w-6xl space-y-6">
        <PageTitle title="Destinations">
          <a href="/india" target="_blank" rel="noreferrer" className="text-sm font-semibold underline underline-offset-4">
            Public directory ↗
          </a>
          {isAdmin ? (
            <Link href="/admin/places/build" className="inline-flex h-9 items-center rounded-lg bg-coral px-4 text-sm font-semibold text-white hover:bg-coral-hover">
              + Create destination
            </Link>
          ) : null}
        </PageTitle>
        <form className="flex flex-wrap gap-2" role="search">
          <input name="q" placeholder="Search all destinations" aria-label="Search destinations" className={`${inputClass} mt-0 w-64`} />
          <button type="submit" className="h-10 rounded-lg border border-line bg-white px-4 text-sm font-semibold hover:border-ink">
            Search
          </button>
        </form>
        <Builds rows={builds} title="Recent builds" />
        {states.length ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {states.map((s) => (
              <li key={s.id}>
                <Link href={`/admin/places?state=${s.id}`} className="flex items-center gap-3 rounded-xl border border-line bg-white p-3 hover:border-ink">
                  <DestinationThumb url={s.heroUrl} kind={s.heroKind} name={s.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{s.name}</span>
                    <span className="block text-xs text-muted">
                      {s.total} place{s.total === 1 ? "" : "s"} · {s.published} live{s.drafts ? ` · ${s.drafts} draft${s.drafts === 1 ? "" : "s"}` : ""}
                    </span>
                  </span>
                  <StatusBadge status={s.status} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-line p-8 text-center text-muted">No states yet. Use “Create destination” to build the first one.</p>
        )}
      </div>
    );
  }

  const [rows, states] = await Promise.all([listDestinations(sp), listStateOptions()]);
  const current = sp.state ? states.find((s) => s.id === sp.state) : undefined;
  const stateSlug = current ? slugify(current.name) : null;
  const builds = stateSlug ? await recentBuilds(5, stateSlug) : [];
  return (
    <div className="max-w-6xl space-y-5">
      <Link href="/admin/places" className="text-sm text-muted hover:underline">
        ← All states
      </Link>
      <PageTitle title={current ? current.name : "Destinations"}>
        <a href={stateSlug ? `/india/${stateSlug}` : "/india"} target="_blank" rel="noreferrer" className="text-sm font-semibold underline underline-offset-4">
          Public page ↗
        </a>
        <Link href={current ? `/admin/places/new?state=${encodeURIComponent(current.name)}` : "/admin/places/new"} className="inline-flex h-9 items-center rounded-lg border border-line bg-white px-4 text-sm font-semibold hover:border-ink">
          Create manually
        </Link>
      </PageTitle>

      {current && isAdmin ? <AddDestinationForms stateName={current.name} /> : null}
      <Builds rows={builds} title="Builds for this state" />

      <form className="flex flex-wrap gap-2" role="search">
        <input name="q" defaultValue={sp.q ?? ""} placeholder="Search by name" aria-label="Search destinations" className={`${inputClass} mt-0 w-56`} />
        <select name="state" defaultValue={sp.state ?? ""} aria-label="Filter by state" className={`${inputClass} mt-0 w-52`}>
          <option value="">All states</option>
          {states.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={sp.status ?? ""} aria-label="Filter by status" className={`${inputClass} mt-0 w-40`}>
          {STATUSES.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <button type="submit" className="h-10 rounded-lg border border-line bg-white px-4 text-sm font-semibold hover:border-ink">
          Filter
        </button>
        <Link href="/admin/places" className="self-center text-sm underline">
          Clear
        </Link>
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
                        <Link href={`/admin/places/${d.id}`} className="font-semibold hover:underline">
                          {d.name}
                        </Link>
                        <p className="text-xs text-muted">
                          {d.kind}
                          {d.parentName && d.parentKind !== "state" ? ` in ${d.parentName}` : ""}
                          {d.pending ? ` · ${d.pending} fact${d.pending === 1 ? "" : "s"} to review` : ""}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 text-muted">{d.stateName ?? "—"}</td>
                  <td className="px-3">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="whitespace-nowrap px-3 text-muted">{when(d.updatedAt)}</td>
                  <td className="px-4">
                    <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs font-semibold">
                      {d.publicUrl ? (
                        <a href={d.publicUrl} target="_blank" rel="noreferrer" className="underline">
                          View ↗
                        </a>
                      ) : null}
                      <Link href={`/admin/places/${d.id}`} className="underline">
                        Edit
                      </Link>
                      <Link href={`/admin/places/${d.id}/preview`} className="underline">
                        Preview
                      </Link>
                      {isAdmin ? <RowActions id={d.id} status={d.status} /> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-line p-8 text-center text-muted">Nothing matches these filters.</p>
      )}
      {sp.error ? <p className="text-sm text-red-800">{sp.error}</p> : null}
    </div>
  );
}
