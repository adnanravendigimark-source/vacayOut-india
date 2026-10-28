import { Icon } from "@/components/icons/icon";
import { StatusPill } from "@/components/place/section-body";
import type { GuideBody } from "@/lib/db/schema";

const paragraphs = (text: string | undefined) => (text ?? "").split(/\n{2,}/).filter((p) => p.trim());
export const guideAnchor = (i: number) => `g-${i + 1}`;

/** The body of a travel guide: intro, numbered sections and an optional checklist. React escapes all text. */
export function GuideArticle({ body }: { body: GuideBody }) {
  return (
    <div className="min-w-0 space-y-10">
      <p className="text-base leading-relaxed text-[#333]">{body.intro}</p>
      {body.sections.map((s, i) => (
        <section key={i} id={guideAnchor(i)} aria-labelledby={`${guideAnchor(i)}-h`} className="scroll-mt-24 space-y-4">
          <h2 id={`${guideAnchor(i)}-h`} className="flex items-baseline gap-3 font-serif text-[1.3rem] font-medium leading-tight text-ink">
            <span className="text-base font-semibold text-coral">{String(i + 1).padStart(2, "0")}</span>
            {s.heading}
          </h2>
          {paragraphs(s.text).map((p, j) => <p key={j} className="text-[0.9375rem] leading-[1.7] text-[#444]">{p}</p>)}
          {s.items?.length ? (
            <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
              {s.items.map((it, j) => (
                <li key={j} className="flex flex-col gap-1 px-5 py-3 transition-colors hover:bg-[#FBFAF7]">
                  {it.title ? <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">{it.title}<StatusPill status={it.status} /></p> : null}
                  <p className="text-sm leading-relaxed text-[#555]">{it.body}{!it.title && it.status ? <> <StatusPill status={it.status} className="ml-1 align-middle" /></> : null}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
      {body.checklist?.length ? (
        <section aria-labelledby="g-check-h" className="rounded-2xl border border-line bg-[#F1EEE7] p-6">
          <h2 id="g-check-h" className="font-serif text-xl font-medium text-ink">Checklist</h2>
          <ul className="mt-4 space-y-2.5">
            {body.checklist.map((c, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-[#444]"><Icon name="checkCircle" size={18} className="mt-0.5 shrink-0 text-coral" />{c}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
