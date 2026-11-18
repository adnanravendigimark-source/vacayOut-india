"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/icons/icon";
import type { HomepageData, ReadyRoute } from "@/lib/data/types";
import { HeroSearch } from "./hero-search";

const STEPS = [
  { icon: "chat", title: "Tell us the trip", body: "Where, how long, who's coming, your budget." },
  { icon: "route", title: "Get a day-by-day plan", body: "Places, stays and travel time for each day." },
  { icon: "checkCircle", title: "Adjust and go", body: "Ask for changes until it fits you." },
] as const;

// Shown in the demo only when no published itinerary is available.
const FALLBACK: Demo[] = [
  { ask: "Plan 3 relaxed days in Udaipur for a couple", place: "Udaipur", days: ["Lake Pichola and the City Palace", "Old city lanes and Sajjangarh at sunset", "Saheliyon ki Bari and Fateh Sagar"] },
];

interface Demo {
  ask: string;
  place: string;
  days: string[];
}

const demosFrom = (routes: ReadyRoute[]): Demo[] =>
  routes.length
    ? routes.map((r) => ({ ask: `Plan ${r.days} ${r.days === 1 ? "day" : "days"} in ${r.place || r.title}`, place: r.title, days: r.dayTitles.slice(0, 4) }))
    : FALLBACK;

type Phase = "typing" | "thinking" | "answer";

const RM = "(prefers-reduced-motion: reduce)";
function subscribeRM(cb: () => void) {
  const m = window.matchMedia(RM);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}

/**
 * A small looping demo of the planner: a question types itself, the AI "thinks", then a
 * day-by-day plan builds up. The answers are real published itineraries, labelled as examples.
 */
function PlannerDemo({ demos }: { demos: Demo[] }) {
  const [n, setN] = useState(0);
  const [typed, setTyped] = useState(0);
  const [phase, setPhase] = useState<Phase>("typing");
  const [shown, setShown] = useState(0);
  const [inView, setInView] = useState(false);
  const still = useSyncExternalStore(subscribeRM, () => window.matchMedia(RM).matches, () => false);
  const root = useRef<HTMLDivElement>(null);
  const demo = demos[n % demos.length];

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || still) return;
    let t: number;
    if (phase === "typing") {
      t = window.setTimeout(() => (typed < demo.ask.length ? setTyped(typed + 1) : setPhase("thinking")), typed < demo.ask.length ? 38 : 300);
    } else if (phase === "thinking") {
      t = window.setTimeout(() => setPhase("answer"), 1300);
    } else if (shown < demo.days.length) {
      t = window.setTimeout(() => setShown(shown + 1), 380);
    } else {
      t = window.setTimeout(() => {
        setN((x) => x + 1);
        setTyped(0);
        setShown(0);
        setPhase("typing");
      }, 3200);
    }
    return () => window.clearTimeout(t);
  }, [inView, still, phase, typed, shown, demo]);

  const askText = still ? demo.ask : demo.ask.slice(0, typed);
  const showAnswer = still || phase === "answer";
  const dayCount = still ? demo.days.length : shown;

  return (
    <div ref={root} className="plan-demo relative rounded-2xl border border-white/70 bg-white/90 shadow-[0_30px_70px_-30px_rgba(120,50,20,0.45)] backdrop-blur-md" aria-hidden>
      <div className="flex items-center justify-between border-b border-[#F0E7E1] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="grid size-6 place-items-center rounded-full bg-coral text-white"><Icon name="sparkles" size={12} /></span>
          <span className="text-xs font-bold text-ink">VacayOut AI</span>
        </div>
        <span className="rounded-full bg-[#FFF1EC] px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wider text-coral">Example</span>
      </div>
      <div className="min-h-[17.5rem] space-y-3 p-4">
        {/* the question */}
        <div className="flex justify-end">
          <p className="max-w-[85%] rounded-2xl rounded-br-md bg-ink px-3.5 py-2 text-sm text-white">
            {askText}
            {!still && phase === "typing" ? <i className="plan-demo__caret" /> : null}
          </p>
        </div>
        {/* thinking */}
        {!still && phase === "thinking" ? (
          <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-[#FFF4EF] px-3.5 py-3 w-fit">
            <span className="plan-demo__dot" /><span className="plan-demo__dot" /><span className="plan-demo__dot" />
          </div>
        ) : null}
        {/* the answer */}
        {showAnswer ? (
          <div className="plan-demo__answer rounded-2xl rounded-bl-md border border-[#F3E2DA] bg-[#FFFBF9] p-3">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-coral">Your plan</p>
            <p className="mt-0.5 text-sm font-bold leading-snug text-ink">{demo.place}</p>
            <ol className="mt-2 space-y-1.5">
              {demo.days.slice(0, dayCount).map((d, i) => (
                <li key={`${n}-${i}`} className="plan-demo__day flex items-start gap-2 text-[0.8125rem] leading-snug text-[#333333]">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-coral text-[0.625rem] font-bold text-white">{i + 1}</span>
                  <span>{d}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function PlanWithAi({
  onPlan,
  examples,
  readyRoutes = [],
}: {
  onPlan: (prompt: string) => void;
  examples: HomepageData["examplePrompts"];
  readyRoutes?: ReadyRoute[];
}) {
  return (
    <section className="py-10 sm:py-14 bg-white border-b border-[#ECE9E2]">
      <div className="container-site">
        <div className="plan-ai relative isolate overflow-hidden rounded-3xl border border-[#F3DED4] p-6 sm:p-8 lg:p-12">
          <span aria-hidden className="plan-ai__glow plan-ai__glow--a" />
          <span aria-hidden className="plan-ai__glow plan-ai__glow--b" />
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-6">
              <p className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-coral shadow-xs">
                <Icon name="sparkles" size={13} /> AI trip planner
              </p>
              <h2 className="mt-3 font-serif text-[clamp(1.9rem,3.6vw,2.75rem)] font-normal leading-[1.08] tracking-[-0.02em] text-ink">
                Plan a trip with AI, <em className="italic text-coral">day by day.</em>
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#4A4A4A] sm:text-base">
                Tell us your dates, budget and who&apos;s coming. The planner builds a day-by-day route from our checked guides, and you can keep asking for changes.
              </p>

              <ol className="mt-5 grid gap-2.5 sm:grid-cols-3">
                {STEPS.map((s, i) => (
                  <li key={s.title} className="plan-step rounded-xl bg-white/75 p-3 shadow-xs backdrop-blur-sm" style={{ ["--i" as string]: i }}>
                    <span className="flex items-center gap-2">
                      <span className="grid size-7 place-items-center rounded-lg bg-coral/10 text-coral"><Icon name={s.icon} size={15} /></span>
                      <span className="text-[0.6875rem] font-bold text-[#999999]">0{i + 1}</span>
                    </span>
                    <p className="mt-2 text-sm font-bold text-ink">{s.title}</p>
                    <p className="mt-0.5 text-xs leading-snug text-[#666666]">{s.body}</p>
                  </li>
                ))}
              </ol>

              <div className="mt-6">
                <HeroSearch id="ai-banner-input" examples={examples} onStart={onPlan} />
              </div>
            </div>

            <div className="lg:col-span-6">
              <PlannerDemo demos={demosFrom(readyRoutes)} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
