"use client";

import Link from "next/link";
import { useActionState } from "react";
import { idle } from "@/lib/admin/action-state";
import { acceptCandidateAction, rejectCandidateAction } from "@/app/admin/(protected)/research/actions";
import { buttonClass, inputClass, Notice, secondaryButtonClass } from "../ui";

export type CandidateView = {
  id: string;
  name: string;
  kind: string;
  reason: string;
  status: "pending" | "accepted" | "rejected";
  evidence: { url: string; title: string | null; quote: string; site: string }[];
  matched: { id: string; name: string } | null;
  createdPlaceId: string | null;
};

export function CandidateRow({ c, kinds }: { c: CandidateView; kinds: readonly string[] }) {
  const [state, action, pending] = useActionState(acceptCandidateAction.bind(null, c.id), idle);
  const createdId = state.fields?.createdId ?? c.createdPlaceId;
  return (
    <li className="rounded-lg border border-line p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{c.name}</span>
        <span className="text-xs text-muted">{c.kind}</span>
        {c.matched ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
            Possible duplicate of <Link href={`/admin/places/${c.matched.id}`} className="underline">{c.matched.name}</Link>
          </span>
        ) : null}
        {c.status !== "pending" ? <span className="ml-auto text-xs font-semibold text-muted">{c.status === "accepted" ? "Added" : "Rejected"}</span> : null}
      </div>
      <p className="mt-1 text-muted">{c.reason}</p>
      <ul className="mt-1 space-y-0.5 text-xs">
        {c.evidence.map((e) => (
          <li key={e.url}>
            <a href={e.url} target="_blank" rel="noopener noreferrer nofollow" className="font-medium underline underline-offset-2">{e.site}</a>
            <span className="text-muted"> — “{e.quote}”</span>
          </li>
        ))}
      </ul>
      {createdId ? (
        <p className="mt-2 text-xs"><Link href={`/admin/places/${createdId}`} className="font-semibold underline">Open the new draft →</Link></p>
      ) : c.status === "pending" ? (
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <form action={action} className="flex flex-wrap items-end gap-2">
            <label className="text-xs font-medium">Name<input name="name" defaultValue={c.name} maxLength={120} className={`${inputClass} h-8 w-48`} /></label>
            <label className="text-xs font-medium">
              Type
              <select name="kind" defaultValue={c.kind} className={`${inputClass} h-8 w-36`}>
                {kinds.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </label>
            <button type="submit" className={`${buttonClass} h-8`} disabled={pending}>Add as draft</button>
          </form>
          <form action={rejectCandidateAction.bind(null, c.id)}>
            <button type="submit" className={`${secondaryButtonClass} h-8`}>Reject</button>
          </form>
        </div>
      ) : null}
      <div className="mt-2"><Notice state={state} /></div>
    </li>
  );
}
