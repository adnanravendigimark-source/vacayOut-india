import { Icon } from "@/components/icons/icon";
import { StatusPill } from "@/components/place/section-body";
import type { GuideBody } from "@/lib/db/schema";

const paragraphs = (text: string | undefined) => (text ?? "").split(/\n{2,}/).filter((p) => p.trim());
export const guideAnchor = (i: number) => `g-${i + 1}`;

/** The body of a travel guide: intro, numbered sections and an optional checklist. React escapes all text. */
export function GuideArticle({ body }: { body: GuideBody }) {
  return (
    <div className="min-w-0 space-y-12">
      <p className="border-l-[3px] border-coral pl-5 font-serif text-[1.1875rem] leading-relaxed text-ink sm:text-[1.3125rem]">{body.intro}</p>
      {body.sections.map((s, i) => (
        <section key={i} id={guideAnchor(i)} aria-labelledby={`${guideAnchor(i)}-h`} className="scroll-mt-28">
          <div className="flex items-center gap-3">
            <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-coral-soft text-[0.8125rem] font-bold text-coral">{i + 1}</span>
            <h2 id={`${guideAnchor(i)}-h`} className="font-serif text-[1.5rem] font-semibold leading-tight text-ink sm:text-[1.75rem]">{s.heading}</h2>
          </div>
          {paragraphs(s.text).length ? (
            <div className="mt-4 space-y-4">
              {paragraphs(s.text).map((p, j) => <p key={j} className="text-[1.0625rem] leading-[1.75] text-[#3D3D3D]">{p}</p>)}
            </div>
          ) : null}
          {s.items?.length ? (
            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              {s.items.map((it, j) => (
                <div key={j} className={`rounded-2xl border border-line bg-white p-4 ${s.items!.length % 2 === 1 && j === s.items!.length - 1 ? "sm:col-span-2" : ""}`}>
                  {it.title ? (
                    <dt className="flex flex-wrap items-center gap-2 text-[0.8125rem] font-bold uppercase tracking-wide text-ink">
                      {it.title}
                      <StatusPill status={it.status} />
                    </dt>
                  ) : null}
                  <dd className={`text-[0.9375rem] leading-relaxed text-[#4A4A4A] ${it.title ? "mt-1.5" : ""}`}>
                    {it.body}
                    {!it.title && it.status ? <> <StatusPill status={it.status} className="ml-1 align-middle" /></> : null}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </section>
      ))}
      {body.checklist?.length ? (
        <section aria-labelledby="g-check-h" className="rounded-3xl border border-line bg-white p-6 sm:p-7">
          <h2 id="g-check-h" className="flex items-center gap-2.5 font-serif text-xl font-semibold text-ink">
            <span aria-hidden className="flex size-8 items-center justify-center rounded-full bg-[#E9F3EC] text-[#1B4332]"><Icon name="checkCircle" size={17} /></span>
            Before you go
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {body.checklist.map((c, i) => (
              <li key={i} className="flex gap-2.5 rounded-xl bg-[#F8F6F2] px-3.5 py-3 text-[0.9375rem] leading-snug text-[#3D3D3D]">
                <Icon name="checkCircle" size={18} className="mt-px shrink-0 text-[#2C6E49]" />
                {c}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
