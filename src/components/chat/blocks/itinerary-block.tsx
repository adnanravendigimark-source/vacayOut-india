import { Icon, type Name } from "@/components/icons/icon";
import type { BlockOf } from "@/lib/chat/schema";
import { BlockImage } from "./shared";

type Day = BlockOf<"itinerary">["days"][number];

/** "Day 1 — Old city" → "Old city" (the day number is shown once, by us). */
const dayName = (title: string) => title.replace(/^\s*day\s*\d+\s*[:.·—–-]*\s*/i, "").trim() || title;

function Meta({ icon, label, children }: { icon: Name; label: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon name={icon} size={14} className="shrink-0 text-[#767676]" />
      <span className="sr-only">{label}: </span>
      {children}
    </span>
  );
}

const PARTS = [
  ["morning", "Morning"],
  ["afternoon", "Afternoon"],
  ["evening", "Evening"],
] as const;

function DayCard({ day, n }: { day: Day; n: number }) {
  const parts = PARTS.filter(([k]) => day[k]?.length);
  const hasMeta = day.base || day.travel || day.cost;
  return (
    <li className="rounded-2xl border border-line bg-white p-4 sm:p-5">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <h4 className="font-serif text-[1.125rem] leading-snug text-ink">
            <span className="tabular-nums">Day {n}</span>
            <span aria-hidden className="px-1.5 text-[#B5AFA5]">·</span>
            {dayName(day.title)}
          </h4>
          {hasMeta ? (
            <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[0.8125rem] tabular-nums text-[#555555]">
              {day.base ? <Meta icon="bed" label="Stay">{day.base}</Meta> : null}
              {day.travel ? <Meta icon="car" label="Travel">{day.travel}</Meta> : null}
              {day.cost ? <Meta icon="coins" label="Rough cost">{day.cost}</Meta> : null}
            </p>
          ) : null}
        </div>
        {day.photo ? <BlockImage photo={day.photo} sizes="112px" className="relative hidden h-20 w-28 shrink-0 rounded-xl sm:block" /> : null}
      </div>

      {parts.length ? (
        <dl className="mt-3 divide-y divide-line-subtle border-t border-line-subtle">
          {parts.map(([k, label]) => (
            <div key={k} className="grid gap-x-4 gap-y-0.5 py-2.5 sm:grid-cols-[6rem_1fr]">
              <dt className="pt-px text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[#767676]">{label}</dt>
              <dd className="text-[0.9375rem] leading-relaxed text-ink">{day[k]!.join("; ")}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <ul className="mt-3 space-y-1.5 border-t border-line-subtle pt-3 text-[0.9375rem] leading-relaxed text-ink">
          {day.items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2.5">
              <span aria-hidden className="mt-[0.6rem] size-1.5 shrink-0 rounded-full bg-[#B5AFA5]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}

      {day.note ? (
        <p className="mt-2 flex items-start gap-2 rounded-xl bg-[#FBFAF8] px-3 py-2 text-[0.8125rem] leading-snug text-[#555555]">
          <Icon name="shield" size={14} className="mt-0.5 shrink-0 text-coral-text" />
          {day.note}
        </p>
      ) : null}
    </li>
  );
}

/** Day-by-day plan: one card per day — where you sleep, travel, rough cost, then morning / afternoon / evening. */
export function ItineraryBlock({ block }: { block: BlockOf<"itinerary"> }) {
  return (
    <section aria-label={block.title || "Day-by-day plan"}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-serif text-[1.25rem] leading-tight text-ink">{block.title || "Day-by-day plan"}</h3>
        <span className="shrink-0 text-[0.8125rem] tabular-nums text-[#666666]">
          {block.days.length} {block.days.length === 1 ? "day" : "days"}
        </span>
      </div>
      <ol className="mt-3 space-y-2.5">
        {block.days.map((day, i) => (
          <DayCard key={`${i}-${day.title}`} day={day} n={i + 1} />
        ))}
      </ol>
    </section>
  );
}
