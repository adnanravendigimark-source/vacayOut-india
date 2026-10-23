import { SECTION_DEFS } from "@/lib/places/sections";
import { usd } from "@/lib/research/cost";
import { CANDIDATE_KINDS } from "@/lib/research/engine";
import { openaiConfigured } from "@/lib/research/openai";
import { budgetStatus, listCandidates, listFindingsForPlace, listRunsForPlace } from "@/lib/research/service";
import { AUTHORITY_LABEL, type Authority } from "@/lib/research/urls";
import { isVolatile, needsDateCheck, SUPPORT_LABEL, type Support } from "@/lib/research/verify";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";
import { AutoRefresh } from "./auto-refresh";
import { CandidateRow, type CandidateView } from "./candidate-row";
import { FindingCard, type FindingView } from "./finding-card";
import { DiscoverStartForm, ResearchStartForm } from "./start-forms";

const fmt = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const fmtTime = (d: Date) => d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });

type Runs = Awaited<ReturnType<typeof listRunsForPlace>>;

function RunList({ runs }: { runs: Runs }) {
  if (!runs.length) return null;
  return (
    <ul className="mt-3 space-y-1 text-xs">
      {runs.map((r) => (
        <li key={r.id} className="rounded bg-canvas px-3 py-2">
          <span className="font-semibold">{r.kind === "place_facts" ? "Research" : "Discovery"}</span>
          {" · "}
          <span className={r.status === "failed" ? "text-red-800" : r.status === "done" ? "text-emerald-800" : "text-amber-800"}>
            {r.status === "queued" || r.status === "running" ? "In progress…" : r.status}
          </span>
          {" · "}{fmtTime(r.createdAt)} · {r.model} · {usd(r.costMicroUsd)} est. · {r.searchCalls} searches
          {r.error ? <span className="block text-red-800">{r.error}</span> : null}
          {r.notes ? <span className="block whitespace-pre-line text-muted">{r.notes}</span> : null}
        </li>
      ))}
    </ul>
  );
}

async function startBlocker(placeRuns: Runs) {
  if (!openaiConfigured()) return "Add OPENAI_API_KEY to enable research.";
  const b = await budgetStatus();
  if (placeRuns.some((r) => r.status === "queued" || r.status === "running")) return "A run is in progress.";
  if (b.remaining < b.reserve) return `Monthly budget left: ${usd(b.remaining)} — not enough for a run (${usd(b.reserve)} is set aside per run).`;
  return null;
}

export async function ResearchPanel({ placeId, canReview }: { placeId: string; canReview: boolean }) {
  const [allRuns, findings] = await Promise.all([listRunsForPlace(placeId, 12), listFindingsForPlace(placeId)]);
  const runs = allRuns.filter((r) => r.kind === "place_facts").slice(0, 5);
  const active = runs.some((r) => r.status === "queued" || r.status === "running");
  const blocker = await startBlocker(allRuns);
  const reviewerIds = [...new Set(findings.map((f) => f.reviewedBy).filter((x): x is string => Boolean(x)))];
  const reviewers = reviewerIds.length ? await getDb().select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, reviewerIds)) : [];
  const nameOf = new Map(reviewers.map((u) => [u.id, u.name]));

  const views: (FindingView & { sectionKey: string | null })[] = findings.map((f) => ({
    id: f.id,
    sectionKey: f.sectionKey,
    topic: f.topic,
    claim: f.claim,
    originalClaim: f.originalClaim,
    claimType: f.claimType,
    conflictNote: f.conflictNote,
    verification: f.verification,
    status: f.status,
    reviewNote: f.reviewNote,
    reviewedBy: f.reviewedBy ? (nameOf.get(f.reviewedBy) ?? null) : null,
    reviewedAt: f.reviewedAt ? fmt(f.reviewedAt) : null,
    timeSensitive: isVolatile(f.claimType),
    dateCheck: needsDateCheck(f.claimType, f.evidence.map((e) => e.e.sourceDate)),
    evidence: f.evidence.map(({ e, s }) => ({
      id: e.id,
      url: s.url,
      host: s.host,
      title: s.title,
      authority: AUTHORITY_LABEL[s.authority as Authority],
      quote: e.quote,
      sourceDate: e.sourceDate,
      retrievedAt: fmt(e.retrievedAt),
      support: e.support,
      supportLabel: SUPPORT_LABEL[e.support as Support],
      supportNote: e.supportNote,
    })),
  }));
  const pending = views.filter((v) => v.status === "pending");
  const reviewed = views.filter((v) => v.status !== "pending");
  const approved = reviewed.filter((v) => v.status === "approved").length;

  return (
    <section id="research" className="rounded-xl border border-line bg-white p-5" aria-labelledby="research-h">
      <AutoRefresh active={active} />
      <h2 id="research-h" className="font-semibold">Research</h2>
      <p className="mt-1 text-sm text-muted">
        Facts found on the web, with sources. Nothing here appears on the public page or in AI answers until it is approved <em>and</em> written into a section.
      </p>
      <div className="mt-4">
        <ResearchStartForm placeId={placeId} sections={SECTION_DEFS.map((d) => ({ key: d.key, label: d.label }))} disabled={blocker} />
      </div>
      <RunList runs={runs} />

      {pending.length ? (
        <div className="mt-5 space-y-5">
          <h3 className="text-sm font-semibold">To review ({pending.length})</h3>
          {SECTION_DEFS.map((d) => {
            const items = pending.filter((p) => p.sectionKey === d.key);
            if (!items.length) return null;
            return (
              <div key={d.key} className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">{d.label}</h4>
                {items.map((f) => <FindingCard key={f.id} f={f} canReview={canReview} />)}
              </div>
            );
          })}
        </div>
      ) : findings.length === 0 && !active ? (
        <p className="mt-4 text-sm text-muted">No research yet.</p>
      ) : null}

      {reviewed.length ? (
        <details className="mt-5">
          <summary className="cursor-pointer text-sm font-semibold">Reviewed ({approved} approved, {reviewed.length - approved} rejected)</summary>
          <div className="mt-3 space-y-3">
            {reviewed.map((f) => <FindingCard key={f.id} f={f} canReview={canReview} />)}
          </div>
        </details>
      ) : null}
    </section>
  );
}

export async function DiscoverPanel({ placeId }: { placeId: string }) {
  const [allRuns, rows] = await Promise.all([listRunsForPlace(placeId, 12), listCandidates(placeId)]);
  const runs = allRuns.filter((r) => r.kind === "discover_places").slice(0, 3);
  const active = runs.some((r) => r.status === "queued" || r.status === "running");
  const blocker = await startBlocker(allRuns);
  const views: CandidateView[] = rows.map(({ c, matchedName }) => ({
    id: c.id,
    name: c.name,
    kind: c.kind,
    reason: c.reason,
    status: c.status,
    evidence: c.evidence,
    matched: c.matchedPlaceId && matchedName ? { id: c.matchedPlaceId, name: matchedName } : null,
    createdPlaceId: c.createdPlaceId,
  }));
  // Accepted suggestions stay visible (with a link to the new draft); rejected ones fold away.
  const pending = [...views.filter((v) => v.status === "pending"), ...views.filter((v) => v.status === "accepted")];
  const done = views.filter((v) => v.status === "rejected");

  return (
    <section id="discover" className="rounded-xl border border-line bg-white p-5" aria-labelledby="discover-h">
      <AutoRefresh active={active} />
      <h2 id="discover-h" className="font-semibold">Discover places</h2>
      <p className="mt-1 text-sm text-muted">Suggests places in this area with sources. Adding one creates an empty draft — nothing is published.</p>
      <div className="mt-3"><DiscoverStartForm placeId={placeId} disabled={blocker} /></div>
      <RunList runs={runs} />
      {pending.length ? (
        <ul className="mt-4 space-y-2">{pending.map((c) => <CandidateRow key={c.id} c={c} kinds={CANDIDATE_KINDS} />)}</ul>
      ) : null}
      {done.length ? (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-semibold">Rejected ({done.length})</summary>
          <ul className="mt-2 space-y-2">{done.map((c) => <CandidateRow key={c.id} c={c} kinds={CANDIDATE_KINDS} />)}</ul>
        </details>
      ) : null}
    </section>
  );
}
