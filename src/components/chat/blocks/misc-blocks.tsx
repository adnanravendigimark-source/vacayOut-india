import { Icon } from "@/components/icons/icon";
import type { BlockOf } from "@/lib/chat/schema";
import { BlockTitle } from "./shared";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LABEL = { best: "Best", good: "Good", avoid: "Not ideal" } as const;
// Neutral scale (not colour alone: each month also has a text label for screen readers and the legend).
const STYLE = {
  best: "bg-ink text-white",
  good: "border border-[#BDB7AD] bg-white text-ink",
  avoid: "bg-sand text-[#767676]",
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
                <span aria-hidden className="mt-[0.6rem] size-1.5 shrink-0 rounded-full bg-[#B5AFA5]" />
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
    <section className="rounded-2xl border border-line bg-white p-4 sm:p-5" aria-label={`When to visit ${block.destination}`}>
      <BlockTitle icon="calendar">When to visit {block.destination}</BlockTitle>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink">{block.summary}</p>
      <ol className="mt-3 grid grid-cols-6 gap-1.5 sm:grid-cols-12">
        {block.months.map((r, i) => (
          <li key={MONTHS[i]} className={`rounded-lg py-1.5 text-center text-[0.75rem] font-semibold ${STYLE[r]}`}>
            {MONTHS[i]}
            <span className="sr-only">: {LABEL[r]}</span>
          </li>
        ))}
      </ol>
      <p aria-hidden className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[0.75rem] text-[#666666]">
        {(["best", "good", "avoid"] as const).map((r) => (
          <span key={r} className="inline-flex items-center gap-1.5">
            <span className={`size-3 rounded-sm ${STYLE[r]}`} />
            {LABEL[r]}
          </span>
        ))}
      </p>
    </section>
  );
}

export function FaqsBlock({ block }: { block: BlockOf<"faqs"> }) {
  return (
    <div className="rounded-2xl bg-[#FBFAF8] p-4">
      <BlockTitle icon="chat">Common questions</BlockTitle>
      <div className="mt-3 grid items-start gap-2.5 md:grid-cols-2">
        {block.items.map((f) => (
          <details key={f.question} className="group rounded-xl border border-line bg-white">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 text-[0.9375rem] font-medium text-ink [&::-webkit-details-marker]:hidden">
              {f.question}
              <Icon name="chevronDown" size={15} className="shrink-0 transition-transform group-open:rotate-180" />
            </summary>
            <p className="px-4 pb-3.5 text-[0.9375rem] leading-relaxed text-[#555555]">{f.answer}</p>
          </details>
        ))}
      </div>
    </div>
  );
}

export function SuggestionsBlock({ block, onAsk, disabled }: { block: BlockOf<"suggestions">; onAsk: (q: string) => void; disabled: boolean }) {
  return (
    <ul aria-label="Ask next" className="flex flex-wrap gap-2">
      {block.items.map((s) => (
        <li key={s}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onAsk(s)}
            className="group inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-1.5 text-left text-[0.8125rem] font-medium leading-snug text-ink transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {s}
            <Icon name="arrowRight" size={13} className="shrink-0 text-[#767676] transition-transform group-enabled:group-hover:translate-x-0.5" />
          </button>
        </li>
      ))}
    </ul>
  );
}

export function NoticeBlock({ block }: { block: BlockOf<"notice"> }) {
  const warn = block.tone === "warning";
  return (
    <p role="note" className={`flex gap-2.5 rounded-2xl border px-4 py-3 text-[0.9375rem] leading-relaxed ${warn ? "border-amber-200 bg-amber-50 text-amber-950" : "border-line bg-[#FBFAF8] text-ink"}`}>
      <Icon name={warn ? "shield" : "checkCircle"} size={17} className={`mt-0.5 shrink-0 ${warn ? "text-amber-700" : "text-[#666666]"}`} />
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
    <details className="group text-[0.8125rem] text-[#666666]">
      <summary className="inline-flex min-h-8 cursor-pointer list-none items-center gap-1.5 hover:text-ink [&::-webkit-details-marker]:hidden">
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
