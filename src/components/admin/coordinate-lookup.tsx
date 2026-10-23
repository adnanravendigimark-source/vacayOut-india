"use client";

import { useState, useTransition } from "react";
import type { GeoResult } from "@/lib/geocode";
import { geocodeAction } from "@/app/admin/(protected)/places/actions";

/** Looks up coordinates on OpenStreetMap and fills the latitude/longitude fields (still saved with "Save details"). */
export function CoordinateLookup({ defaultQuery }: { defaultQuery: string }) {
  const [q, setQ] = useState(defaultQuery);
  const [results, setResults] = useState<GeoResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const search = () =>
    start(async () => {
      setError(null);
      const r = await geocodeAction(q);
      if (r.ok) setResults(r.results);
      else setError(r.message);
    });
  const use = (r: GeoResult) => {
    const lat = document.getElementById("lat") as HTMLInputElement | null;
    const lng = document.getElementById("lng") as HTMLInputElement | null;
    if (lat) lat.value = String(r.lat);
    if (lng) lng.value = String(r.lng);
    setResults(null);
  };
  return (
    <div className="rounded-lg border border-dashed border-line p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); search(); } }} aria-label="Place to look up" maxLength={120} className="h-9 min-w-0 flex-1 rounded-md border border-line px-2" />
        <button type="button" onClick={search} disabled={pending} className="h-9 rounded-md border border-line px-3 font-semibold hover:border-ink disabled:opacity-50">{pending ? "Looking up…" : "Find coordinates"}</button>
      </div>
      {error ? <p className="mt-2 text-red-800">{error}</p> : null}
      {results ? (
        results.length ? (
          <ul className="mt-2 space-y-1">
            {results.map((r) => (
              <li key={`${r.lat},${r.lng}`}>
                <button type="button" onClick={() => use(r)} className="text-left underline underline-offset-2">{r.display}</button>
                <span className="text-xs text-muted"> ({r.lat}, {r.lng})</span>
              </li>
            ))}
          </ul>
        ) : <p className="mt-2 text-muted">No match in India. Try a fuller name, e.g. “Hadimba Temple, Manali”.</p>
      ) : null}
      <p className="mt-1 text-xs text-muted">From OpenStreetMap (© OpenStreetMap contributors). Check the pin on the page preview before publishing.</p>
    </div>
  );
}
