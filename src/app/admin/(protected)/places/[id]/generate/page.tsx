import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { AutoRefresh } from "@/components/admin/research/auto-refresh";
import { PageTitle } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/guard";
import { getDb } from "@/lib/db";
import { places } from "@/lib/db/schema";
import { isStalled, latestJobForPlace } from "@/lib/generate/jobs";
import { resumeGenerationAction } from "../../actions";

export const metadata = { title: "Generating" };

const ICON: Record<string, string> = { done: "✓", skipped: "–", running: "…", pending: "○", failed: "✕", waiting_budget: "⏸" };
const TONE: Record<string, string> = { done: "text-emerald-700", skipped: "text-muted", running: "text-coral", pending: "text-muted", failed: "text-red-700", waiting_budget: "text-amber-700" };

export default async function GeneratePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  await requireUser();
  const [place] = await getDb().select({ id: places.id, name: places.name }).from(places).where(eq(places.id, id)).limit(1);
  if (!place) notFound();
  const job = await latestJobForPlace(id);
  if (!job) {
    return (
      <div className="max-w-xl space-y-4">
        <PageTitle title={place.name} />
        <p className="text-muted">Nothing is being generated for this destination.</p>
        <Link href={`/admin/places/${id}`} className="font-semibold underline">Open the destination</Link>
      </div>
    );
  }
  const steps = job.progress?.steps ?? [];
  const done = steps.filter((s) => s.status === "done" || s.status === "skipped").length;
  const stalled = isStalled(job);
  const active = (job.status === "running" || job.status === "queued") && !stalled;
  const minutes = Math.max(0, Math.round(((job.finishedAt ?? new Date()).getTime() - (job.startedAt ?? job.createdAt).getTime()) / 60000));

  return (
    <div className="max-w-xl space-y-6">
      <AutoRefresh active={active} everyMs={4000} />
      <Link href="/admin/places" className="text-sm text-muted hover:underline">← Destinations</Link>
      <PageTitle title={`Generating ${place.name}`} />
      <div>
        <div className="h-2 overflow-hidden rounded-full bg-sand"><div className="h-full bg-coral transition-all" style={{ width: `${steps.length ? (done / steps.length) * 100 : 0}%` }} /></div>
        <p className="mt-2 text-sm text-muted">
          {job.status === "done" ? `Finished in about ${minutes || 1} minute${minutes === 1 ? "" : "s"}.` : job.status === "failed" ? "Stopped." : stalled ? "This run stopped responding." : `Working… ${minutes ? `${minutes} min so far. ` : ""}You can close this page — it keeps going on the server.`}
        </p>
      </div>

      <ol className="space-y-2 rounded-xl border border-line bg-white p-5">
        {steps.map((s) => (
          <li key={s.key} className="flex gap-3 text-sm">
            <span aria-hidden className={`w-4 shrink-0 text-center font-bold ${TONE[s.status]}`}>{ICON[s.status]}</span>
            <span className="min-w-0">
              <span className={s.status === "running" ? "font-semibold" : ""}>{s.label}</span>
              <span className="sr-only"> — {s.status.replace("_", " ")}</span>
              {s.detail ? <span className="block text-xs text-muted">{s.detail}</span> : null}
            </span>
          </li>
        ))}
      </ol>

      {job.status === "failed" ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{job.error ?? "Generation stopped."} Finished steps are kept; resuming won’t pay for them again.</p> : null}
      <div className="flex flex-wrap gap-3">
        {stalled || job.status === "failed" ? (
          <form action={resumeGenerationAction.bind(null, id, job.id)}>
            <button type="submit" className="inline-flex h-10 items-center rounded-lg bg-ink px-4 text-sm font-semibold text-white">Resume</button>
          </form>
        ) : null}
        <Link href={`/admin/places/${id}`} className={`inline-flex h-10 items-center rounded-lg px-4 text-sm font-semibold ${job.status === "done" ? "bg-coral text-white hover:bg-coral-hover" : "border border-line bg-white hover:border-ink"}`}>
          {job.status === "done" ? "Review and publish →" : "Open what’s ready so far"}
        </Link>
      </div>
    </div>
  );
}
