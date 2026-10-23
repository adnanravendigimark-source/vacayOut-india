"use client";

import { useState, useTransition } from "react";
import type { ActionState } from "@/lib/admin/action-state";
import { approveSectionAction } from "@/app/admin/(protected)/places/actions";
import { Notice } from "../ui";

/** Approves a section together with its verified facts — or lists what to decide first. */
export function ApproveButton({ placeId, sectionKey, disabled }: { placeId: string; sectionKey: string; disabled?: boolean }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<ActionState | null>(null);
  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending || disabled}
        onClick={() => start(async () => setState(await approveSectionAction(placeId, sectionKey)))}
        className="inline-flex h-8 items-center rounded-lg bg-ink px-3 text-xs font-semibold text-white hover:bg-black disabled:opacity-40"
      >
        {pending ? "Approving…" : "Approve section"}
      </button>
      {state ? <Notice state={state} /> : null}
    </div>
  );
}
