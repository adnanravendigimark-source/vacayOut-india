"use client";

import { useActionState } from "react";
import { idle } from "@/lib/admin/action-state";
import { generateIllustrationAction } from "@/app/admin/(protected)/places/actions";
import { Notice } from "../ui";

/** Optional, explicit: only offered when the admin wants an illustration (usually when no free photo exists). */
export function AiIllustrationButton({ placeId, prominent }: { placeId: string; prominent: boolean }) {
  const [state, action, pending] = useActionState(generateIllustrationAction.bind(null, placeId), idle);
  return (
    <form action={action} className={`space-y-2 rounded-lg p-3 text-sm ${prominent ? "border border-amber-300 bg-amber-50" : "border border-dashed border-line"}`}>
      <p>
        {prominent ? <strong>No free photo was found. </strong> : null}
        You can create an <strong>AI-generated illustration</strong>. It is labelled as an illustration everywhere it appears, is never shown as a real photograph, and is charged to the AI budget (about $0.20).
      </p>
      <button type="submit" disabled={pending} className="inline-flex h-8 items-center rounded-lg border border-line bg-white px-3 text-xs font-semibold hover:border-ink disabled:opacity-50">
        {pending ? "Creating illustration (up to a minute)…" : "Create AI illustration"}
      </button>
      <Notice state={state} />
    </form>
  );
}
