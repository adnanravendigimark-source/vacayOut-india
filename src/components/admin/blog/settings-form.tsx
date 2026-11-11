"use client";

import { useState, useTransition } from "react";
import { saveBlogSettingsAction } from "@/app/admin/(protected)/blog/actions";
import type { BlogSettings } from "@/lib/blog/settings";
import { ImageField } from "./image-field";
import { fieldHint, fieldInput, fieldLabel, SeoFieldsCard, SeoPreview } from "./seo";

type TextKey = { [K in keyof BlogSettings]: BlogSettings[K] extends string ? K : never }[keyof BlogSettings];

const COPY: { key: TextKey; label: string; long?: boolean }[] = [
  { key: "eyebrow", label: "Hero eyebrow (small label above the heading)" },
  { key: "heading", label: "Hero heading (H1)" },
  { key: "subheading", label: "Hero text", long: true },
  { key: "listHeading", label: "Article list heading" },
  { key: "listSubheading", label: "Article list text" },
  { key: "emptyStateText", label: "Text shown when there are no posts" },
  { key: "quickAnswerLabel", label: "Quick Answer box label (on articles)" },
  { key: "tocLabel", label: "Table of contents label (on articles)" },
];

const CTA: { key: TextKey; label: string; long?: boolean }[] = [
  { key: "ctaHeading", label: "Heading" },
  { key: "ctaBody", label: "Body text", long: true },
  { key: "ctaButtonText", label: "Button text" },
  { key: "ctaButtonHref", label: "Button link" },
];

/** Settings for /blog. A blank text field shows the default (shown as the placeholder). */
export function BlogSettingsForm({ stored, defaults }: { stored: Partial<BlogSettings>; defaults: BlogSettings }) {
  const [s, setS] = useState<BlogSettings>(() => {
    const out = { ...defaults } as BlogSettings;
    for (const k of Object.keys(defaults) as (keyof BlogSettings)[]) {
      const v = stored[k];
      (out as Record<string, unknown>)[k] = typeof defaults[k] === "boolean" ? Boolean(v) : typeof v === "string" ? v : "";
    }
    return out;
  });
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [saving, start] = useTransition();
  const set = (patch: Partial<BlogSettings>) => {
    setS((x) => ({ ...x, ...patch }));
    setMsg(null);
  };
  const text = ({ key, label, long }: { key: TextKey; label: string; long?: boolean }) => (
    <div key={key}>
      <label className={fieldLabel} htmlFor={`bs-${key}`}>{label}</label>
      {long ? (
        <textarea id={`bs-${key}`} rows={2} value={s[key]} placeholder={defaults[key]} onChange={(e) => set({ [key]: e.target.value } as Partial<BlogSettings>)} className={fieldInput} />
      ) : (
        <input id={`bs-${key}`} value={s[key]} placeholder={defaults[key]} onChange={(e) => set({ [key]: e.target.value } as Partial<BlogSettings>)} className={fieldInput} />
      )}
    </div>
  );
  return (
    <form
      className="max-w-4xl space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => setMsg(await saveBlogSettingsAction(s)));
      }}
    >
      {msg ? <p role="status" className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"}`}>{msg.message}</p> : null}
      <div className="rounded-2xl border border-line bg-white p-6">
        <p className="font-semibold text-ink">Page copy</p>
        <p className="mt-0.5 text-xs text-muted">Leave a field blank to use the default shown in grey.</p>
        <div className="mt-4 space-y-5">
          {COPY.map(text)}
          <ImageField label="Hero background image (optional)" value={s.heroImage} onChange={(url) => set({ heroImage: url })} hint="Shown faded behind the hero text." />
          <div>
            <label className={fieldLabel} htmlFor="bs-heroImageAlt">Hero image alt text</label>
            <input id="bs-heroImageAlt" value={s.heroImageAlt} onChange={(e) => set({ heroImageAlt: e.target.value })} className={fieldInput} />
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-line bg-white p-6">
        <p className="font-semibold text-ink">Sidebar call-to-action</p>
        <p className="mt-0.5 text-xs text-muted">The promo card in the blog sidebar (listing and articles).</p>
        <div className="mt-4 space-y-5">{CTA.map(text)}</div>
        <p className={fieldHint}>Button link: a site path like /chat or a full https:// URL.</p>
      </div>
      <SeoFieldsCard showMeta pathHint="/blog" value={s} onChange={(patch) => set(patch)} />
      <SeoPreview title={s.metaTitle || defaults.metaTitle} description={s.metaDescription || defaults.metaDescription} path="/blog" />
      <div className="border-t border-line pt-5">
        <button type="submit" disabled={saving} className="rounded-lg bg-coral px-5 py-2.5 text-sm font-semibold text-white hover:bg-coral-hover disabled:opacity-60">{saving ? "Saving…" : "Save Changes"}</button>
      </div>
    </form>
  );
}
