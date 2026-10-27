import { Icon } from "@/components/icons/icon";
import type { PublishedSnapshot } from "@/lib/db/schema";
import { sectionDef } from "@/lib/places/sections";

type Section = PublishedSnapshot["sections"][number];

const paragraphs = (text: string | undefined) => (text ?? "").split(/\n{2,}/).filter((p) => p.trim());

/** Text paragraphs. */
export function TextBody({ s }: { s: Section }) {
  return (
    <div className="space-y-3 text-[1.0625rem] leading-relaxed text-[#444]">
      {paragraphs(s.body.text).map((p, i) => <p key={i}>{p}</p>)}
    </div>
  );
}

/** Highlights as a grid of cards. */
export function HighlightCards({ s }: { s: Section }) {
  return (
    <ul className="grid gap-3 @xl:grid-cols-2">
      {(s.body.items ?? []).map((it, i) => (
        <li key={i} className="flex gap-3 rounded-xl border border-line bg-white p-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-coral/10 text-coral"><Icon name="star" size={16} /></span>
          <p className="text-[0.9375rem] leading-relaxed text-[#444]">{it.title ? <strong className="text-ink">{it.title}. </strong> : null}{it.body}</p>
        </li>
      ))}
    </ul>
  );
}

/** A list with check marks (things to do, travel tips). */
export function CheckList({ s, columns = false }: { s: Section; columns?: boolean }) {
  return (
    <ul className={`grid gap-x-6 gap-y-2.5 ${columns ? "@xl:grid-cols-2" : ""}`}>
      {(s.body.items ?? []).map((it, i) => (
        <li key={i} className="flex gap-2.5 text-[0.9375rem] leading-relaxed text-[#444]">
          <Icon name="checkCircle" size={18} className="mt-0.5 shrink-0 text-coral" />
          <span>{it.title ? <strong className="text-ink">{it.title}: </strong> : null}{it.body}</span>
        </li>
      ))}
    </ul>
  );
}

/** Day-by-day plan as a timeline. */
export function DaysTimeline({ s }: { s: Section }) {
  const days = s.body.items ?? [];
  return (
    <ol className="relative space-y-5 before:absolute before:bottom-3 before:left-[0.4375rem] before:top-3 before:w-px before:bg-line">
      {days.map((d, i) => (
        <li key={i} className="relative flex gap-4">
          <span aria-hidden className="relative z-10 mt-1.5 size-[0.9375rem] shrink-0 rounded-full border-[3px] border-white bg-coral ring-1 ring-coral" />
          <div className="min-w-0">
            <p className="flex flex-wrap items-baseline gap-2">
              <span className="rounded-md bg-coral/10 px-2 py-0.5 text-xs font-semibold text-coral">Day {i + 1}</span>
              <span className="font-semibold text-ink">{(d.title ?? "").replace(/^day\s*\d+\s*[:.–-]\s*/i, "")}</span>
            </p>
            <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-[#555]">{d.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** FAQs as an accordion; answers stay in the page for search engines. */
export function FaqList({ s }: { s: Section }) {
  return (
    <div className="divide-y divide-line rounded-2xl border border-line bg-white">
      {(s.body.items ?? []).map((f, i) => (
        <details key={i} className="group px-5 py-4" open={i === 0}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink [&::-webkit-details-marker]:hidden">
            {f.title}
            <Icon name="chevronDown" size={18} className="shrink-0 text-muted transition-transform group-open:rotate-180" />
          </summary>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-[#555]">{f.body}</p>
        </details>
      ))}
    </div>
  );
}

/** Budget estimate table with its "estimates only" notice. */
export function BudgetTable({ s }: { s: Section }) {
  return (
    <div>
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">Estimates only — prices change. Check current rates before you travel.</p>
      {s.body.text ? <p className="mt-3 leading-relaxed text-muted">{s.body.text}</p> : null}
      <div className="mt-3 overflow-hidden rounded-xl border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#F7F5F0] text-xs uppercase tracking-wide text-muted">
            <tr><th className="px-4 py-2.5 font-semibold">Cost</th><th className="px-4 py-2.5 font-semibold">Estimate</th></tr>
          </thead>
          <tbody>
            {(s.body.items ?? []).map((it, i) => (
              <tr key={i} className="border-t border-line align-top">
                <td className="px-4 py-2.5 font-medium">{it.title}</td>
                <td className="px-4 py-2.5">{it.body}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Labelled details (visiting information, money, safety…). */
export function PairsList({ s }: { s: Section }) {
  return (
    <dl className="divide-y divide-line rounded-2xl border border-line bg-white">
      {(s.body.items ?? []).map((it, i) => (
        <div key={i} className="grid gap-1 px-5 py-3.5 @xl:grid-cols-[11rem_1fr] @xl:gap-4">
          <dt className="font-semibold text-ink">{it.title}</dt>
          <dd className="text-[0.9375rem] leading-relaxed text-[#555]">{it.body}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Renders any section by its shape (used for places shown inside their parent's page). */
export function SectionBody({ s }: { s: Section }) {
  const def = sectionDef(s.key);
  if (!def) return null;
  if (def.shape === "text") return <TextBody s={s} />;
  if (def.shape === "days") return <DaysTimeline s={s} />;
  if (def.shape === "budget") return <BudgetTable s={s} />;
  if (def.shape === "faq") return <FaqList s={s} />;
  if (def.shape === "pairs") return <PairsList s={s} />;
  return <CheckList s={s} />;
}
