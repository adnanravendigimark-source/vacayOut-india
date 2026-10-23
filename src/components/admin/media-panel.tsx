"use client";

import Image from "next/image";
import { useActionState } from "react";
import { idle } from "@/lib/admin/action-state";
import { deleteImageAction, setHeroAction, updateMediaAction, uploadImageAction } from "@/app/admin/(protected)/places/actions";
import { buttonClass, inputClass, Notice } from "./ui";
import { CommonsSearch } from "./commons-search";

type Img = { id: string; url: string; alt: string; caption?: string | null; kind: "photo" | "ai_generated"; license: string; licenseUrl?: string | null; attribution: string | null; sourceUrl?: string | null };

function AltForm({ placeId, m }: { placeId: string; m: Img }) {
  const [state, action, pending] = useActionState(updateMediaAction.bind(null, placeId, m.id), idle);
  return (
    <details className="text-xs">
      <summary className="cursor-pointer font-semibold underline underline-offset-2">Edit alt text & caption</summary>
      <form action={action} className="mt-1 space-y-1">
        <input name="alt" defaultValue={m.alt} required minLength={5} maxLength={200} aria-label="Alt text" className="h-8 w-full rounded-md border border-line px-2" />
        <input name="caption" defaultValue={m.caption ?? ""} maxLength={300} placeholder="Caption (optional)" aria-label="Caption" className="h-8 w-full rounded-md border border-line px-2" />
        <button type="submit" disabled={pending} className="font-semibold underline">Save</button>
        <Notice state={state} />
      </form>
    </details>
  );
}

export function MediaPanel({ placeId, images, heroId, commonsQuery }: { placeId: string; images: Img[]; heroId: string | null; commonsQuery: string }) {
  const [state, action, pending] = useActionState(uploadImageAction.bind(null, placeId), idle);
  return (
    <section className="rounded-xl border border-line bg-white p-5" aria-labelledby="media-h">
      <h2 id="media-h" className="font-semibold">Images</h2>
      <p className="mt-1 text-xs text-muted">Prefer your own photos or free-licence images (e.g. Wikimedia Commons). Use AI-generated images only when no free photo exists; they are labelled on the site.</p>
      {images.length ? (
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {images.map((m) => (
            <li key={m.id} className="overflow-hidden rounded-lg border border-line">
              <div className="relative aspect-[4/3] bg-sand">
                <Image src={m.url} alt={m.alt} fill sizes="240px" className="object-cover" />
                {m.kind === "ai_generated" ? <span className="absolute left-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">AI-generated</span> : null}
              </div>
              <div className="space-y-1 p-2 text-xs">
                <p className="line-clamp-2">{m.alt}</p>
                <p className="text-muted">
                  {m.licenseUrl ? <a href={m.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline">{m.license}</a> : m.license}
                  {m.attribution ? ` · ${m.attribution}` : ""}
                  {m.sourceUrl ? <> · <a href={m.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="underline">source</a></> : null}
                </p>
                <AltForm placeId={placeId} m={m} />
                {m.id === heroId ? (
                  <p className="font-semibold text-emerald-800">Hero image</p>
                ) : (
                  <div className="flex gap-3">
                    <form action={setHeroAction.bind(null, placeId, m.id)}><button type="submit" className="font-semibold underline underline-offset-2">Use as hero</button></form>
                    <form action={deleteImageAction.bind(null, placeId, m.id)}><button type="submit" className="text-red-700 underline underline-offset-2">Delete</button></form>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      <CommonsSearch placeId={placeId} defaultQuery={commonsQuery} />
      <form action={action} className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="file" className="text-sm font-medium">Image (JPG, PNG or WebP, up to 5 MB)</label>
          <input id="file" name="file" type="file" accept="image/jpeg,image/png,image/webp" required className="mt-1 block w-full text-sm" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="alt" className="text-sm font-medium">Alt text (what the image shows)</label>
          <input id="alt" name="alt" required maxLength={200} className={inputClass} />
        </div>
        <div>
          <label htmlFor="kind" className="text-sm font-medium">Type</label>
          <select id="kind" name="kind" defaultValue="photo" className={inputClass}>
            <option value="photo">Real photograph</option>
            <option value="ai_generated">AI-generated illustration</option>
          </select>
        </div>
        <div>
          <label htmlFor="license" className="text-sm font-medium">Licence</label>
          <input id="license" name="license" required maxLength={100} placeholder="Own photo / CC BY-SA 4.0 / AI-generated" className={inputClass} />
        </div>
        <div>
          <label htmlFor="attribution" className="text-sm font-medium">Credit <span className="font-normal text-muted">(if the licence requires it)</span></label>
          <input id="attribution" name="attribution" maxLength={200} className={inputClass} />
        </div>
        <div>
          <label htmlFor="sourceUrl" className="text-sm font-medium">Source URL</label>
          <input id="sourceUrl" name="sourceUrl" type="url" maxLength={500} placeholder="https://commons.wikimedia.org/wiki/File:…" className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="caption" className="text-sm font-medium">Caption <span className="font-normal text-muted">(optional)</span></label>
          <input id="caption" name="caption" maxLength={300} className={inputClass} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Notice state={state} />
          <button type="submit" disabled={pending} className={buttonClass}>{pending ? "Uploading…" : "Upload image"}</button>
        </div>
      </form>
    </section>
  );
}
