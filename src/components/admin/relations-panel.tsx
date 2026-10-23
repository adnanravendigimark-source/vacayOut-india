"use client";

import { useActionState } from "react";
import { idle } from "@/lib/admin/action-state";
import { addRelationAction, removeRelationAction } from "@/app/admin/(protected)/places/actions";
import { Notice, secondaryButtonClass, StatusBadge } from "./ui";

type Rel = { toId: string; type: "nearby" | "day_trip"; name: string; status: string };

export function RelationsPanel({ placeId, relations, options }: { placeId: string; relations: Rel[]; options: { id: string; name: string; kind: string }[] }) {
  const [state, action, pending] = useActionState(addRelationAction.bind(null, placeId), idle);
  const taken = new Set(relations.map((r) => r.toId));
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <h2 className="font-semibold">Related places</h2>
      <p className="mt-1 text-xs text-muted">Shown on the public page only once they are published.</p>
      {relations.length ? (
        <ul className="mt-2 space-y-1 text-sm">
          {relations.map((r) => (
            <li key={`${r.toId}-${r.type}`} className="flex items-center gap-2">
              <span>{r.name}</span>
              <span className="text-xs text-muted">{r.type === "day_trip" ? "day trip" : "nearby"}</span>
              <StatusBadge status={r.status} />
              <form action={removeRelationAction.bind(null, placeId, r.toId, r.type)} className="ml-auto">
                <button type="submit" aria-label={`Remove ${r.name}`} className="text-xs underline">Remove</button>
              </form>
            </li>
          ))}
        </ul>
      ) : null}
      {options.length ? (
        <form action={action} className="mt-3 space-y-2">
          <label htmlFor="toId" className="sr-only">Place</label>
          <select id="toId" name="toId" required defaultValue="" className="h-9 w-full rounded-lg border border-line px-2 text-sm">
            <option value="" disabled>Choose a place…</option>
            {options.filter((o) => !taken.has(o.id)).map((o) => <option key={o.id} value={o.id}>{o.name} ({o.kind})</option>)}
          </select>
          <div className="flex gap-2">
            <select name="type" aria-label="Relation" defaultValue="nearby" className="h-9 rounded-lg border border-line px-2 text-sm">
              <option value="nearby">Nearby</option>
              <option value="day_trip">Day trip</option>
            </select>
            <button type="submit" disabled={pending} className={secondaryButtonClass}>Add</button>
          </div>
          <Notice state={state} />
        </form>
      ) : <p className="mt-2 text-sm text-muted">Add more places in this state first.</p>}
    </div>
  );
}
