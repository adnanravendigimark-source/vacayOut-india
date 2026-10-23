"use client";

import { useActionState } from "react";
import { idle } from "@/lib/admin/action-state";
import { startDiscoveryAction, startResearchAction } from "@/app/admin/(protected)/research/actions";
import { buttonClass, Notice, secondaryButtonClass } from "../ui";

export function ResearchStartForm({ placeId, sections, disabled }: { placeId: string; sections: { key: string; label: string }[]; disabled: string | null }) {
  const [state, action, pending] = useActionState(startResearchAction.bind(null, placeId), idle);
  return (
    <form action={action} className="space-y-3">
      <fieldset>
        <legend className="text-sm font-medium">Focus (leave all unticked to research every section)</legend>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {sections.map((s) => (
            <label key={s.key} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name="focus" value={s.key} /> {s.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={buttonClass} disabled={pending || Boolean(disabled)}>{pending ? "Starting…" : "Research this place"}</button>
        {disabled ? <span className="text-xs text-muted">{disabled}</span> : null}
      </div>
      <Notice state={state} />
    </form>
  );
}

export function DiscoverStartForm({ placeId, disabled }: { placeId: string; disabled: string | null }) {
  const [state, action, pending] = useActionState(startDiscoveryAction.bind(null, placeId), idle);
  return (
    <form action={action} className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={secondaryButtonClass} disabled={pending || Boolean(disabled)}>{pending ? "Starting…" : "Discover places"}</button>
        {disabled ? <span className="text-xs text-muted">{disabled}</span> : null}
      </div>
      <Notice state={state} />
    </form>
  );
}
