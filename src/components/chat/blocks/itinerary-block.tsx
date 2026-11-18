import type { BlockOf } from "@/lib/chat/schema";
import { BlockImage } from "./shared";

/** Day-by-day plan as a timeline: a numbered dot per day on one line, each day in its own card. */
export function ItineraryBlock({ block }: { block: BlockOf<"itinerary"> }) {
  return (
    <section aria-label={block.title || "Day-by-day plan"}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-serif text-lg font-normal text-ink sm:text-xl">{block.title || "Day-by-day plan"}</h3>
        <span className="shrink-0 rounded-full bg-[#FDF0EB] px-2.5 py-0.5 text-[0.6875rem] font-semibold text-coral">
          {block.days.length} {block.days.length === 1 ? "day" : "days"}
        </span>
      </div>

      <ol className="relative mt-3 space-y-3 before:absolute before:bottom-4 before:left-[15px] before:top-4 before:w-px before:bg-[#E8E2D8]">
        {block.days.map((day, i) => (
          <li key={`${i}-${day.title}`} className="relative flex gap-3">
            <span aria-hidden className="relative z-10 mt-3 flex size-8 shrink-0 items-center justify-center rounded-full bg-ink font-serif text-sm text-white ring-4 ring-white">{i + 1}</span>
            <div className="min-w-0 flex-1 rounded-2xl border border-[#ECE9E2] bg-white p-4 transition-shadow hover:shadow-[0_14px_32px_-22px_rgba(25,25,25,0.4)]">
              <div className="flex items-start gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-coral">Day {i + 1}</p>
                  <h4 className="mt-0.5 font-serif text-base font-normal leading-snug text-ink">{day.title}</h4>
                  <ul className="mt-2 space-y-1.5 text-[0.8125rem] leading-relaxed text-[#444444] sm:text-sm">
                    {day.items.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <span aria-hidden className="mt-[0.55rem] size-1.5 shrink-0 rounded-full bg-coral" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {day.photo ? <BlockImage photo={day.photo} sizes="112px" className="relative hidden h-20 w-28 shrink-0 rounded-xl sm:block" /> : null}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
