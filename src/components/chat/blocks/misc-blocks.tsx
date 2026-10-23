import { Icon } from "@/components/icons/icon";
import type { BlockOf } from "@/lib/chat/schema";
import { BlockTitle } from "./shared";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LABEL = { best: "Best", good: "Good", avoid: "Not ideal" } as const;
const STYLE = {
  best: "bg-forest text-white",
  good: "bg-forest-soft text-forest",
  avoid: "bg-sand text-muted",
} as const;

export function TextBlock({ block }: { block: BlockOf<"text"> }) {
  return (
    <div className="space-y-2 text-[0.9375rem] leading-relaxed text-ink">
      {block.text.split(/\n{2,}/).map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

export function BestTimeBlock({ block }: { block: BlockOf<"bestTime"> }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4 shadow-[var(--shadow-card)]">
      <BlockTitle icon="calendar">When to visit {block.destination}</BlockTitle>
      <ol className="mt-3 grid grid-cols-6 gap-1.5 sm:grid-cols-12">
        {block.months.map((r, i) => (
          <li key={MONTHS[i]} className={`rounded-md py-2 text-center text-[0.75rem] font-semibold ${STYLE[r]}`}>
            {MONTHS[i]}
            <span className="sr-only">: {LABEL[r]}</span>
          </li>
        ))}
      </ol>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.75rem] text-muted">
        {(["best", "good", "avoid"] as const).map((r) => (
          <span key={r} className="flex items-center gap-1.5">
            <span aria-hidden className={`size-3 rounded-sm ${STYLE[r]}`} />
            {LABEL[r]}
          </span>
        ))}
        <span className="ml-auto font-medium text-ink">{block.summary}</span>
      </div>
    </div>
  );
}

export function FaqsBlock({ block }: { block: BlockOf<"faqs"> }) {
  return (
    <div className="rounded-2xl bg-sand p-4">
      <BlockTitle icon="chat">Good to know</BlockTitle>
      <div className="mt-3 grid items-start gap-2.5 md:grid-cols-2">
        {block.items.map((f) => (
          <details key={f.question} className="group rounded-lg border border-line bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[0.8125rem] font-medium text-ink [&::-webkit-details-marker]:hidden">
              {f.question}
              <Icon name="chevronDown" size={15} className="shrink-0 transition-transform group-open:rotate-180" />
            </summary>
            <p className="px-4 pb-3.5 text-[0.8125rem] leading-relaxed text-muted">{f.answer}</p>
          </details>
        ))}
      </div>
    </div>
  );
}

export function SuggestionsBlock({ block, onAsk, disabled }: { block: BlockOf<"suggestions">; onAsk: (q: string) => void; disabled: boolean }) {
  return (
    <ul aria-label="Suggested follow-ups" className="flex flex-wrap gap-2">
      {block.items.map((s) => (
        <li key={s}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onAsk(s)}
            className="inline-flex items-center gap-1.5 rounded-full border border-forest/25 bg-white px-3.5 py-1.5 text-[0.8125rem] font-medium text-forest transition-colors hover:border-forest hover:bg-forest-soft disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Icon name="sparkles" size={13} />
            {s}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function NoticeBlock({ block }: { block: BlockOf<"notice"> }) {
  const warn = block.tone === "warning";
  return (
    <p role="note" className={`flex gap-2 rounded-xl px-4 py-3 text-[0.875rem] leading-relaxed ${warn ? "bg-amber-50 text-amber-950" : "bg-forest-soft text-forest"}`}>
      <Icon name={warn ? "shield" : "checkCircle"} size={17} className="mt-0.5 shrink-0" />
      <span>{block.text}</span>
    </p>
  );
}

/** Sources are rendered as plain links: our guide pages, then web pages (nofollow, new tab). */
export function SourcesBlock({ block }: { block: BlockOf<"sources"> }) {
  const safe = (u: string) => /^https?:\/\//.test(u);
  return (
    <div className="rounded-xl border border-line bg-white px-4 py-3 text-[0.8125rem]">
      <p className="font-semibold text-ink">Sources</p>
      <ul className="mt-1.5 space-y-1">
        {block.guides.map((g) => (
          <li key={g.href} className="flex gap-2">
            <span className="rounded bg-forest-soft px-1.5 text-[0.6875rem] font-semibold text-forest">Guide</span>
            <a href={g.href} className="underline underline-offset-2">VacayOut guide: {g.name}</a>
          </li>
        ))}
        {block.web.filter((w) => safe(w.url)).map((w) => (
          <li key={w.url} className="flex flex-wrap gap-x-2">
            <span className="rounded bg-sand px-1.5 text-[0.6875rem] font-semibold text-muted">Web</span>
            <a href={w.url} target="_blank" rel="nofollow noopener noreferrer" className="underline underline-offset-2">{w.title}</a>
            <span className="text-muted">{w.site} · retrieved {w.retrieved}</span>
          </li>
        ))}
      </ul>
      {block.note ? <p className="mt-1.5 text-[0.75rem] text-muted">{block.note}</p> : null}
    </div>
  );
}
