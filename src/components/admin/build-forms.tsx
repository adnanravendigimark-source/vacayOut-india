"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { idle } from "@/lib/admin/action-state";
import { resumeBuildAction, startBuildAction } from "@/app/admin/(protected)/places/build/actions";
import { Notice, buttonClass, inputClass, secondaryButtonClass } from "./ui";

/** Create a whole state: pick from the states that aren't in VacayOut yet. */
export function CreateStateForm({ states }: { states: { name: string; type: string }[] }) {
  const [state, action, pending] = useActionState(startBuildAction, idle);
  const [value, setValue] = useState("");
  return (
    <form action={action} className="space-y-4 rounded-xl border border-line bg-white p-5">
      <input type="hidden" name="kind" value="state" />
      <label className="block text-sm font-medium">
        State or union territory
        <select name="state" required value={value} onChange={(e) => setValue(e.target.value)} className={inputClass}>
          <option value="" disabled>
            Choose a state…
          </option>
          {states.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name}
              {s.type === "Union territory" ? " (UT)" : ""}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-xs text-muted">States already in VacayOut aren’t listed — open them to add destinations.</span>
      </label>
      <button type="submit" disabled={pending || !value} className="inline-flex h-10 items-center rounded-lg bg-coral px-5 text-sm font-semibold text-white hover:bg-coral-hover disabled:opacity-50">
        {pending ? "Starting…" : "Create"}
      </button>
      <Notice state={state} />
    </form>
  );
}

/** Inside a state: add one named destination, or let the builder pick more. */
export function AddDestinationForms({ stateName }: { stateName: string }) {
  const [state, action, pending] = useActionState(startBuildAction, idle);
  const [more, moreAction, morePending] = useActionState(startBuildAction, idle);
  const [name, setName] = useState("");
  return (
    <div className="space-y-2 rounded-xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-end gap-3">
        <form action={action} className="flex flex-1 flex-wrap items-end gap-2">
          <input type="hidden" name="kind" value="destination" />
          <input type="hidden" name="state" value={stateName} />
          <label className="block min-w-56 flex-1 text-sm font-medium">
            Add a destination in {stateName}
            <input name="target" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={120} placeholder="e.g. Coorg" className={inputClass} />
          </label>
          <button type="submit" disabled={pending || name.trim().length < 2} className="inline-flex h-10 items-center rounded-lg bg-coral px-4 text-sm font-semibold text-white hover:bg-coral-hover disabled:opacity-50">
            {pending ? "Starting…" : "+ Add destination"}
          </button>
        </form>
        <form action={moreAction}>
          <input type="hidden" name="kind" value="more" />
          <input type="hidden" name="state" value={stateName} />
          <button type="submit" disabled={morePending} className={`${secondaryButtonClass} h-10`} title="Finds up to 5 well-known destinations that aren’t in VacayOut yet">
            {morePending ? "Starting…" : "Find more destinations"}
          </button>
        </form>
      </div>
      <p className="text-xs text-muted">Builds the page, its main sights, a trip plan and a guide from Wikivoyage and Wikipedia, then publishes what passes the checks. Usually a few minutes; under $1.</p>
      <Notice state={state} />
      <Notice state={more} />
    </div>
  );
}

export function ResumeBuildButton({ id }: { id: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; message?: string }>(idle);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending}
        className={buttonClass}
        onClick={() =>
          start(async () => {
            const r = await resumeBuildAction(id);
            setMsg(r);
            if (r.ok) router.refresh();
          })
        }
      >
        {pending ? "Restarting…" : "Resume build"}
      </button>
      <Notice state={msg} />
    </div>
  );
}
