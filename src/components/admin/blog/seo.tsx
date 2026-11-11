"use client";

import { site } from "@/lib/site";
import { ImageField } from "./image-field";

/** SEO helpers for the blog editor: character counter, Google and social previews, and the shared SEO card. */

const domain = site.url.replace(/^https?:\/\//, "").replace(/\/$/, "");

export const fieldInput = "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-ink focus:ring-1 focus:ring-ink";
export const fieldLabel = "mb-1 block text-sm font-medium text-ink";
export const fieldHint = "mt-1 text-xs text-muted";

/** Turns green inside the recommended range, amber when short, red when it will be cut off. */
export function CharCounter({ length, min, max }: { length: number; min: number; max: number }) {
  let color = "text-muted";
  let note = `Recommended: ${min}–${max} characters`;
  if (length > 0 && length < min) {
    color = "text-amber-700";
    note = `${min - length} more characters recommended`;
  } else if (length >= min && length <= max) {
    color = "text-emerald-700";
    note = "Good length";
  } else if (length > max) {
    color = "text-red-700";
    note = `${length - max} characters over — may get cut off`;
  }
  return (
    <p className={`mt-1 text-xs ${color}`}>
      {length} characters · {note}
    </p>
  );
}

export function SeoPreview({ title, description, path }: { title: string; description: string; path: string }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">Google Preview</p>
      <p className="truncate text-sm text-ink/70">
        {domain}
        {path === "/" ? "" : path}
      </p>
      <p className="mt-0.5 truncate text-lg text-[#1a0dab]">{title || "Untitled page"}</p>
      <p className="mt-1 line-clamp-2 text-sm text-[#4d5156]">
        {description || "No meta description set yet — Google will generate one from the page content, which you can’t control."}
      </p>
    </div>
  );
}

export function SocialPreview({ title, description, image }: { title: string; description: string; image?: string }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">Social Share Preview</p>
      <div className="overflow-hidden rounded-lg border border-line">
        <div className="aspect-[1.91/1] w-full bg-sand">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted">No image set — a plain link preview will show instead</div>
          )}
        </div>
        <div className="bg-canvas p-3">
          <p className="truncate text-[11px] uppercase tracking-wide text-muted">{domain}</p>
          <p className="mt-0.5 truncate text-sm font-semibold text-ink">{title || "Untitled page"}</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted">{description || "No description set."}</p>
        </div>
      </div>
    </div>
  );
}

export type SeoFieldsValue = {
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl: string;
  noIndex: boolean;
  noFollow: boolean;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
};

/** Canonical, indexing and Open Graph controls — the same card for a post and for the /blog page. */
export function SeoFieldsCard({
  value,
  onChange,
  showMeta = false,
  pathHint,
}: {
  value: SeoFieldsValue;
  onChange: (patch: Partial<SeoFieldsValue>) => void;
  showMeta?: boolean;
  pathHint?: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-white p-6">
      <p className="font-semibold text-ink">Search Engine Optimization (SEO)</p>
      <p className="mt-0.5 text-xs text-muted">Controls exactly what Google and social platforms see for this page — title, description, canonical URL, indexing and social share preview.</p>
      <div className="mt-5 space-y-5">
        {showMeta ? (
          <>
            <div>
              <label className={fieldLabel} htmlFor="seo-meta-title">SEO Title</label>
              <input id="seo-meta-title" value={value.metaTitle ?? ""} onChange={(e) => onChange({ metaTitle: e.target.value })} className={fieldInput} placeholder="Shown in Google search results and the browser tab" />
              <CharCounter length={(value.metaTitle ?? "").length} min={40} max={60} />
            </div>
            <div>
              <label className={fieldLabel} htmlFor="seo-meta-desc">Meta Description</label>
              <textarea id="seo-meta-desc" rows={2} value={value.metaDescription ?? ""} onChange={(e) => onChange({ metaDescription: e.target.value })} className={fieldInput} placeholder="Shown under the title in Google search results (~155 characters)" />
              <CharCounter length={(value.metaDescription ?? "").length} min={120} max={158} />
            </div>
          </>
        ) : null}

        <div>
          <label className={fieldLabel} htmlFor="seo-canonical">Canonical URL (optional)</label>
          <input id="seo-canonical" value={value.canonicalUrl} onChange={(e) => onChange({ canonicalUrl: e.target.value })} className={fieldInput} placeholder={pathHint ? `Leave blank to auto-generate: ${pathHint}` : "Leave blank to auto-generate from the page’s URL"} />
        </div>

        <div className="rounded-xl border border-line bg-canvas p-4">
          <p className="text-sm font-semibold text-ink">Search Engine Indexing &amp; Link Following</p>
          <p className="mt-0.5 text-xs text-muted">
            Currently <span className={value.noIndex ? "font-medium text-amber-700" : "font-medium text-emerald-700"}>{value.noIndex ? "noindex" : "index"}</span>,{" "}
            <span className={value.noFollow ? "font-medium text-amber-700" : "font-medium text-emerald-700"}>{value.noFollow ? "nofollow" : "follow"}</span>.
          </p>
          <div className="mt-3 flex flex-wrap gap-5 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={value.noIndex} onChange={(e) => onChange({ noIndex: e.target.checked })} className="size-4 accent-coral" />
              Hide from Google (noindex)
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={value.noFollow} onChange={(e) => onChange({ noFollow: e.target.checked })} className="size-4 accent-coral" />
              Don’t follow links (nofollow)
            </label>
          </div>
          {value.noIndex ? <p className="mt-2 text-xs text-amber-800">This page is also left out of the sitemap.</p> : null}
        </div>

        <div className="border-t border-line pt-5">
          <p className="text-sm font-semibold text-ink">Open Graph &amp; Twitter/X Preview</p>
          <p className="mt-0.5 text-xs text-muted">Used when this page is shared on Facebook, WhatsApp, iMessage, X, etc. Leave blank to fall back to the page’s own title, description and image.</p>
          <div className="mt-4 space-y-4">
            <div>
              <label className={fieldLabel} htmlFor="seo-og-title">Social Title (optional)</label>
              <input id="seo-og-title" value={value.ogTitle} onChange={(e) => onChange({ ogTitle: e.target.value })} className={fieldInput} />
            </div>
            <div>
              <label className={fieldLabel} htmlFor="seo-og-desc">Social Description (optional)</label>
              <textarea id="seo-og-desc" rows={2} value={value.ogDescription} onChange={(e) => onChange({ ogDescription: e.target.value })} className={fieldInput} />
            </div>
            <ImageField label="Social Share Image (optional)" value={value.ogImage} onChange={(url) => onChange({ ogImage: url })} aspect="aspect-[1.91/1]" />
          </div>
        </div>
      </div>
    </div>
  );
}
