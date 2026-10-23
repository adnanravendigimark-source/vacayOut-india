import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { DetailsForm } from "@/components/admin/details-form";
import { MediaPanel } from "@/components/admin/media-panel";
import { RelationsPanel } from "@/components/admin/relations-panel";
import { SectionEditor } from "@/components/admin/section-editor";
import { DiscoverPanel, ResearchPanel } from "@/components/admin/research/research-panel";
import { SuggestionCard, type SuggestionView } from "@/components/admin/research/drafting";
import { AiIllustrationButton } from "@/components/admin/review/ai-illustration";
import { ApproveButton } from "@/components/admin/review/approve-button";
import { BottomBar } from "@/components/admin/review/bottom-bar";
import { StatePill, StatusBadge } from "@/components/admin/ui";
import { PlacePage } from "@/components/place/place-page";
import { requireUser } from "@/lib/auth/guard";
import type { SectionBody } from "@/lib/db/schema";
import { isStalled, latestJobForPlace } from "@/lib/generate/jobs";
import { getAdminExtras } from "@/lib/places/repo";
import { previewData } from "@/lib/places/preview";
import { sectionReview } from "@/lib/places/review";
import { SECTION_DEFS } from "@/lib/places/sections";
import { openJobsFor } from "@/lib/publish/service";
import { appliedSuggestionCounts, listSuggestions } from "@/lib/research/service";
import { retryJobsAction } from "../actions";

/** Manual research/discovery runs continue after the click (next/server `after`), so allow long server time. */
export const maxDuration = 300;

const TABS = [
  ["content", "Content"],
  ["sources", "Sources"],
  ["seo", "SEO & details"],
  ["images", "Images"],
  ["preview", "Preview"],
] as const;
type Tab = (typeof TABS)[number][0];

const fmtWhen = (d: Date) => d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });

/** The one-screen review workspace: content and research on the left, the live page preview on the right. */
export default async function ReviewWorkspace({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const user = await requireUser();
  const requested = (await searchParams).tab;
  const tab: Tab = (TABS.find(([k]) => k === requested)?.[0] ?? "content") as Tab;
  const preview = await previewData(id, { includeDrafts: true });
  if (!preview) notFound();
  const { place, versions, parent, state, children } = preview.data;
  const [review, suggestions, applied, job, extras, refreshJobs] = await Promise.all([
    sectionReview(place.id),
    listSuggestions(place.id),
    appliedSuggestionCounts(place.id),
    latestJobForPlace(place.id),
    getAdminExtras(place.id, place.stateId, place.kind === "state"),
    openJobsFor(place.id),
  ]);
  const suggestionFor = (target: string): SuggestionView | null => {
    const sg = suggestions.find((x) => (x.sectionKey ?? "details") === target);
    if (!sg) return null;
    const shape = target === "details" ? "details" : (SECTION_DEFS.find((d) => d.key === target)?.shape ?? "text");
    return { id: sg.id, shape, body: sg.body as SectionBody, sources: sg.sources, notes: sg.notes, createdAt: fmtWhen(sg.createdAt) };
  };
  const counts = { approved: 0, ready: 0, needs_review: 0, missing: 0 };
  for (const r of review) counts[r.state]++;
  const jobActive = job && (job.status === "running" || job.status === "queued");
  const heroIsPhoto = extras.images.some((m) => m.id === place.heroMediaId && m.kind === "photo");
  const live = place.status === "published" ? (place.displayMode === "parent_section" && parent ? `${parent.kind === "state" ? `/india/${parent.slug}` : `/india/${state?.slug}/${parent.slug}`}#${place.slug}` : place.kind === "state" ? `/india/${place.slug}` : `/india/${state?.slug}/${place.slug}`) : null;
  const changedSincePublish = versions[0] && place.updatedAt > versions[0].publishedAt;
  const hierarchy = ["India", ...(state && place.kind !== "state" ? [state.name] : []), ...(parent && parent.kind !== "state" ? [parent.name] : []), place.name];
  const tabHref = (k: string) => `/admin/places/${place.id}?tab=${k}`;

  const previewPane = (
    <div className="overflow-hidden rounded-2xl border border-line bg-canvas">
      <p className="border-b border-line bg-white px-4 py-2 text-xs text-muted">Live preview using the public template · includes draft sections · <Link href={`/admin/places/${place.id}/preview`} className="underline">see only what would publish</Link></p>
      <div className="origin-top">
        <PlacePage snapshot={preview.snapshot} items={preview.children} inline={preview.inline} related={preview.related} stateSlug={preview.stateSlug} tripTypes={preview.tripTypes} preview />
      </div>
    </div>
  );

  return (
    <div className="max-w-[96rem]">
      <Link href="/admin/places" className="text-sm text-muted hover:underline">← Destinations</Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-[1.75rem] font-medium leading-tight">{place.name}</h1>
        <StatusBadge status={place.status} />
        {live ? <a href={live} target="_blank" rel="noreferrer" className="text-sm font-semibold underline underline-offset-4">View public page ↗</a> : null}
      </div>
      <p className="mt-1 text-sm text-muted">{hierarchy.join(" › ")} · {place.kind}</p>
      <p className="mt-2 flex flex-wrap gap-2 text-xs">
        {counts.approved ? <span><StatePill state="approved" /> {counts.approved}</span> : null}
        {counts.ready ? <span><StatePill state="ready" /> {counts.ready}</span> : null}
        {counts.needs_review ? <span><StatePill state="needs_review" /> {counts.needs_review}</span> : null}
        {counts.missing ? <span><StatePill state="missing" /> {counts.missing}</span> : null}
      </p>
      {jobActive ? (
        <Link href={`/admin/places/${place.id}/generate`} className="mt-3 block rounded-lg bg-sky-50 px-4 py-2 text-sm text-sky-900">
          {isStalled(job) ? "Generation stalled — open to resume →" : "AI is still generating this destination — see progress →"}
        </Link>
      ) : null}
      {changedSincePublish && place.status === "published" ? <p className="mt-3 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-900">Edited since the last publish — publish again to update the live page.</p> : null}

      <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
        <div className="min-w-0">
          <nav aria-label="Review" className="flex gap-1 overflow-x-auto border-b border-line">
            {TABS.map(([k, label]) => (
              <Link key={k} href={tabHref(k)} aria-current={tab === k ? "page" : undefined} className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold ${tab === k ? "border-coral text-ink" : "border-transparent text-muted hover:text-ink"} ${k === "preview" ? "xl:hidden" : ""}`}>
                {label}
              </Link>
            ))}
          </nav>

          <div className="mt-5 space-y-4">
            {tab === "content" ? (
              <>
                <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                  <span>Tick sections, then use <strong>Regenerate selected</strong> below. Text you have edited is never overwritten — you get a suggestion instead.</span>
                  <label className="flex items-center gap-1.5 font-semibold text-ink"><input type="checkbox" name="scope" value="all" form="regen-form" /> Research again and regenerate everything</label>
                </p>
                {review.map((r) => {
                  const sg = suggestionFor(r.key);
                  const def = SECTION_DEFS.find((d) => d.key === r.key)!;
                  return (
                    <article key={r.key} id={`card-${r.key}`} className="rounded-xl border border-line bg-white p-4">
                      <header className="flex flex-wrap items-center gap-3">
                        <input type="checkbox" name="sections" value={r.key} form="regen-form" aria-label={`Select ${r.label} to regenerate`} />
                        <h2 className="font-semibold">{r.label}</h2>
                        <StatePill state={r.state} />
                        {r.state !== "approved" && r.state !== "missing" ? <span className="ml-auto"><ApproveButton placeId={place.id} sectionKey={r.key} disabled={r.state === "needs_review" && r.reasons.some((x) => !/time-sensitive/.test(x))} /></span> : null}
                      </header>
                      {r.reasons.length ? (
                        <ul className="mt-2 list-disc space-y-0.5 pl-9 text-xs text-amber-900">{r.reasons.map((x) => <li key={x}>{x}</li>)}</ul>
                      ) : null}
                      {r.state === "missing" ? <p className="mt-2 pl-7 text-xs text-muted">No checked facts for this yet. Research again, write it yourself below, or leave it out — empty sections don’t appear on the page.</p> : null}
                      {r.cited.length ? (
                        <details className="mt-2 pl-7 text-xs">
                          <summary className="cursor-pointer text-muted">Based on {r.cited.length} fact{r.cited.length === 1 ? "" : "s"}</summary>
                          <ul className="mt-1 space-y-1">
                            {r.cited.map((f) => (
                              <li key={f.id}>
                                <span className={f.status === "approved" ? "text-emerald-800" : f.status === "rejected" ? "text-red-800 line-through" : f.verified ? "text-ink" : "text-amber-900"}>{f.claim}</span>{" "}
                                <span className="text-muted">— {f.status === "approved" ? "approved" : f.status === "rejected" ? "rejected" : f.verification.replace("_", " ")}{f.usedIn.length > 1 ? ` · also used in ${f.usedIn.filter((u) => u !== r.label).join(", ")}` : ""}</span>
                              </li>
                            ))}
                          </ul>
                          <Link href={tabHref("sources")} className="mt-1 inline-block font-semibold underline">Decide on facts in Sources →</Link>
                        </details>
                      ) : null}
                      {sg ? <div className="mt-3"><SuggestionCard s={sg} replaces={r.section ? "Replaces the current text and sets the section back to draft." : "Fills this section as a draft."} /></div> : null}
                      <details className="mt-3" open={r.state === "missing" ? false : undefined}>
                        <summary className="cursor-pointer text-sm font-semibold">Edit text</summary>
                        <div className="mt-2">
                          <SectionEditor key={`${r.key}-${applied[r.key] ?? 0}-${r.section?.updatedAt?.getTime() ?? 0}`} placeId={place.id} sectionKey={r.key} label={def.label} help={def.help} shape={def.shape} required={def.required} body={r.section?.body ?? null} status={r.section?.status ?? null} sources={r.section?.sources ?? []} />
                        </div>
                      </details>
                    </article>
                  );
                })}

                {["state", "region", "city", "town"].includes(place.kind) ? (
                  <section className="rounded-xl border border-line bg-white p-4">
                    <div className="flex items-center justify-between">
                      <h2 className="font-semibold">Places inside {place.name}</h2>
                      <Link href={`/admin/places/new?state=${encodeURIComponent(place.kind === "state" ? place.name : (state?.name ?? ""))}`} className="text-sm font-semibold underline">+ Add a place</Link>
                    </div>
                    {children.length ? (
                      <ul className="mt-2 divide-y divide-line text-sm">
                        {children.map((c) => (
                          <li key={c.id} className="flex items-center gap-2 py-1.5"><Link href={`/admin/places/${c.id}`} className="hover:underline">{c.name}</Link><span className="ml-auto"><StatusBadge status={c.status} /></span></li>
                        ))}
                      </ul>
                    ) : <p className="mt-2 text-sm text-muted">None yet.</p>}
                  </section>
                ) : null}
                {["state", "region", "city", "town"].includes(place.kind) ? <DiscoverPanel placeId={place.id} /> : null}
              </>
            ) : null}

            {tab === "sources" ? <ResearchPanel placeId={place.id} canReview={user.role === "admin"} /> : null}

            {tab === "seo" ? (
              <>
                <section className="rounded-xl border border-line bg-white p-5">
                  <h2 className="font-semibold">SEO & details</h2>
                  {suggestionFor("details") ? <div className="mt-3"><SuggestionCard s={suggestionFor("details")!} replaces="Fills in the summary, SEO title and meta description." /></div> : null}
                  <div className="mt-4"><DetailsForm key={`details-${applied.details ?? 0}-${place.updatedAt.getTime()}`} place={place} /></div>
                </section>
                <RelationsPanel placeId={place.id} relations={extras.relations} options={extras.relationOptions} />
                <section className="rounded-xl border border-line bg-white p-5 text-sm">
                  <h2 className="font-semibold">History</h2>
                  {versions.length ? (
                    <ul className="mt-2 space-y-1 text-muted">{versions.map((v) => <li key={v.id}>Version {v.version} · {fmtWhen(v.publishedAt)}{v.by ? ` · ${v.by}` : ""}</li>)}</ul>
                  ) : <p className="mt-2 text-muted">Never published.</p>}
                  {refreshJobs.length ? (
                    <div className="mt-3 rounded-lg bg-amber-50 p-3 text-amber-900">
                      <p className="font-semibold">Page refresh pending</p>
                      <ul className="mt-1 text-xs">{refreshJobs.map((j) => <li key={j.id}>{j.action}: {j.status} after {j.attempts} attempt(s){j.lastError ? ` (${j.lastError})` : ""}</li>)}</ul>
                      {user.role === "admin" ? <form action={retryJobsAction.bind(null, place.id)} className="mt-2"><button type="submit" className="text-xs font-semibold underline">Retry now</button></form> : null}
                    </div>
                  ) : null}
                </section>
              </>
            ) : null}

            {tab === "images" ? (
              <>
                {!heroIsPhoto ? <AiIllustrationButton placeId={place.id} prominent={Boolean(job?.progress?.needsImage) || !place.heroMediaId} /> : null}
                <MediaPanel placeId={place.id} images={extras.images} heroId={place.heroMediaId} commonsQuery={parent && place.kind !== "state" ? `${place.name} ${parent.name}` : place.name} />
                {heroIsPhoto ? <AiIllustrationButton placeId={place.id} prominent={false} /> : null}
              </>
            ) : null}

            {tab === "preview" ? previewPane : null}
          </div>
        </div>

        <aside className="hidden min-w-0 xl:block">
          <div className="sticky top-4 max-h-[calc(100dvh-8rem)] overflow-auto">{previewPane}</div>
        </aside>
      </div>

      <BottomBar placeId={place.id} status={place.status} canPublish={user.role === "admin"} problems={preview.problems} />
    </div>
  );
}
