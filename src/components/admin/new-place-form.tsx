"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { idle } from "@/lib/admin/action-state";
import { INDIA_REGIONS, matchRegion } from "@/lib/places/states";
import { checkDestinationAction, createDestinationAction, findDestinationAction } from "@/app/admin/(protected)/places/actions";
import { Notice, inputClass } from "./ui";

type StateRow = { id: string; name: string; status: string };
type Container = { id: string; name: string; kind: string; stateId: string | null };
type Found = Awaited<ReturnType<typeof findDestinationAction>>;

const KINDS = [
  ["city", "City"],
  ["town", "Town or village"],
  ["region", "Region or valley"],
  ["attraction", "Attraction"],
  ["temple", "Temple"],
  ["lake", "Lake"],
  ["viewpoint", "Viewpoint"],
  ["trek", "Trek"],
  ["nature", "Nature spot"],
  ["museum", "Museum"],
  ["activity", "Activity"],
] as const;

/**
 * Create destination: pick a state (or search by name), name the place, then
 * one click generates everything. Option A and B both end in the same form.
 */
export function NewPlaceForm({ states, containers, defaultState }: { states: StateRow[]; containers: Container[]; defaultState?: string }) {
  const [state, action, pending] = useActionState(createDestinationAction, idle);
  const [mode, setMode] = useState<"pick" | "search">("pick");
  const [region, setRegion] = useState(defaultState ?? state.fields?.state ?? "");
  const [what, setWhat] = useState<"place" | "state">("place");
  const [name, setName] = useState(state.fields?.name ?? "");
  const [kind, setKind] = useState(state.fields?.kind || "city");
  const [parentId, setParentId] = useState("");
  const [dup, setDup] = useState<{ id: string; name: string; status: string } | null>(null);
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<Found | null>(null);
  const [searching, startSearch] = useTransition();

  const official = matchRegion(region);
  const stateRow = official ? states.find((s) => s.name.toLowerCase() === official.toLowerCase()) : undefined;
  const inside = useMemo(() => (stateRow ? containers.filter((c) => c.stateId === stateRow.id) : []), [stateRow, containers]);

  // Live duplicate check while typing.
  useEffect(() => {
    if (!official || what !== "place" || name.trim().length < 2) return;
    const t = setTimeout(async () => setDup((await checkDestinationAction(official, name)).existing), 350);
    return () => clearTimeout(t);
  }, [official, name, what]);
  const shownDup = official && what === "place" && name.trim().length >= 2 ? dup : null;
  const existingId = state.fields?.existingId;

  const ready = Boolean(official) && (what === "state" ? !stateRow || stateRow.status !== "published" : name.trim().length >= 2 && !shownDup);

  return (
    <div className="max-w-2xl space-y-6">
      <div role="tablist" aria-label="How to choose" className="inline-flex rounded-lg border border-line bg-white p-1 text-sm">
        {(["pick", "search"] as const).map((m) => (
          <button key={m} role="tab" type="button" aria-selected={mode === m} onClick={() => setMode(m)} className={`rounded-md px-3 py-1.5 font-semibold ${mode === m ? "bg-ink text-white" : "text-ink/70"}`}>
            {m === "pick" ? "Choose a state" : "Search by name"}
          </button>
        ))}
      </div>

      {mode === "search" ? (
        <section className="space-y-3 rounded-xl border border-line bg-white p-5">
          <label className="block text-sm font-medium">
            Place in India
            <div className="mt-1 flex gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); startSearch(async () => setFound(await findDestinationAction(query))); } }}
                placeholder="e.g. Dharamshala"
                maxLength={120}
                className={`${inputClass} mt-0`}
              />
              <button type="button" disabled={searching || query.trim().length < 2} onClick={() => startSearch(async () => setFound(await findDestinationAction(query)))} className="h-10 rounded-lg border border-line px-4 text-sm font-semibold hover:border-ink disabled:opacity-50">
                {searching ? "Searching…" : "Search"}
              </button>
            </div>
          </label>
          {found ? (
            <div className="space-y-3 text-sm">
              {found.ours.length ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Already in VacayOut</p>
                  <ul className="mt-1 space-y-1">
                    {found.ours.map((o) => (
                      <li key={o.id}><Link href={`/admin/places/${o.id}`} className="font-semibold underline">{o.name}</Link> <span className="text-muted">{o.kind}{o.stateName && o.kind !== "state" ? `, ${o.stateName}` : ""} · {o.status.replace("_", " ")}</span></li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">On the map (OpenStreetMap)</p>
                {found.osm.length ? (
                  <ul className="mt-1 space-y-1.5">
                    {found.osm.map((o) => (
                      <li key={o.display} className="flex flex-wrap items-center gap-2">
                        <span><span className="font-semibold">{o.name}</span> <span className="text-muted">— {o.state}</span></span>
                        <button
                          type="button"
                          onClick={() => {
                            setRegion(o.state);
                            if (o.kind === "state") setWhat("state");
                            else {
                              setWhat("place");
                              setName(o.name);
                              setKind(KINDS.some(([k]) => k === o.kind) ? o.kind : "attraction");
                            }
                            setMode("pick");
                          }}
                          className="rounded-md border border-line px-2 py-0.5 text-xs font-semibold hover:border-ink"
                        >
                          Use this
                        </button>
                        <span className="w-full truncate text-xs text-muted">{o.display}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="mt-1 text-muted">{"message" in found && found.message ? found.message : "No match in India. Check the spelling, or choose the state yourself."}</p>}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <form action={action} className="space-y-5 rounded-xl border border-line bg-white p-5">
        <label className="block text-sm font-medium">
          State or union territory
          <input
            name="state"
            list="india-regions"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="Type to search, e.g. Himachal Pradesh"
            autoComplete="off"
            required
            className={inputClass}
          />
          <datalist id="india-regions">{INDIA_REGIONS.map((r) => <option key={r.name} value={r.name}>{r.type}</option>)}</datalist>
          <span className="mt-1 block text-xs text-muted">
            {region && !official ? "Choose one of India’s states or union territories from the list." : stateRow ? `${stateRow.name} is in VacayOut (${stateRow.status.replace("_", " ")}).` : official ? `${official} will be added as a new state.` : " "}
          </span>
        </label>

        <fieldset>
          <legend className="text-sm font-medium">What are you creating?</legend>
          <div className="mt-2 flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="radio" checked={what === "place"} onChange={() => setWhat("place")} /> A place in this state</label>
            <label className="flex items-center gap-2"><input type="radio" checked={what === "state"} onChange={() => setWhat("state")} /> The state itself</label>
          </div>
        </fieldset>

        {what === "place" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium sm:col-span-2">
              Place name
              <input name="name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={120} placeholder="e.g. Manali" className={inputClass} />
              {shownDup ? (
                <span className="mt-1 block text-xs text-amber-900">
                  “{shownDup.name}” already exists ({shownDup.status.replace("_", " ")}). <Link href={`/admin/places/${shownDup.id}`} className="font-semibold underline">Open it</Link>
                </span>
              ) : official && name.trim().length >= 2 ? <span className="mt-1 block text-xs text-emerald-800">✓ New destination</span> : null}
            </label>
            <label className="block text-sm font-medium">
              Type
              <select name="kind" value={kind} onChange={(e) => setKind(e.target.value)} className={inputClass}>
                {KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Inside <span className="font-normal text-muted">(optional)</span>
              <select name="parentId" value={parentId} onChange={(e) => setParentId(e.target.value)} className={inputClass}>
                <option value="">Directly in the state</option>
                {inside.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.kind})</option>)}
              </select>
            </label>
          </div>
        ) : stateRow?.status === "published" ? (
          <p className="text-sm text-amber-900">{stateRow.name} is already published. <Link href={`/admin/places/${stateRow.id}`} className="font-semibold underline">Open it</Link> to regenerate sections.</p>
        ) : null}

        <Notice state={state} />
        {existingId ? <Link href={`/admin/places/${existingId}`} className="text-sm font-semibold underline">Open the existing destination →</Link> : null}

        <div className="flex flex-wrap items-center gap-4 border-t border-line pt-4">
          <button type="submit" disabled={pending || !ready} className="inline-flex h-11 items-center rounded-lg bg-coral px-5 font-semibold text-white hover:bg-coral-hover disabled:opacity-50">
            {pending ? "Starting…" : "Generate destination"}
          </button>
          <p className="text-xs text-muted">Researches with sources, writes each section, finds a photo and fills SEO. About 3–5 minutes and roughly $0.70 of the AI budget. Nothing is published.</p>
        </div>
      </form>
    </div>
  );
}
