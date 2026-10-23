"use client";

import { useActionState } from "react";
import { idle } from "@/lib/admin/action-state";
import { reviewFindingAction } from "@/app/admin/(protected)/research/actions";
import { buttonClass, inputClass, Notice, secondaryButtonClass, textareaClass } from "../ui";

export type FindingView = {
  id: string;
  topic: string;
  claim: string;
  originalClaim: string | null;
  claimType: string;
  conflictNote: string | null;
  verification: "unsupported" | "single_source" | "corroborated" | "conflicting";
  status: "pending" | "approved" | "rejected";
  reviewNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  timeSensitive: boolean;
  dateCheck: boolean;
  evidence: {
    id: string;
    url: string;
    host: string;
    title: string | null;
    authority: string;
    quote: string;
    sourceDate: string | null;
    retrievedAt: string;
    support: string;
    supportLabel: string;
    supportNote: string | null;
  }[];
};

const VERIFY_STYLE: Record<FindingView["verification"], string> = {
  corroborated: "bg-emerald-100 text-emerald-900",
  single_source: "bg-amber-100 text-amber-900",
  unsupported: "bg-red-100 text-red-800",
  conflicting: "bg-orange-200 text-orange-950",
};
const VERIFY_LABEL: Record<FindingView["verification"], string> = {
  corroborated: "Corroborated · 2+ independent sites",
  single_source: "Single source",
  unsupported: "Unsupported by checked sources",
  conflicting: "Sources conflict",
};
const SUPPORT_STYLE: Record<string, string> = {
  supports: "text-emerald-800",
  partial: "text-amber-800",
  does_not_support: "text-red-800",
  contradicts: "text-red-800",
  quote_not_found: "text-red-800",
  unreachable: "text-muted",
  not_checked: "text-muted",
};

export function FindingCard({ f, canReview }: { f: FindingView; canReview: boolean }) {
  const [state, action, pending] = useActionState(reviewFindingAction.bind(null, f.id), idle);
  return (
    <article className="rounded-lg border border-line p-4" aria-label={f.topic}>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold uppercase tracking-wide text-muted">{f.topic}</span>
        <span className={`rounded-full px-2 py-0.5 font-semibold ${VERIFY_STYLE[f.verification]}`}>{VERIFY_LABEL[f.verification]}</span>
        {f.timeSensitive ? <span className="rounded-full bg-sand px-2 py-0.5 font-semibold">Time-sensitive</span> : null}
        {f.dateCheck ? <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-900">Check date: source undated or over a year old</span> : null}
      </div>
      <p className="mt-2 text-sm leading-relaxed">{f.claim}</p>
      {f.originalClaim ? <p className="mt-1 text-xs text-muted">Researched wording: {f.originalClaim}</p> : null}
      {f.conflictNote ? <p className="mt-2 rounded bg-orange-50 px-2 py-1 text-xs text-orange-950"><strong>Conflict:</strong> {f.conflictNote}</p> : null}

      <ul className="mt-3 space-y-2">
        {f.evidence.map((e) => (
          <li key={e.id} className="rounded bg-canvas px-3 py-2 text-xs">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <a href={e.url} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold underline underline-offset-2">{e.host}</a>
              <span className="text-muted">{e.authority}</span>
              <span className="text-muted">· source date {e.sourceDate ?? "not shown"}</span>
              <span className="text-muted">· retrieved {e.retrievedAt}</span>
            </div>
            {e.title ? <p className="mt-0.5 text-muted">{e.title}</p> : null}
            <blockquote className="mt-1 border-l-2 border-line pl-2 italic">“{e.quote}”</blockquote>
            <p className={`mt-1 font-medium ${SUPPORT_STYLE[e.support] ?? ""}`}>
              {e.supportLabel}{e.supportNote ? ` — ${e.supportNote}` : ""}
            </p>
          </li>
        ))}
      </ul>

      {f.status !== "pending" ? (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
          <span className={`rounded-full px-2 py-0.5 font-semibold ${f.status === "approved" ? "bg-emerald-100 text-emerald-900" : "bg-zinc-200 text-zinc-700"}`}>
            {f.status === "approved" ? "Approved" : "Rejected"}
          </span>
          <span className="text-muted">{[f.reviewedBy, f.reviewedAt].filter(Boolean).join(" · ")}{f.reviewNote ? ` — ${f.reviewNote}` : ""}</span>
          {canReview ? (
            <form action={action}>
              <input type="hidden" name="decision" value="reopen" />
              <button type="submit" className="font-semibold underline" disabled={pending}>Reopen</button>
            </form>
          ) : null}
        </div>
      ) : canReview ? (
        <form action={action} className="mt-3 space-y-2">
          <label className="block text-xs font-medium">
            Claim (edit before approving if needed)
            <textarea name="claim" defaultValue={f.claim} rows={2} maxLength={600} className={textareaClass} />
          </label>
          <label className="block text-xs font-medium">
            Review note{f.verification === "unsupported" || f.verification === "conflicting" ? " (required to approve)" : " (optional)"}
            <input name="note" maxLength={500} className={inputClass} placeholder="e.g. Checked the official site on 22 Oct" />
          </label>
          <div className="flex gap-2">
            <button type="submit" name="decision" value="approve" className={buttonClass} disabled={pending}>Approve</button>
            <button type="submit" name="decision" value="reject" className={secondaryButtonClass} disabled={pending}>Reject</button>
          </div>
          <Notice state={state} />
        </form>
      ) : (
        <p className="mt-3 text-xs text-muted">Waiting for an admin to review.</p>
      )}
      {f.status !== "pending" ? <Notice state={state} /> : null}
    </article>
  );
}
