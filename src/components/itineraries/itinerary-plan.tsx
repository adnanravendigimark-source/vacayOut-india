import Link from "next/link";
import { Icon } from "@/components/icons/icon";
import type { ItineraryPlan } from "@/lib/db/schema";

/**
 * Day-by-day rendering of an itinerary plan. Used by the public itinerary page
 * and the admin preview. Text only (React escapes everything); stop links go
 * to published guides only, resolved by the caller.
 */
export function ItineraryPlanView({ plan, placeHref, preview = false }: { plan: ItineraryPlan; placeHref?: (slug: string) => string | null; preview?: boolean }) {
  return (
    <div className="space-y-10">
      <p className="text-[1.0625rem] leading-relaxed text-[#444]">{plan.overview}</p>

      <ol className="space-y-6">
        {plan.days.map((d, i) => (
          <li key={i} className="rounded-2xl border border-line bg-white p-5 sm:p-6">
            <p className="flex flex-wrap items-baseline gap-2">
              <span className="rounded-md bg-coral/10 px-2 py-0.5 text-xs font-semibold text-coral">Day {i + 1}</span>
              <span className="font-serif text-xl font-medium text-ink">{d.title.replace(/^day\s*\d+\s*[:.–-]\s*/i, "")}</span>
            </p>
            {d.summary ? <p className="mt-2 text-[0.9375rem] leading-relaxed text-[#555]">{d.summary}</p> : null}
            <ul className="mt-4 space-y-3">
              {d.stops.map((s, j) => {
                const href = !preview && s.placeSlug && placeHref ? placeHref(s.placeSlug) : null;
                return (
                  <li key={j} className="flex gap-3 text-[0.9375rem] leading-relaxed">
                    <span className="mt-0.5 w-24 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted">{s.time ?? ""}</span>
                    <span className="min-w-0">
                      {href ? <Link href={href} className="font-semibold text-ink underline-offset-2 hover:underline">{s.name}</Link> : <span className="font-semibold text-ink">{s.name}</span>}
                      {s.duration ? <span className="ml-2 text-xs text-muted">· {s.duration}</span> : null}
                      {s.note ? <span className="block text-[#555]">{s.note}</span> : null}
                    </span>
                  </li>
                );
              })}
            </ul>
            {d.travel || d.meals || d.overnight ? (
              <dl className="mt-4 grid gap-2 border-t border-line pt-4 text-sm text-[#555] sm:grid-cols-3">
                {d.travel ? <div><dt className="flex items-center gap-1.5 font-semibold text-ink"><Icon name="route" size={14} className="text-coral" /> Getting around</dt><dd className="mt-0.5">{d.travel}</dd></div> : null}
                {d.meals ? <div><dt className="flex items-center gap-1.5 font-semibold text-ink"><Icon name="utensils" size={14} className="text-coral" /> Meals & breaks</dt><dd className="mt-0.5">{d.meals}</dd></div> : null}
                {d.overnight ? <div><dt className="flex items-center gap-1.5 font-semibold text-ink"><Icon name="bed" size={14} className="text-coral" /> Overnight</dt><dd className="mt-0.5">{d.overnight}</dd></div> : null}
              </dl>
            ) : null}
          </li>
        ))}
      </ol>

      <section aria-labelledby="it-budget">
        <h2 id="it-budget" className="font-serif text-2xl font-medium text-ink">Estimated budget</h2>
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">Estimates only — prices change. Check current rates before you travel.</p>
        <p className="mt-3 leading-relaxed text-muted">{plan.budget.assumptions}</p>
        {plan.budget.lines.length ? (
          <div className="mt-3 overflow-hidden rounded-xl border border-line bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F7F5F0] text-xs uppercase tracking-wide text-muted">
                <tr><th className="px-4 py-2.5 font-semibold">Cost</th><th className="px-4 py-2.5 font-semibold">Estimate</th><th className="px-4 py-2.5 font-semibold">Based on</th></tr>
              </thead>
              <tbody>
                {plan.budget.lines.map((l, i) => (
                  <tr key={i} className="border-t border-line align-top">
                    <td className="px-4 py-2.5 font-medium">{l.label}</td>
                    <td className="px-4 py-2.5">{l.amount}</td>
                    <td className="px-4 py-2.5 text-muted">{l.basis}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {plan.booking.length ? (
        <section aria-labelledby="it-booking">
          <h2 id="it-booking" className="font-serif text-2xl font-medium text-ink">What to book ahead</h2>
          <ul className="mt-3 space-y-2">
            {plan.booking.map((b, i) => (
              <li key={i} className="flex gap-2.5 text-[0.9375rem] leading-relaxed text-[#444]">
                <Icon name="ticket" size={18} className="mt-0.5 shrink-0 text-coral" />
                <span><strong className="text-ink">{b.item}: </strong>{b.detail}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {plan.alternatives.length ? (
        <section aria-labelledby="it-alt">
          <h2 id="it-alt" className="font-serif text-2xl font-medium text-ink">Alternatives and swaps</h2>
          <ul className="mt-3 space-y-2">
            {plan.alternatives.map((a, i) => (
              <li key={i} className="flex gap-2.5 text-[0.9375rem] leading-relaxed text-[#444]"><Icon name="compass" size={18} className="mt-0.5 shrink-0 text-coral" />{a}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {plan.tips?.length ? (
        <section aria-labelledby="it-tips">
          <h2 id="it-tips" className="font-serif text-2xl font-medium text-ink">Tips</h2>
          <ul className="mt-3 space-y-2">
            {plan.tips.map((t, i) => (
              <li key={i} className="flex gap-2.5 text-[0.9375rem] leading-relaxed text-[#444]"><Icon name="checkCircle" size={18} className="mt-0.5 shrink-0 text-coral" />{t}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
