"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons/icon";
import { SectionHeader } from "./section-header";
import { IndiaRegionalMap } from "./india-regional-map";
import { LiveLink } from "./live-link";
import { REGIONS, REGION_STATES, zoneCount, type Zone } from "./regions";

const CYCLE_MS = 3800;

/**
 * Explore by State or Region: a map and a region list that stay in sync. Until someone
 * interacts, it gently tours the regions; hovering or tapping takes over. The panel under
 * the map lists every state and UT in the chosen region, and each one lights up on the map.
 */
export function RegionExplorer() {
  const [zone, setZone] = useState<Zone>("north");
  const [hoverState, setHoverState] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [inView, setInView] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (touched || !inView || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setZone((z) => REGIONS[(REGIONS.findIndex((r) => r.slug === z) + 1) % REGIONS.length].slug);
    }, CYCLE_MS);
    return () => window.clearInterval(id);
  }, [touched, inView]);

  const pick = (z: Zone) => {
    setTouched(true);
    setZone(z);
  };
  const region = REGIONS.find((r) => r.slug === zone)!;
  const states = REGION_STATES[zone];

  return (
    <div ref={root} className="flex h-full flex-col" onPointerDown={() => setTouched(true)}>
      <SectionHeader
        icon="map"
        title="Explore by State or Region"
        subtitle="All 36 states and union territories, grouped into six regions. Pick one to see what's there."
        className="mb-5 sm:mb-6"
      />

      <div className="grid flex-1 grid-cols-1 items-stretch gap-3 sm:grid-cols-12 sm:gap-4">
        <IndiaRegionalMap
          activeZone={zone}
          activeState={hoverState}
          onHoverZone={(z) => z && pick(z as Zone)}
          className="sm:col-span-7"
        />

        <ul className="flex flex-col justify-between gap-1.5 sm:col-span-5 sm:gap-2" aria-label="Regions">
          {REGIONS.map((r) => {
            const on = zone === r.slug;
            return (
              <li key={r.slug}>
                <Link
                  href={`/india?zone=${r.slug}`}
                  onMouseEnter={() => pick(r.slug)}
                  onFocus={() => pick(r.slug)}
                  aria-current={on ? "true" : undefined}
                  className={`region-card group relative flex items-center justify-between overflow-hidden rounded-xl border px-3 py-2.5 transition-all duration-300 sm:px-3.5 ${
                    on ? "translate-x-1 border-coral bg-[#FFF7F4] shadow-xs" : "border-[#EAE7E0] bg-white hover:border-coral/60"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-300 ${on ? "bg-coral text-white" : "bg-[#FAF8F5] text-ink"}`}>
                      <Icon name={r.icon} size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className={`truncate text-xs font-bold transition-colors sm:text-sm ${on ? "text-coral" : "text-ink"}`}>{r.name}</p>
                      <p className="truncate text-[0.6875rem] text-[#777777]">{zoneCount(r.slug)} states & UTs</p>
                    </div>
                  </div>
                  <Icon name="arrowRight" size={13} className={`ml-1.5 shrink-0 transition-all ${on ? "translate-x-0.5 text-coral" : "text-[#AAAAAA]"}`} />
                  {/* while touring, a thin bar shows when the next region comes */}
                  {on && !touched && inView ? <span key={zone} aria-hidden className="region-card__timer" style={{ animationDuration: `${CYCLE_MS}ms` }} /> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* States in the chosen region */}
      <div className="mt-3 rounded-2xl border border-[#E8EDE6] bg-[#F6F8F5] p-3.5 sm:mt-4 sm:p-4" aria-live="polite">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="text-sm font-bold text-ink">
            {region.name} <span className="font-normal text-[#666666]">— {region.line}</span>
          </p>
          <Link href={`/india?zone=${zone}`} className="group inline-flex items-center gap-1 text-xs font-semibold text-coral">
            See the region
            <Icon name="arrowRight" size={12} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        <ul key={zone} className="mt-2.5 flex flex-wrap gap-1.5">
          {states.map((s, i) => (
            <li key={s.slug} className="region-chip" style={{ ["--i" as string]: i }}>
              <LiveLink
                hrefs={[`/india/${s.slug}`, `/india?zone=${zone}`]}
                prompt={`Plan a trip to ${s.name}`}
                className="inline-flex items-center gap-1 rounded-full border border-[#DCE5DA] bg-white px-2.5 py-1 text-xs font-medium text-ink transition-colors hover:border-coral hover:text-coral"
              >
                <span
                  onMouseEnter={() => setHoverState(s.id)}
                  onMouseLeave={() => setHoverState(null)}
                  className="inline-flex items-center gap-1"
                >
                  <Icon name="pin" size={11} className="text-coral" />
                  {s.name}
                </span>
              </LiveLink>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
