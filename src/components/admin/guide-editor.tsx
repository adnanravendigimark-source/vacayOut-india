"use client";

import { useActionState, useState, useTransition } from "react";
import { idle, type ActionState } from "@/lib/admin/action-state";
import { publishGuideAction, saveGuideAction, unpublishGuideAction } from "@/app/admin/(protected)/guides/actions";
import { TRIP_TYPES } from "@/lib/places/trip-types";
import { kindLabel } from "@/lib/places/kinds";
import { Notice, buttonClass, inputClass, secondaryButtonClass, textareaClass } from "./ui";

type Initial = { slug: string; title: string; summary: string; tripTypes: string[]; seoTitle: string; seoDescription: string; bodyJson: string; places: string[] };
type Option = { id: string; name: string; kind: string; status: string };

export function GuidePublishControls({ id, published }: { id: string; published: boolean }) {
  const [state, setState] = useState<ActionState>(idle);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={() => start(async () => setState(await publishGuideAction(id)))} className={buttonClass}>{published ? "Publish changes" : "Publish"}</button>
        {published ? <button type="button" disabled={pending} onClick={() => start(async () => setState(await unpublishGuideAction(id)))} className={secondaryButtonClass}>Unpublish</button> : null}
      </div>
      <Notice state={state} />
    </div>
  );
}

export function GuideEditor({ id, initial, options }: { id: string; initial: Initial; options: Option[] }) {
  const [state, action, pending] = useActionState(saveGuideAction.bind(null, id), idle);
  return (
    <form action={action} className="space-y-4 rounded-xl border border-line bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-xs font-medium text-muted">Title<input name="title" defaultValue={initial.title} maxLength={110} required className={inputClass} /></label>
        <label className="block text-xs font-medium text-muted">URL slug<input name="slug" defaultValue={initial.slug} maxLength={80} required className={inputClass} /></label>
      </div>
      <fieldset className="text-xs font-medium text-muted">
        <legend>Trip types</legend>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
          {TRIP_TYPES.map((t) => (
            <label key={t.key} className="flex items-center gap-1 text-sm text-ink"><input type="checkbox" name="tripTypes" value={t.key} defaultChecked={initial.tripTypes.includes(t.key)} /> {t.label}</label>
          ))}
        </div>
      </fieldset>
      <label className="block text-xs font-medium text-muted">Card summary<textarea name="summary" rows={2} maxLength={300} defaultValue={initial.summary} className={textareaClass} /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-xs font-medium text-muted">SEO title (max 70)<input name="seoTitle" defaultValue={initial.seoTitle} maxLength={70} className={inputClass} /></label>
        <label className="block text-xs font-medium text-muted">Meta description (max 170)<input name="seoDescription" defaultValue={initial.seoDescription} maxLength={170} className={inputClass} /></label>
      </div>
      <fieldset className="text-xs font-medium text-muted">
        <legend>Shown on these place pages</legend>
        <div className="mt-1 grid max-h-56 gap-1 overflow-y-auto rounded-lg border border-line p-2 sm:grid-cols-2">
          {options.map((o) => (
            <label key={o.id} className="flex items-center gap-1.5 text-sm text-ink">
              <input type="checkbox" name="places" value={o.id} defaultChecked={initial.places.includes(o.id)} /> {o.name} <span className="text-xs text-muted">· {kindLabel(o.kind)}{o.status === "published" ? "" : ` · ${o.status}`}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block text-xs font-medium text-muted">
        Body (JSON: intro, sections [heading, text and/or items], checklist)
        <textarea name="body" rows={22} defaultValue={initial.bodyJson} spellCheck={false} className={`${textareaClass} font-mono text-xs`} />
      </label>
      <Notice state={state} />
      <button type="submit" disabled={pending} className={buttonClass}>{pending ? "Saving…" : "Save draft"}</button>
      <p className="text-xs text-muted">Saving marks the guide as edited, so the content seed never overwrites it.</p>
    </form>
  );
}
