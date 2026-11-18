"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LandingData } from "@/lib/data/landing";
import { INDIA_MAP_PATHS } from "@/components/home/india-map-data";
import { AtlasMap } from "./atlas-map";
import { CHAPTERS } from "./hero";
import { ZONE_INFO, ZONE_ORDER, slugsOf, type MapZone } from "./geo";

const fmt = (n: number | null) => (n == null ? "—" : n.toLocaleString("en-IN"));

/**
 * The journey: five chapters on the left, one sticky atlas on the right that
 * changes with the chapter in view (IntersectionObserver, no scroll handlers).
 */
export function LandingJourney({ data, onPlan }: { data: LandingData; onPlan: (p: string) => void }) {
  const [chapter, setChapter] = useState(1);
  const [zone, setZone] = useState<MapZone | null>("north");
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setChapter(Number((e.target as HTMLElement).dataset.chapter));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    root.current?.querySelectorAll<HTMLElement>("[data-chapter]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const liveStates = useMemo(() => new Set(data.states.filter((s) => s.places > 0).map((s) => s.slug)), [data.states]);
  const pins = useMemo(() => data.experiences.filter((e) => e.lat != null && e.lng != null).map((e) => ({ name: e.name, lat: e.lat!, lng: e.lng! })), [data.experiences]);
  const zoneStates = useMemo(() => {
    const byZone = new Map<MapZone, { name: string; href: string; places: number }[]>();
    const seen = new Set<string>();
    for (const p of INDIA_MAP_PATHS) {
      for (const slug of slugsOf(p.id, p.name)) {
        const st = data.states.find((s) => s.slug === slug);
        if (!st || seen.has(slug)) continue;
        seen.add(slug);
        byZone.set(p.zone, [...(byZone.get(p.zone) ?? []), { name: st.name, href: st.href, places: st.places }]);
      }
    }
    return byZone;
  }, [data.states]);
  const z = zone ?? "north";
  const t = data.trip;
  const c = data.counts;

  return (
    <section id="vl-journey" className="vl-journey" aria-label="Plan a trip in five steps">
      <div className="vl-wrap vl-journey__grid">
        <div className="vl-journey__map" aria-hidden={false}>
          <div className="vl-journey__mapInner">
            <div className="vl-journey__mapHead">
              <span>{CHAPTERS[chapter].n} / 05</span>
              <span>{CHAPTERS[chapter].label}</span>
            </div>
            <AtlasMap chapter={chapter} zone={chapter === 1 ? z : null} liveStates={liveStates} pins={pins} route={t?.route ?? []} onZone={setZone} />
            <div className="vl-journey__progress" aria-hidden>
              {CHAPTERS.map((ch, i) => <span key={ch.n} data-on={i <= chapter} />)}
            </div>
          </div>
        </div>

        <div className="vl-journey__text" ref={root}>
          {/* 02 Explore destinations */}
          <article id="vl-chapter-2" data-chapter={1} className="vl-chapter">
            <p className="vl-eyebrow">Or start from the map</p>
            <h2 className="vl-h2">Choose a <em>region</em>, then a place.</h2>
            <p className="vl-body">Hover a region on the map or in the list. Every state links to its guide.</p>
            <ul className="vl-zones" role="list">
              {ZONE_ORDER.map((k) => (
                <li key={k}>
                  <button
                    type="button"
                    className="vl-zones__btn"
                    data-on={k === z}
                    style={{ ["--vl-zone" as string]: ZONE_INFO[k].color }}
                    onMouseEnter={() => setZone(k)}
                    onFocus={() => setZone(k)}
                    onClick={() => setZone(k)}
                  >
                    <span>{ZONE_INFO[k].title}</span>
                    <small>{(zoneStates.get(k) ?? []).length} states</small>
                  </button>
                </li>
              ))}
            </ul>
            <div className="vl-zoneCard" style={{ ["--vl-zone" as string]: ZONE_INFO[z].color }}>
              <p className="vl-zoneCard__line">{ZONE_INFO[z].line}</p>
              <ul role="list">
                {(zoneStates.get(z) ?? []).slice(0, 8).map((s) => (
                  <li key={s.href}><Link href={s.href}>{s.name}<span>{s.places}</span></Link></li>
                ))}
              </ul>
            </div>
          </article>

          {/* 04 Build your trip */}
          <article id="vl-chapter-4" data-chapter={3} className="vl-chapter">
            <p className="vl-eyebrow">04 — Build your trip</p>
            <h2 className="vl-h2">From idea to a <em>day-by-day</em> route.</h2>
            {t ? (
              <>
                <p className="vl-body">
                  Start from one of {c.itineraries} researched itineraries — like <strong>{t.title}</strong> — or describe your own and the AI planner drafts it in seconds.
                </p>
                <ol className="vl-days" role="list">
                  {t.days.slice(0, 5).map((d, i) => (
                    <li key={i}>
                      <span className="vl-days__n">Day {i + 1}</span>
                      <span className="vl-days__t">{d.title}</span>
                      {d.overnight ? <span className="vl-days__o">Night · {d.overnight}</span> : null}
                    </li>
                  ))}
                </ol>
                <div className="vl-actions">
                  <Link href={t.href} className="vl-btn vl-btn--ink">Open this itinerary</Link>
                  <button type="button" className="vl-btn" onClick={() => onPlan(`Adapt "${t.title}" to my dates, budget and group`)}>Make it mine with AI</button>
                </div>
              </>
            ) : (
              <button type="button" className="vl-btn vl-btn--ink" onClick={() => onPlan("")}>Plan a trip with AI</button>
            )}
          </article>

          {/* 05 Confidence */}
          <article id="vl-chapter-5" data-chapter={4} className="vl-chapter">
            <p className="vl-eyebrow">05 — Travel with confidence</p>
            <h2 className="vl-h2">Every claim has <em>a source.</em></h2>
            <p className="vl-body">
              Opening hours, permits, seasons and distances come from official tourism boards and the places themselves, and the
              quote behind each one is checked on the page it came from. Photos carry their credit and licence.
            </p>
            <dl className="vl-stats">
              <div><dt>Sources checked</dt><dd>{fmt(data.trust.sources)}</dd></div>
              <div><dt>Quotes checked</dt><dd>{fmt(data.trust.quotes)}</dd></div>
              <div><dt>Government sources</dt><dd>{fmt(data.trust.official)}</dd></div>
            </dl>
            <ul className="vl-checks" role="list">
              <li>Prices shown only when an official source lists them</li>
              <li>Travel advisories and seasonal closures, where they apply</li>
              <li>The AI planner answers India travel questions only</li>
            </ul>
            <Link href="/sources" className="vl-link">How we research →</Link>
          </article>
        </div>
      </div>
    </section>
  );
}
