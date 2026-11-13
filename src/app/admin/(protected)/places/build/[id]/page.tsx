import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { AutoRefresh } from "@/components/admin/research/auto-refresh";
import { ResumeBuildButton } from "@/components/admin/build-forms";
import { PageTitle } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/guard";
import { getBuild, isActive } from "@/lib/builder/jobs";
import { getDb } from "@/lib/db";
import { places } from "@/lib/db/schema";
import { usd } from "@/lib/research/cost";

export const metadata = { title: "Build progress" };

const ICON: Record<string, [string, string]> = {
  pending: ["○", "text-muted"],
  running: ["◐", "text-amber-700"],
  done: ["●", "text-emerald-700"],
  skipped: ["–", "text-muted"],
  failed: ["✕", "text-red-700"],
  waiting_budget: ["◷", "text-amber-700"],
};
const KIND: Record<string, string> = { state: "New state", more: "More destinations", destination: "New destination" };

export default async function BuildPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const j = await getBuild(id);
  if (!j) notFound();
  const active = isActive(j);
  const stalled = !active && (j.status === "running" || j.status === "queued");
  const [state] = await getDb().select({ id: places.id }).from(places).where(and(eq(places.kind, "state"), eq(places.slug, j.stateSlug))).limit(1);
  const title = j.kind === "destination" ? `${j.target}, ${j.stateName}` : j.stateName;
  const r = j.report;
  return (
    <div className="max-w-3xl space-y-5">
      <AutoRefresh active={active} everyMs={4000} />
      <Link href={state ? `/admin/places?state=${state.id}` : "/admin/places"} className="text-sm text-muted hover:underline">
        ← {state ? j.stateName : "Destinations"}
      </Link>
      <PageTitle title={title}>
        <span className="text-sm text-muted">
          {KIND[j.kind] ?? j.kind} · spent {usd(j.costMicroUsd)} of {usd(j.capMicroUsd)}
        </span>
      </PageTitle>

      <p className={`rounded-lg px-3 py-2 text-sm ${j.status === "done" ? "bg-emerald-50 text-emerald-900" : j.status === "failed" ? "bg-red-50 text-red-800" : "bg-sand text-ink"}`} role="status">
        {j.status === "done"
          ? "Finished."
          : j.status === "failed"
            ? `Stopped: ${j.error ?? "the build failed."}`
            : stalled
              ? "This build stopped responding. Resume it — finished steps aren’t repeated or paid for again."
              : "Working… you can leave this page; the build carries on."}
      </p>

      <ol className="divide-y divide-line rounded-xl border border-line bg-white">
        {j.progress.steps.map((s) => {
          const [icon, cls] = ICON[s.status] ?? ICON.pending;
          return (
            <li key={s.key} className="flex gap-3 px-4 py-2.5 text-sm">
              <span aria-hidden className={`w-4 shrink-0 text-center ${cls}`}>
                {icon}
              </span>
              <div className="min-w-0">
                <p className="font-medium">
                  {s.label} <span className="sr-only">({s.status})</span>
                </p>
                {s.detail ? <p className="text-xs text-muted">{s.detail}</p> : null}
              </div>
            </li>
          );
        })}
      </ol>

      {(j.status === "failed" || stalled) && user.role === "admin" ? <ResumeBuildButton id={j.id} /> : null}

      {r ? (
        <section className="space-y-3 rounded-xl border border-line bg-white p-5 text-sm">
          <h2 className="font-semibold">Result</h2>
          <p>
            {r.published.length} page{r.published.length === 1 ? "" : "s"}, {r.itineraries} trip plan{r.itineraries === 1 ? "" : "s"} and {r.guides} guide{r.guides === 1 ? "" : "s"} are live.
          </p>
          {r.published.length ? (
            <ul className="flex flex-wrap gap-x-4 gap-y-1">
              {r.published.map((p) => (
                <li key={p.name}>
                  {p.path ? (
                    <a href={p.path} target="_blank" rel="noreferrer" className="underline">
                      {p.name} ↗
                    </a>
                  ) : (
                    <span>{p.name} <span className="text-muted">(section on its parent page)</span></span>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
          {r.drafts.length ? (
            <div>
              <h3 className="font-semibold">Left as drafts — review in the admin</h3>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted">
                {r.drafts.map((d) => (
                  <li key={d.name}>
                    <span className="text-ink">{d.name}</span>: {d.why}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {j.progress.log.length ? (
        <details className="rounded-xl border border-line bg-white p-4 text-sm">
          <summary className="cursor-pointer font-semibold">Notes ({j.progress.log.length})</summary>
          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-muted">
            {j.progress.log.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
