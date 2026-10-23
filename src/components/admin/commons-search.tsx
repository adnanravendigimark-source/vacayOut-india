"use client";

import { useActionState, useState, useTransition } from "react";
import { idle } from "@/lib/admin/action-state";
import type { CommonsFile } from "@/lib/media/commons";
import { importCommonsAction, searchCommonsAction } from "@/app/admin/(protected)/places/actions";
import { buttonClass, inputClass, Notice, secondaryButtonClass } from "./ui";

function Result({ placeId, f }: { placeId: string; f: CommonsFile }) {
  const [state, action, pending] = useActionState(importCommonsAction.bind(null, placeId), idle);
  return (
    <li className="overflow-hidden rounded-lg border border-line bg-white text-xs">
      {/* External preview from Wikimedia; imported copies are stored in our own storage. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={f.thumbUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className="aspect-[4/3] w-full bg-sand object-cover" />
      <div className="space-y-1 p-2">
        <p className="line-clamp-2 font-medium">{f.title}</p>
        <p className="text-muted">
          {f.license} · {f.artist} · {f.width}×{f.height}
        </p>
        <a href={f.descriptionUrl} target="_blank" rel="noopener noreferrer nofollow" className="underline">File page</a>
        {f.allowed ? (
          state.ok ? (
            <p className="font-semibold text-emerald-800">{state.message}</p>
          ) : (
            <form action={action} className="space-y-1 pt-1">
              <input type="hidden" name="pageId" value={f.pageId} />
              <label className="block font-medium">
                Alt text
                <input name="alt" required minLength={5} maxLength={200} defaultValue={f.description.slice(0, 200)} className={`${inputClass} h-8`} />
              </label>
              <button type="submit" className={`${buttonClass} h-8`} disabled={pending}>{pending ? "Importing…" : "Import"}</button>
              <Notice state={state} />
            </form>
          )
        ) : (
          <p className="font-medium text-red-800">Can’t import: {f.reason}</p>
        )}
      </div>
    </li>
  );
}

export function CommonsSearch({ placeId, defaultQuery }: { placeId: string; defaultQuery: string }) {
  const [query, setQuery] = useState(defaultQuery);
  const [files, setFiles] = useState<CommonsFile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const search = () =>
    start(async () => {
      setError(null);
      const r = await searchCommonsAction(query);
      if (r.ok) setFiles(r.files);
      else setError(r.message);
    });
  return (
    <details className="mt-4 rounded-lg border border-line p-3" id="commons">
      <summary className="cursor-pointer text-sm font-semibold">Find a free photo on Wikimedia Commons</summary>
      <p className="mt-2 text-xs text-muted">Only public-domain, CC0, CC BY and CC BY-SA photos can be imported. The author, licence and file page are saved and credited on the site.</p>
      <div className="mt-2 flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              search();
            }
          }}
          aria-label="Search Wikimedia Commons"
          maxLength={100}
          className={`${inputClass} mt-0`}
        />
        <button type="button" onClick={search} disabled={pending} className={secondaryButtonClass}>{pending ? "Searching…" : "Search"}</button>
      </div>
      {error ? <p className="mt-2 text-sm text-red-800">{error}</p> : null}
      {files ? (
        files.length ? (
          <ul className="mt-3 grid gap-3 sm:grid-cols-3">{files.map((f) => <Result key={f.pageId} placeId={placeId} f={f} />)}</ul>
        ) : (
          <p className="mt-2 text-sm text-muted">No photos found. Try another name.</p>
        )
      ) : null}
    </details>
  );
}
