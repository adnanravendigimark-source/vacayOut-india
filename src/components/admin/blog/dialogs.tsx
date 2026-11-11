"use client";

import { useRef, useState } from "react";
import { MediaLibraryModal, useImageUpload } from "./media";

const input = "w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-ink focus:ring-1 focus:ring-ink";

function Shell({ title, children, onClose }: { title: React.ReactNode; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {title}
        {children}
      </div>
    </div>
  );
}

/** Link dialog: URL, same/new tab, and nofollow for sponsored or affiliate links. */
export function LinkDialog({ initialUrl = "", onInsert, onRemove, onClose }: { initialUrl?: string; onInsert: (o: { url: string; nofollow: boolean; newTab: boolean }) => void; onRemove?: () => void; onClose: () => void }) {
  const [url, setUrl] = useState(initialUrl);
  const [nofollow, setNofollow] = useState(false);
  const [newTab, setNewTab] = useState(false);
  const insert = () => url.trim() && onInsert({ url: url.trim(), nofollow, newTab });
  return (
    <Shell title={<h3 className="text-base font-semibold text-ink">Insert link</h3>} onClose={onClose}>
      <p className="mt-1 text-sm text-muted">Paste a full address, or a site path for an internal link (e.g. /india/kerala). “https://” is added if you leave it off.</p>
      <input
        type="text"
        autoFocus
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            insert();
          }
        }}
        placeholder="example.com or /india/kerala"
        className={`mt-4 ${input}`}
      />
      <div className="mt-4">
        <span className="mb-1.5 block text-xs font-medium text-ink">Open link in</span>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-1.5"><input type="radio" name="link-target" checked={!newTab} onChange={() => setNewTab(false)} className="size-4 accent-coral" />Same tab</label>
          <label className="flex items-center gap-1.5"><input type="radio" name="link-target" checked={newTab} onChange={() => setNewTab(true)} className="size-4 accent-coral" />New tab</label>
        </div>
      </div>
      <label className="mt-3 flex items-start gap-2 text-sm">
        <input type="checkbox" checked={nofollow} onChange={(e) => setNofollow(e.target.checked)} className="mt-0.5 size-4 accent-coral" />
        <span>
          No follow
          <span className="block text-xs text-muted">Adds rel=&quot;nofollow&quot; — search engines don’t pass ranking credit through this link. Use it for sponsored, affiliate or untrusted links.</span>
        </span>
      </label>
      <div className="mt-5 flex items-center justify-between gap-2">
        {onRemove ? <button type="button" onClick={onRemove} className="rounded-lg border border-red-200 px-3.5 py-2 text-sm font-medium text-red-700 hover:bg-red-50">Remove link</button> : <span />}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-line px-4 py-2 text-sm font-semibold hover:bg-sand">Cancel</button>
          <button type="button" onClick={insert} disabled={!url.trim()} className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-60">Insert link</button>
        </div>
      </div>
    </Shell>
  );
}

export type ImageDialogData = { url: string; alt: string; caption: string };

/** Insert or edit an inline image: upload, Media Library or URL, plus alt text and caption. */
export function ImageDialog({ initial, onSave, onDelete, onClose }: { initial?: ImageDialogData; onSave: (d: ImageDialogData) => void; onDelete?: () => void; onClose: () => void }) {
  const editing = Boolean(initial);
  const [url, setUrl] = useState(initial?.url ?? "");
  const [alt, setAlt] = useState(initial?.alt ?? "");
  const [caption, setCaption] = useState(initial?.caption ?? "");
  const [library, setLibrary] = useState(false);
  const { upload, uploading, error, setError } = useImageUpload();
  const file = useRef<HTMLInputElement>(null);
  return (
    <Shell
      onClose={onClose}
      title={
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">{editing ? "Edit Image Details" : "Insert image"}</h3>
          {editing ? <span className="rounded-full bg-coral-soft px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-coral">Editing Image</span> : null}
        </div>
      }
    >
      <p className="mt-1 text-sm text-muted">{editing ? "Update the alt text (for SEO), caption, or replace the photo." : "Choose from the Media Library, upload a photo, or paste an image URL."}</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input type="text" value={url} onChange={(e) => setUrl(e.target.value.trim())} placeholder="https://… or upload a file" className={input} />
        <button type="button" onClick={() => setLibrary(true)} className="shrink-0 rounded-lg border border-line px-3 py-2 text-sm font-medium hover:bg-sand">Media Library</button>
        <button type="button" disabled={uploading} onClick={() => file.current?.click()} className="shrink-0 rounded-lg border border-line px-3 py-2 text-sm font-medium hover:bg-sand disabled:opacity-60">{uploading ? "Uploading…" : "Upload"}</button>
        <input
          ref={file}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            const u = await upload(f);
            if (u) setUrl(u);
          }}
        />
      </div>
      {error ? <p className="mt-1 text-xs text-red-700">{error}</p> : null}
      {url ? (
        <div className="mt-3 flex items-start gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Preview" className="h-28 min-w-0 flex-1 rounded-lg border border-line object-cover" />
          <button type="button" onClick={() => setUrl("")} className="shrink-0 whitespace-nowrap rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50">Change photo</button>
        </div>
      ) : null}
      <div className="mt-3">
        <label className="mb-1 block text-xs font-medium text-ink" htmlFor="img-alt">Alt text <span className="text-muted">(important for SEO &amp; Google Images)</span></label>
        <input id="img-alt" type="text" value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Describe what is shown (e.g. Houseboat on the Alleppey backwaters at dusk)" className={input} />
      </div>
      <div className="mt-3">
        <label className="mb-1 block text-xs font-medium text-ink" htmlFor="img-cap">Caption <span className="text-muted">(optional, shown under the image)</span></label>
        <input id="img-cap" type="text" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Shown under the photo — include the credit for licensed photos" className={input} />
      </div>
      <div className="mt-5 flex items-center justify-between gap-2">
        {editing && onDelete ? <button type="button" onClick={onDelete} className="rounded-lg border border-red-200 px-3.5 py-2 text-sm font-medium text-red-700 hover:bg-red-50">Remove from Article</button> : <span />}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-line px-4 py-2 text-sm font-medium hover:bg-sand">Cancel</button>
          <button
            type="button"
            disabled={!url || uploading}
            onClick={() => {
              if (!/^(https:\/\/|\/(?!\/))/.test(url)) {
                setError("Use an https:// image address, or upload the file.");
                return;
              }
              onSave({ url, alt, caption });
            }}
            className="rounded-lg bg-coral px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-coral-hover disabled:opacity-60"
          >
            {editing ? "Save changes" : "Insert image"}
          </button>
        </div>
      </div>
      {library ? (
        <MediaLibraryModal
          onClose={() => setLibrary(false)}
          onSelect={(img) => {
            setUrl(img.url);
            if (!alt) setAlt(img.alt);
            if (img.credit && !caption) setCaption(img.credit);
            setLibrary(false);
          }}
        />
      ) : null}
    </Shell>
  );
}
