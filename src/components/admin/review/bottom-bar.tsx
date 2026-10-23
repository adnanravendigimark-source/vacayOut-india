"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { idle, type ActionState } from "@/lib/admin/action-state";
import { archiveAction, publishAction, regenerateSectionsAction, saveDraftAction, unpublishAction } from "@/app/admin/(protected)/places/actions";
import { submitForReviewAction } from "@/app/admin/(protected)/places/actions";
import { Notice } from "../ui";

/**
 * The three main actions: Save draft · Regenerate selected · Publish.
 * Section checkboxes elsewhere on the page belong to the "regen-form" form.
 */
export function BottomBar({ placeId, status, canPublish, problems }: { placeId: string; status: string; canPublish: boolean; problems: string[] }) {
  const router = useRouter();
  const [regenState, regen, regenerating] = useActionState(regenerateSectionsAction.bind(null, placeId), idle);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionState | null>(null);
  const [showIssues, setShowIssues] = useState(false);
  const run = (fn: () => Promise<ActionState | void>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    start(async () => {
      const r = await fn();
      if (r) setResult(r);
      router.refresh();
    });
  };
  const published = status === "published";
  const blocked = problems.length > 0;

  return (
    <div className="sticky bottom-0 z-30 -mx-4 mt-8 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
      {showIssues && blocked ? (
        <ul className="mb-3 max-h-48 list-disc overflow-auto rounded-lg bg-red-50 py-2 pl-7 pr-3 text-sm text-red-800">
          {problems.map((p) => <li key={p}>{p}</li>)}
        </ul>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={pending} onClick={() => run(() => saveDraftAction(placeId))} className="inline-flex h-10 items-center rounded-lg border border-line bg-white px-4 text-sm font-semibold hover:border-ink disabled:opacity-50">
          Save draft
        </button>
        <form id="regen-form" action={regen} className="flex items-center gap-2">
          <button type="submit" disabled={regenerating} className="inline-flex h-10 items-center rounded-lg border border-line bg-white px-4 text-sm font-semibold hover:border-ink disabled:opacity-50">
            {regenerating ? "Starting…" : "Regenerate selected"}
          </button>
        </form>
        <span className="flex-1" />
        {blocked ? (
          <button type="button" onClick={() => setShowIssues(!showIssues)} className="text-sm font-semibold text-red-800 underline underline-offset-4">
            {problems.length} issue{problems.length === 1 ? "" : "s"} before publishing {showIssues ? "▴" : "▾"}
          </button>
        ) : <span className="text-sm text-emerald-800">Ready to publish</span>}
        {canPublish ? (
          <>
            {published ? (
              <button type="button" disabled={pending} onClick={() => run(() => unpublishAction(placeId), "Unpublish? It disappears from the site, directory, sitemap and AI answers.")} className="h-10 px-2 text-sm font-semibold text-muted underline underline-offset-4">
                Unpublish
              </button>
            ) : null}
            {status !== "archived" ? (
              <button type="button" disabled={pending} onClick={() => run(() => archiveAction(placeId), "Archive this destination?")} className="h-10 px-2 text-sm font-semibold text-muted underline underline-offset-4">
                Archive
              </button>
            ) : null}
            <button
              type="button"
              disabled={pending || blocked}
              title={blocked ? "Fix the issues first" : undefined}
              onClick={() => run(() => publishAction(placeId))}
              className="inline-flex h-10 items-center rounded-lg bg-coral px-5 text-sm font-semibold text-white hover:bg-coral-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pending ? "Working…" : published ? "Publish changes" : "Publish destination"}
            </button>
          </>
        ) : (
          <button type="button" disabled={pending || status === "in_review"} onClick={() => run(async () => { await submitForReviewAction(placeId); return { ok: true, message: "Sent to an admin for review." }; })} className="inline-flex h-10 items-center rounded-lg bg-ink px-5 text-sm font-semibold text-white disabled:opacity-40">
            {status === "in_review" ? "Waiting for an admin" : "Submit for review"}
          </button>
        )}
      </div>
      <div className="mt-2 space-y-2 empty:hidden">
        {regenState.message ? <Notice state={regenState} /> : null}
        {result?.message ? <Notice state={result} /> : null}
      </div>
    </div>
  );
}
