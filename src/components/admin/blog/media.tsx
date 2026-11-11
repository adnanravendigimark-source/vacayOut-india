"use client";

import { useEffect, useRef, useState } from "react";
import { listLibraryImagesAction, uploadBlogImageAction, type LibraryImage } from "@/app/admin/(protected)/blog/actions";

/** Upload helper shared by the hero field and the inline-image dialog. */
export function useImageUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  async function upload(file: File): Promise<string | null> {
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await uploadBlogImageAction(fd);
      if (!r.ok || !r.url) {
        setError(r.message);
        return null;
      }
      return r.url;
    } catch {
      setError("Upload failed. Please try again.");
      return null;
    } finally {
      setUploading(false);
    }
  }
  return { upload, uploading, error, setError };
}

/** Pick an existing destination photo. Licensed photos come with the credit line they must keep. */
export function MediaLibraryModal({ onSelect, onClose }: { onSelect: (img: LibraryImage) => void; onClose: () => void }) {
  const [items, setItems] = useState<LibraryImage[] | null>(null);
  const [q, setQ] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    listLibraryImagesAction()
      .then((r) => alive && setItems(r))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);
  const shown = (items ?? []).filter((i) => !q.trim() || i.alt.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Media Library" className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-ink">Media Library</h3>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-sand" aria-label="Close">✕</button>
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by description…" className="mt-3 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-ink" />
        <div className="mt-3 min-h-40 overflow-y-auto">
          {failed ? <p className="p-6 text-center text-sm text-red-700">Couldn’t load the library.</p> : null}
          {!items && !failed ? <p className="p-6 text-center text-sm text-muted">Loading…</p> : null}
          {items && !shown.length ? <p className="p-6 text-center text-sm text-muted">No photos found.</p> : null}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {shown.map((img) => (
              <button key={img.url} type="button" onClick={() => onSelect(img)} className="group overflow-hidden rounded-lg border border-line text-left hover:border-ink">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.alt} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                <span className="line-clamp-2 block px-2 py-1.5 text-[11px] text-muted">{img.alt}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Image URL field with Upload, Media Library, preview and remove — for the hero and social images. */
export function ImagePicker({ value, onChange, aspect = "aspect-[21/9]", onCredit }: { value: string; onChange: (url: string) => void; aspect?: string; onCredit?: (credit: string | null, alt: string) => void }) {
  const { upload, uploading, error } = useImageUpload();
  const input = useRef<HTMLInputElement>(null);
  const [library, setLibrary] = useState(false);
  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input value={value} onChange={(e) => onChange(e.target.value.trim())} placeholder="https://… or upload a file" className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-ink" />
        <button type="button" onClick={() => setLibrary(true)} className="shrink-0 rounded-lg border border-line px-3 py-2 text-sm font-medium hover:bg-sand">Media Library</button>
        <button type="button" disabled={uploading} onClick={() => input.current?.click()} className="shrink-0 rounded-lg border border-line px-3 py-2 text-sm font-medium hover:bg-sand disabled:opacity-60">
          {uploading ? "Uploading…" : "Upload"}
        </button>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            const url = await upload(f);
            if (url) onChange(url);
          }}
        />
      </div>
      {error ? <p className="mt-1 text-xs text-red-700">{error}</p> : null}
      {value ? (
        <div className="mt-3 flex items-start gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Preview" className={`${aspect} max-h-48 min-w-0 flex-1 rounded-lg border border-line object-cover`} />
          <button type="button" onClick={() => onChange("")} className="shrink-0 whitespace-nowrap rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50">Remove</button>
        </div>
      ) : null}
      {library ? (
        <MediaLibraryModal
          onClose={() => setLibrary(false)}
          onSelect={(img) => {
            onChange(img.url);
            onCredit?.(img.credit, img.alt);
            setLibrary(false);
          }}
        />
      ) : null}
    </div>
  );
}
