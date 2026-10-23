"use client";

import { useState, useTransition } from "react";
import { idle, type ActionState } from "@/lib/admin/action-state";
import type { SectionBody, SectionSource } from "@/lib/db/schema";
import { applySuggestionAction, discardSuggestionAction } from "@/app/admin/(protected)/research/actions";
import { Notice, secondaryButtonClass, buttonClass } from "../ui";

export type SuggestionView = {
  id: string;
  shape: "text" | "list" | "faq" | "days" | "budget" | "details";
  body: SectionBody | { summary: string; seoTitle: string; seoDescription: string };
  sources: SectionSource[];
  notes: string | null;
  createdAt: string;
};

function Preview({ s }: { s: SuggestionView }) {
  if (s.shape === "details") {
    const d = s.body as { summary: string; seoTitle: string; seoDescription: string };
    return (
      <dl className="space-y-1 text-sm">
        <div><dt className="inline font-semibold">Summary: </dt><dd className="inline">{d.summary || "— (kept as is)"}</dd></div>
        <div><dt className="inline font-semibold">SEO title ({d.seoTitle.length}): </dt><dd className="inline">{d.seoTitle || "— (kept as is)"}</dd></div>
        <div><dt className="inline font-semibold">Meta description ({d.seoDescription.length}): </dt><dd className="inline">{d.seoDescription || "— (kept as is)"}</dd></div>
      </dl>
    );
  }
  const b = s.body as SectionBody;
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {b.text ? b.text.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>) : null}
      {b.items?.length ? (
        s.shape === "list" ? (
          <ul className="list-disc space-y-1 pl-5">{b.items.map((it, i) => <li key={i}>{it.body}</li>)}</ul>
        ) : (
          <dl className="space-y-2">{b.items.map((it, i) => <div key={i}><dt className="font-semibold">{it.title}</dt><dd className="text-muted">{it.body}</dd></div>)}</dl>
        )
      ) : null}
    </div>
  );
}

export function SuggestionCard({ s, replaces }: { s: SuggestionView; replaces: string }) {
  const [state, setState] = useState<ActionState>(idle);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<ActionState>) => start(async () => setState(await fn()));
  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50/60 p-4" aria-label="AI draft suggestion">
      <p className="text-xs font-semibold uppercase tracking-wide text-sky-900">AI draft from approved facts · {s.createdAt}</p>
      <div className="mt-2"><Preview s={s} /></div>
      {s.sources.length ? (
        <p className="mt-2 text-xs text-muted">
          Sources: {s.sources.map((src, i) => (
            <span key={src.url}>{i ? ", " : ""}<a href={src.url} target="_blank" rel="noopener noreferrer nofollow" className="underline">{src.site}</a></span>
          ))}
        </p>
      ) : null}
      {s.notes ? <p className="mt-1 whitespace-pre-line text-xs text-amber-900">{s.notes}</p> : null}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" className={`${buttonClass} h-8`} disabled={pending} onClick={() => run(() => applySuggestionAction(s.id))}>Use this draft</button>
        <button type="button" className={`${secondaryButtonClass} h-8`} disabled={pending} onClick={() => run(() => discardSuggestionAction(s.id))}>Discard</button>
        <span className="text-xs text-muted">{replaces}</span>
      </div>
      <div className="mt-2"><Notice state={state} /></div>
    </div>
  );
}
