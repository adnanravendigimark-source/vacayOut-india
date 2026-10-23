"use client";

import { useState } from "react";
import { Icon } from "@/components/icons/icon";

const PROMPT_SUGGESTIONS = [
  "2-day trip near Delhi",
  "Best time to visit Rajasthan",
  "Family trip to Kerala",
  "Adventure in Uttarakhand",
];

export function PlanWithAi({
  onPlan,
}: {
  onPlan: (prompt: string) => void;
}) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      onPlan(q);
      setQuery("");
    }
  };

  return (
    <section className="py-10 sm:py-14 bg-white border-b border-[#ECE9E2]">
      <div className="container-site">
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-[#D5E5DA] bg-[#EEF5F0] p-6 sm:p-8 lg:p-10 shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
            {/* Left side: AI badge, title, and description */}
            <div className="lg:col-span-5 flex items-start gap-4">
              <div className="flex size-14 sm:size-16 shrink-0 items-center justify-center rounded-2xl border border-[#BED6C4] bg-[#E1EEE4] text-[#1E4D34] shadow-xs">
                <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight">
                  AI
                </span>
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl lg:text-[1.75rem] font-bold text-ink leading-tight font-sans">
                  Plan a trip with AI
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-[#445548] leading-relaxed">
                  Tell us your travel preferences, budget and dates. Our AI will create a personalised itinerary just for you.
                </p>
              </div>
            </div>

            {/* Right side: Input Capsule and Quick Suggestion Pills */}
            <div className="lg:col-span-7 flex flex-col justify-center">
              <form
                onSubmit={handleSubmit}
                className="flex items-center gap-2 rounded-full border border-[#C5D9CB] bg-white p-1.5 pl-4 sm:pl-5 shadow-xs focus-within:border-[#2D5A3F] focus-within:ring-2 focus-within:ring-[#2D5A3F]/20 transition-all"
              >
                <Icon name="search" size={18} className="text-[#6B8573] shrink-0" />
                <label htmlFor="ai-banner-input" className="sr-only">
                  e.g. Plan a 5-day trip to Himachal Pradesh under ₹20,000
                </label>
                <input
                  id="ai-banner-input"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. Plan a 5-day trip to Himachal Pradesh under ₹20,000"
                  className="flex-1 min-w-0 bg-transparent text-xs sm:text-sm text-ink outline-none placeholder:text-[#88998C] font-medium py-1.5"
                />
                <button
                  type="submit"
                  aria-label="Generate travel plan with AI"
                  className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-full bg-[#2D5A3F] text-white transition-all hover:bg-[#234832] hover:scale-105 active:scale-95 shadow-xs"
                >
                  <Icon name="arrowRight" size={16} strokeWidth={2.2} />
                </button>
              </form>

              {/* Try asking pill chips */}
              <div className="mt-3.5 flex flex-wrap items-center gap-2">
                <span className="text-[0.75rem] font-semibold text-[#55695A] mr-1">
                  Try asking:
                </span>
                {PROMPT_SUGGESTIONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => onPlan(item)}
                    className="rounded-full border border-[#CDE0D3] bg-white px-3 py-1 text-xs font-medium text-ink/90 hover:border-[#2D5A3F] hover:text-[#1E4D34] hover:shadow-xs transition-all cursor-pointer"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
