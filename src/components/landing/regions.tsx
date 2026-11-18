"use client";

import Link from "next/link";
import { useMemo, useRef } from "react";
import type { LandingData } from "@/lib/data/landing";
import { INDIA_MAP_PATHS, INDIA_MAP_VIEWBOX } from "@/components/home/india-map-data";
import { ZONE_INFO, ZONE_ORDER, slugsOf, type MapZone } from "./geo";

/**
 * Halden-style coloured region cards on a horizontal track: drag (mouse), swipe
 * (touch, native scroll), arrow buttons and keyboard all work; CSS scroll-snap does the snapping.
 */
export function LandingRegions({ data }: { data: LandingData }) {
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);

  const zones = useMemo(() => {
    const out = new Map<MapZone, { name: string; href: string; places: number; top: { name: string; href: string }[] }[]>();
    const seen = new Set<string>();
    for (const p of INDIA_MAP_PATHS) {
      for (const slug of slugsOf(p.id, p.name)) {
        const st = data.states.find((s) => s.slug === slug);
        if (!st || seen.has(slug)) continue;
        seen.add(slug);
        out.set(p.zone, [...(out.get(p.zone) ?? []), st]);
      }
    }
    return out;
  }, [data.states]);

  const by = (dir: number) => {
    const el = track.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>(".vl-region");
    el.scrollBy({ left: dir * ((card?.offsetWidth ?? 360) + 20), behavior: "smooth" });
  };

  return (
    <section className="vl-regions" aria-labelledby="vl-regions-title">
      <div className="vl-wrap vl-regions__head">
        <div>
          <p className="vl-eyebrow">Seven regions</p>
          <h2 id="vl-regions-title" className="vl-h2">Where will you <em>begin?</em></h2>
        </div>
        <div className="vl-regions__arrows">
          <button type="button" onClick={() => by(-1)} aria-label="Previous region">←</button>
          <button type="button" onClick={() => by(1)} aria-label="Next region">→</button>
        </div>
      </div>

      <div
        ref={track}
        className="vl-regions__track"
        tabIndex={0}
        aria-label="Regions of India"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") by(1);
          if (e.key === "ArrowLeft") by(-1);
        }}
        onPointerDown={(e) => {
          if (e.pointerType !== "mouse" || !track.current) return;
          drag.current = { x: e.clientX, left: track.current.scrollLeft, moved: false };
          track.current.dataset.dragging = "true";
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d || !track.current) return;
          const dx = e.clientX - d.x;
          if (Math.abs(dx) > 4) d.moved = true;
          track.current.scrollLeft = d.left - dx;
        }}
        onPointerUp={() => {
          if (track.current) delete track.current.dataset.dragging;
          setTimeout(() => (drag.current = null), 0);
        }}
        onPointerLeave={() => {
          if (track.current) delete track.current.dataset.dragging;
          drag.current = null;
        }}
        onClickCapture={(e) => {
          // A drag shouldn't also follow the link under the pointer.
          if (drag.current?.moved) e.preventDefault();
        }}
      >
        {ZONE_ORDER.map((k, i) => {
          const info = ZONE_INFO[k];
          const states = zones.get(k) ?? [];
          const places = states.reduce((a, s) => a + s.places, 0);
          return (
            <article key={k} className="vl-region" style={{ background: info.color, color: info.ink }}>
              <div className="vl-region__top">
                <span className="vl-region__count">{String(i + 1).padStart(2, "0")}<i /> {String(ZONE_ORDER.length).padStart(2, "0")}</span>
                <span>{places} places</span>
              </div>
              <h3 className="vl-region__name">{info.title}</h3>
              <p className="vl-region__line">{info.line}</p>
              <ul role="list" className="vl-region__states">
                {states.slice(0, 6).map((s) => (
                  <li key={s.href}><Link href={s.href}>{s.name}</Link></li>
                ))}
              </ul>
              <svg viewBox={INDIA_MAP_VIEWBOX} className="vl-region__map" aria-hidden>
                {INDIA_MAP_PATHS.map((p) => (
                  <path key={p.id} d={p.path} style={{ fill: p.zone === k ? "currentColor" : "transparent", opacity: p.zone === k ? 0.9 : 1 }} />
                ))}
              </svg>
            </article>
          );
        })}
      </div>
    </section>
  );
}
