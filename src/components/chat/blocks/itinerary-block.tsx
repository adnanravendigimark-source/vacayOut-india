import type { BlockOf } from "@/lib/chat/schema";
import { BlockImage } from "./shared";

export function ItineraryBlock({ block }: { block: BlockOf<"itinerary"> }) {
  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-base sm:text-lg font-bold text-ink">
          {block.title || "Day-by-Day Journey"}
        </h3>
        <span className="text-xs font-semibold text-coral">
          {block.days.length} {block.days.length === 1 ? "Day Plan" : "Days Plan"}
        </span>
      </div>

      <div className="space-y-3">
        {block.days.map((day, i) => {
          return (
            <div
              key={`${i}-${day.title}`}
              className="rounded-2xl border border-[#EBE8E1] bg-white overflow-hidden shadow-xs hover:border-coral/30 transition-all"
            >
              {/* Day Header matching user screenshot */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#F0ECE1] bg-white px-4 sm:px-5 py-3 sm:py-3.5">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <span className="rounded-md bg-coral px-2.5 py-1 text-xs font-bold tracking-wider text-white uppercase shadow-xs">
                    DAY {i + 1}
                  </span>
                  <h4 className="font-serif text-[0.9375rem] sm:text-base font-bold text-ink">
                    {day.title}
                  </h4>
                </div>
              </div>

              {/* Day Content */}
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 items-start justify-between">
                <ul className="space-y-2 text-xs sm:text-sm text-[#3a3a3a] flex-1">
                  {day.items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-coral" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                {day.photo ? (
                  <div className="relative h-20 w-28 shrink-0 rounded-xl overflow-hidden self-start">
                    <BlockImage
                      photo={day.photo}
                      sizes="120px"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
