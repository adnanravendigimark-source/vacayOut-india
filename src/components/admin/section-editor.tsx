"use client";

import { useActionState, useState } from "react";
import { idle } from "@/lib/admin/action-state";
import type { SectionBody, SectionSource } from "@/lib/db/schema";
import type { SectionShape } from "@/lib/places/sections";
import { reopenSectionAction, saveSectionAction } from "@/app/admin/(protected)/places/actions";
import { clearSectionSourcesAction } from "@/app/admin/(protected)/research/actions";
import { buttonClass, Notice, secondaryButtonClass, StatusBadge, textareaClass } from "./ui";

type Props = {
  placeId: string;
  sectionKey: string;
  label: string;
  help: string;
  shape: SectionShape;
  required: boolean;
  body: SectionBody | null;
  status: "draft" | "approved" | null;
  sources?: SectionSource[];
  /** Drafting controls and pending AI suggestion, rendered by the server page. */
  children?: React.ReactNode;
};

function FaqFields({ initial, labels = { title: "Question", body: "Answer", add: "Add question" } }: { initial: { title?: string; body: string }[]; labels?: { title: string; body: string; add: string } }) {
  const [rows, setRows] = useState(initial.length ? initial : [{ title: "", body: "" }]);
  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={i} className="rounded-lg border border-line p-3">
          <label className="text-xs font-medium text-muted" htmlFor={`q-${i}`}>{labels.title}</label>
          <input id={`q-${i}`} name="q" defaultValue={r.title} maxLength={500} className="mt-1 h-9 w-full rounded-md border border-line px-2 text-sm" />
          <label className="mt-2 block text-xs font-medium text-muted" htmlFor={`a-${i}`}>{labels.body}</label>
          <textarea id={`a-${i}`} name="a" defaultValue={r.body} rows={2} maxLength={2000} className="mt-1 w-full rounded-md border border-line px-2 py-1.5 text-sm" />
        </div>
      ))}
      <button type="button" onClick={() => setRows([...rows, { title: "", body: "" }])} className="text-sm font-semibold underline underline-offset-4">
        {labels.add}
      </button>
    </div>
  );
}

export function SectionEditor(p: Props) {
  const [state, action, pending] = useActionState(saveSectionAction.bind(null, p.placeId, p.sectionKey), idle);
  const items = p.body?.items ?? [];
  return (
    <section className="rounded-xl border border-line bg-white p-5" aria-labelledby={`sec-${p.sectionKey}`}>
      <div className="flex items-center gap-3">
        <h3 id={`sec-${p.sectionKey}`} className="font-semibold">
          {p.label}
          {p.required ? <span className="ml-1 text-xs font-normal text-muted">(required)</span> : null}
        </h3>
        <span className="ml-auto">{p.status ? <StatusBadge status={p.status} /> : <span className="text-xs text-muted">Empty</span>}</span>
      </div>
      <p className="mt-1 text-xs text-muted">{p.help}</p>
      {p.children ? <div className="mt-3 space-y-3">{p.children}</div> : null}
      <form action={action} className="mt-3 space-y-3">
        {p.shape === "text" ? (
          <textarea name="text" rows={6} maxLength={6000} defaultValue={p.body?.text ?? ""} aria-label={p.label} className={textareaClass} />
        ) : p.shape === "list" ? (
          <textarea name="items" rows={6} defaultValue={items.map((i) => i.body).join("\n")} aria-label={`${p.label}, one per line`} className={textareaClass} />
        ) : p.shape === "days" ? (
          <FaqFields initial={items} labels={{ title: "Day", body: "Plan", add: "Add day" }} />
        ) : p.shape === "budget" ? (
          <>
            <label className="block text-xs font-medium text-muted">
              Assumptions (who, how many days, travel style)
              <textarea name="text" rows={2} maxLength={1500} defaultValue={p.body?.text ?? ""} className={textareaClass} />
            </label>
            <FaqFields initial={items} labels={{ title: "Cost item", body: "Amount and what it’s based on", add: "Add cost line" }} />
          </>
        ) : (
          <FaqFields initial={items} />
        )}
        <Notice state={state} />
        <div className="flex flex-wrap gap-2">
          <button type="submit" name="intent" value="draft" disabled={pending} className={secondaryButtonClass}>Save draft</button>
          <button type="submit" name="intent" value="approve" disabled={pending} className={buttonClass}>Save & approve</button>
        </div>
      </form>
      {p.sources?.length ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
          <span>Sources shown on the page: {p.sources.map((s) => s.site).join(", ")}</span>
          <form action={clearSectionSourcesAction.bind(null, p.placeId, p.sectionKey)}>
            <button type="submit" className="font-semibold underline underline-offset-4">Remove sources</button>
          </form>
        </div>
      ) : null}
      {p.status === "approved" ? (
        <form action={reopenSectionAction.bind(null, p.placeId, p.sectionKey)} className="mt-2">
          <button type="submit" className="text-xs font-semibold text-muted underline underline-offset-4">Move back to draft</button>
        </form>
      ) : null}
    </section>
  );
}
