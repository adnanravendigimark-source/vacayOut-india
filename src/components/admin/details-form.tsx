"use client";

import { useActionState, useState } from "react";
import { TRIP_TYPES } from "@/lib/places/trip-types";
import { idle } from "@/lib/admin/action-state";
import { updateDetailsAction } from "@/app/admin/(protected)/places/actions";
import { CoordinateLookup } from "./coordinate-lookup";
import { buttonClass, inputClass, Notice, textareaClass } from "./ui";

type Place = {
  id: string;
  name: string;
  slug: string;
  status: string;
  summary: string | null;
  lat: number | null;
  lng: number | null;
  seoTitle: string | null;
  seoDescription: string | null;
  kind: string;
  displayMode: "page" | "parent_section";
  featured: boolean;
  tripTypes: string[];
  suggestedTripTypes: string[];
};

export function DetailsForm({ place }: { place: Place }) {
  const [state, action, pending] = useActionState(updateDetailsAction.bind(null, place.id), idle);
  const published = place.status === "published";
  const [types, setTypes] = useState<string[]>(place.tripTypes);
  const pendingSuggestions = place.suggestedTripTypes.filter((t) => !types.includes(t));
  const label = (k: string) => TRIP_TYPES.find((t) => t.key === k)?.label ?? k;
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="text-sm font-medium">Name</label>
          <input id="name" name="name" required maxLength={120} defaultValue={place.name} className={inputClass} />
        </div>
        <div>
          <label htmlFor="slug" className="text-sm font-medium">URL slug</label>
          <input id="slug" name="slug" maxLength={80} defaultValue={place.slug} readOnly={published} aria-describedby="slug-help" className={`${inputClass} ${published ? "bg-sand text-muted" : ""}`} />
          <p id="slug-help" className="mt-1 text-xs text-muted">{published ? "Locked while published, so links don’t break." : "Lowercase letters, numbers and hyphens."}</p>
        </div>
      </div>
      <div>
        <label htmlFor="summary" className="text-sm font-medium">Card summary <span className="font-normal text-muted">(one or two sentences, used on cards and links)</span></label>
        <textarea id="summary" name="summary" rows={2} maxLength={400} defaultValue={place.summary ?? ""} className={textareaClass} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="lat" className="text-sm font-medium">Latitude</label>
          <input id="lat" name="lat" inputMode="decimal" defaultValue={place.lat ?? ""} className={inputClass} />
        </div>
        <div>
          <label htmlFor="lng" className="text-sm font-medium">Longitude</label>
          <input id="lng" name="lng" inputMode="decimal" defaultValue={place.lng ?? ""} className={inputClass} />
        </div>
      </div>
      <CoordinateLookup defaultQuery={place.name} />
      <div>
        <label htmlFor="seoTitle" className="text-sm font-medium">SEO title <span className="font-normal text-muted">(≤ 70 characters)</span></label>
        <input id="seoTitle" name="seoTitle" maxLength={120} defaultValue={place.seoTitle ?? ""} className={inputClass} />
      </div>
      <div>
        <label htmlFor="seoDescription" className="text-sm font-medium">Meta description <span className="font-normal text-muted">(≤ 170 characters)</span></label>
        <textarea id="seoDescription" name="seoDescription" rows={2} maxLength={300} defaultValue={place.seoDescription ?? ""} className={textareaClass} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {place.kind !== "state" ? (
          <div>
            <label htmlFor="displayMode" className="text-sm font-medium">How it’s shown</label>
            <select id="displayMode" name="displayMode" defaultValue={place.displayMode} disabled={published} className={inputClass}>
              <option value="page">Its own page (needs enough unique content)</option>
              <option value="parent_section">A section inside its parent’s page</option>
            </select>
            {published ? <input type="hidden" name="displayMode" value={place.displayMode} /> : null}
          </div>
        ) : null}
        <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium">
          <input type="checkbox" name="featured" defaultChecked={place.featured} className="size-4" />
          Feature on the homepage
        </label>
      </div>
      <fieldset>
        <legend className="text-sm font-medium">Trip types <span className="font-normal text-muted">(shown under “Find your kind of trip” on the homepage once published)</span></legend>
        <input type="hidden" name="tripTypesShown" value="1" />
        <div className="mt-2 flex flex-wrap gap-2">
          {TRIP_TYPES.map((t) => (
            <label key={t.key} className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm ${types.includes(t.key) ? "border-ink bg-sand" : "border-line"}`}>
              <input
                type="checkbox"
                name="tripTypes"
                value={t.key}
                checked={types.includes(t.key)}
                onChange={(e) => setTypes((cur) => (e.target.checked ? [...cur, t.key] : cur.filter((k) => k !== t.key)))}
                className="size-4"
              />
              {t.label}
            </label>
          ))}
        </div>
        {pendingSuggestions.length ? (
          <p className="mt-2 text-xs text-muted">
            Suggested from the research: {pendingSuggestions.map(label).join(", ")}.{" "}
            <button type="button" onClick={() => setTypes((cur) => [...cur, ...pendingSuggestions])} className="font-semibold text-ink underline">Tick these</button>{" "}
            — check they fit, then save.
          </p>
        ) : null}
      </fieldset>
      <Notice state={state} />
      <button type="submit" disabled={pending} className={buttonClass}>{pending ? "Saving…" : "Save details"}</button>
    </form>
  );
}
