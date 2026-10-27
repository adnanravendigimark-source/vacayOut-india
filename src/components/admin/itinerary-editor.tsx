"use client";

import { useActionState, useState, useTransition } from "react";
import { idle, type ActionState } from "@/lib/admin/action-state";
import { publishItineraryAction, saveItineraryAction, unpublishItineraryAction } from "@/app/admin/(protected)/itineraries/actions";
import { TRIP_TYPES } from "@/lib/places/trip-types";
import { Notice, buttonClass, inputClass, secondaryButtonClass, textareaClass } from "./ui";

type Initial = {
  slug: string;
  title: string;
  summary: string;
  durationDays: number;
  tripTypes: string[];
  seoTitle: string;
  seoDescription: string;
  planJson: string;
};

export function ItineraryPublishControls({ id, published }: { id: string; published: boolean }) {
  const [state, setState] = useState<ActionState>(idle);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={() => start(async () => setState(await publishItineraryAction(id)))} className={buttonClass}>
          {published ? "Publish changes" : "Publish"}
        </button>
        {published ? (
          <button type="button" disabled={pending} onClick={() => start(async () => setState(await unpublishItineraryAction(id)))} className={secondaryButtonClass}>Unpublish</button>
        ) : null}
      </div>
      <Notice state={state} />
    </div>
  );
}

export function ItineraryEditor({ id, initial }: { id: string; initial: Initial }) {
  const [state, action, pending] = useActionState(saveItineraryAction.bind(null, id), idle);
  return (
    <form action={action} className="space-y-4 rounded-xl border border-line bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-xs font-medium text-muted">Title<input name="title" defaultValue={initial.title} maxLength={100} required className={inputClass} /></label>
        <label className="block text-xs font-medium text-muted">URL slug<input name="slug" defaultValue={initial.slug} maxLength={80} required className={inputClass} /></label>
        <label className="block text-xs font-medium text-muted">Days<input name="durationDays" type="number" min={1} max={21} defaultValue={initial.durationDays} required className={inputClass} /></label>
        <fieldset className="text-xs font-medium text-muted">
          <legend>Trip types</legend>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
            {TRIP_TYPES.map((t) => (
              <label key={t.key} className="flex items-center gap-1 text-sm text-ink"><input type="checkbox" name="tripTypes" value={t.key} defaultChecked={initial.tripTypes.includes(t.key)} /> {t.label}</label>
            ))}
          </div>
        </fieldset>
      </div>
      <label className="block text-xs font-medium text-muted">Card summary<textarea name="summary" rows={2} maxLength={300} defaultValue={initial.summary} className={textareaClass} /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-xs font-medium text-muted">SEO title (max 70)<input name="seoTitle" defaultValue={initial.seoTitle} maxLength={70} className={inputClass} /></label>
        <label className="block text-xs font-medium text-muted">Meta description (max 170)<input name="seoDescription" defaultValue={initial.seoDescription} maxLength={170} className={inputClass} /></label>
      </div>
      <label className="block text-xs font-medium text-muted">
        Plan (JSON: overview, days, budget, booking, alternatives, tips)
        <textarea name="plan" rows={22} defaultValue={initial.planJson} spellCheck={false} className={`${textareaClass} font-mono text-xs`} />
      </label>
      <Notice state={state} />
      <button type="submit" disabled={pending} className={buttonClass}>{pending ? "Saving…" : "Save draft"}</button>
      <p className="text-xs text-muted">Saving marks the itinerary as edited, so the content seed never overwrites it.</p>
    </form>
  );
}
