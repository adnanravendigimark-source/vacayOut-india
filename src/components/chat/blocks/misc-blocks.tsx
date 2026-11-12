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

/** **bold** → <strong>; everything else stays plain text (no HTML is ever parsed). */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) => (p.startsWith("**") && p.endsWith("**") && p.length > 4 ? <strong key={i} className="font-semibold">{p.slice(2, -2)}</strong> : p))}
    </>
  );
}

/** Short paragraphs, and "- " / "1." lines as a compact list. */
export function TextBlock({ block }: { block: BlockOf<"text"> }) {
  const groups: { list: boolean; lines: string[] }[] = [];
  for (const raw of block.text.split("\n")) {
    const line = raw.trim();
    if (!line) {
      groups.push({ list: false, lines: [] });
      continue;
    }
    const item = line.match(/^(?:[-•*]|\d+[.)])\s+(.*)$/);
    const last = groups[groups.length - 1];
    if (item) {
      if (last?.list) last.lines.push(item[1]);
      else groups.push({ list: true, lines: [item[1]] });
    } else if (last && !last.list && last.lines.length) last.lines.push(line);
    else groups.push({ list: false, lines: [line] });
  }
  return (
    <div className="space-y-2 text-[0.9375rem] leading-relaxed text-ink">
      {groups.filter((g) => g.lines.length).map((g, i) =>
        g.list ? (
          <ul key={i} className="space-y-1 pl-1">
            {g.lines.map((l, j) => (
              <li key={j} className="flex gap-2">
                <span aria-hidden className="mt-[0.6rem] size-1.5 shrink-0 rounded-full bg-coral" />
                <span><Inline text={l} /></span>
              </li>
            ))}
          </ul>
        ) : (
          <p key={i}><Inline text={g.lines.join(" ")} /></p>
        ),
      )}
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

/** Sources: one small expandable line. Guides first, then web pages (nofollow, new tab). */
export function SourcesBlock({ block }: { block: BlockOf<"sources"> }) {
  const safe = (u: string) => /^https?:\/\//.test(u);
  const web = block.web.filter((w) => safe(w.url));
  const count = block.guides.length + web.length;
  if (!count) return null;
  return (
    <details className="group text-[0.75rem] text-muted">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 hover:text-ink [&::-webkit-details-marker]:hidden">
        <Icon name="book" size={13} />
        {count} {count === 1 ? "source" : "sources"}
        <Icon name="chevronDown" size={12} className="transition-transform group-open:rotate-180" />
      </summary>
      <ul className="mt-1.5 space-y-1 pl-4">
        {block.guides.map((g) => (
          <li key={g.href}>
            <a href={g.href} className="underline underline-offset-2 hover:text-ink">VacayOut guide: {g.name}</a>
          </li>
        ))}
        {web.map((w) => (
          <li key={w.url}>
            <a href={w.url} target="_blank" rel="nofollow noopener noreferrer" className="underline underline-offset-2 hover:text-ink">{w.title}</a> · {w.site} · {w.retrieved}
          </li>
        ))}
      </ul>
      {block.note ? <p className="mt-1 pl-4">{block.note}</p> : null}
    </details>
  );
}
