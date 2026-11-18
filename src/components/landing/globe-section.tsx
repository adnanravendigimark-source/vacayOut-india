"use client";

import createGlobe from "cobe";
import { useEffect, useRef } from "react";
import type { LandingData } from "@/lib/data/landing";
import { INDIA_MAP_PATHS, INDIA_MAP_VIEWBOX } from "@/components/home/india-map-data";
import { reducedMotion, useCountUp, useSectionProgress } from "./hooks";

// Where the globe should face for a latitude/longitude (cobe's angles).
const face = (lat: number, lng: number) => [Math.PI - ((lng * Math.PI) / 180 - Math.PI / 2), (lat * Math.PI) / 180] as const;
const INDIA = face(21, 79);
const CITIES: [number, number][] = [[28.61, 77.21], [19.08, 72.88], [12.97, 77.59], [13.08, 80.27], [22.57, 88.36], [26.91, 75.79], [34.08, 74.8], [15.5, 73.83], [9.93, 76.27], [27.33, 88.61], [34.15, 77.58], [25.32, 82.97]];
// Arcs along a few classic Indian routes (Delhi–Jaipur–Agra, Delhi–Leh, Mumbai–Goa–Kochi, Kolkata–Gangtok).
const ARCS: [[number, number], [number, number]][] = [
  [[28.61, 77.21], [26.91, 75.79]], [[28.61, 77.21], [34.15, 77.58]], [[19.08, 72.88], [15.5, 73.83]], [[15.5, 73.83], [9.93, 76.27]],
  [[22.57, 88.36], [27.33, 88.61]], [[28.61, 77.21], [25.32, 82.97]], [[12.97, 77.59], [13.08, 80.27]],
];

function Stat({ value, label }: { value: number; label: string }) {
  const { ref, value: v } = useCountUp(value);
  return (
    <div className="vl-gstat">
      <span ref={ref as React.RefObject<HTMLSpanElement>} className="vl-gstat__n">{v.toLocaleString("en-IN")}</span>
      <span className="vl-gstat__l">{label}</span>
    </div>
  );
}

/**
 * Chapter 01 as a pinned scene: a spinning globe turns to India and dives in, the
 * globe dissolves into the ink atlas, and the numbers count up.
 */
export function GlobeSection({ data }: { data: LandingData }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const progress = useRef(0);
  const ref = useSectionProgress<HTMLElement>((p) => (progress.current = p));

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    let size = el.offsetWidth;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const globe = createGlobe(el, {
      devicePixelRatio: dpr, width: size * dpr, height: size * dpr,
      phi: 0, theta: 0.25, dark: 0, diffuse: 1.15, mapSamples: 16000, mapBrightness: 5, mapBaseBrightness: 0.05,
      baseColor: [0.96, 0.94, 0.89], markerColor: [0.77, 0.35, 0.2], glowColor: [0.98, 0.86, 0.74],
      markers: CITIES.map((c) => ({ location: c, size: 0.035 })),
      arcs: ARCS.map(([from, to]) => ({ from, to })), arcColor: [0.77, 0.35, 0.2], arcWidth: 0.5, arcHeight: 0.25,
      opacity: 0.95,
    });
    let phi = INDIA[0] - 2.4; // start a few turns away so the spin toward India reads
    let raf = 0;
    let running = false;
    const still = reducedMotion();
    const loop = () => {
      const p = progress.current;
      // First half of the scroll: spin freely and ease toward India; then hold on India.
      const t = Math.min(1, p / 0.45);
      phi += still ? 0 : 0.004 * (1 - t);
      const target = INDIA[0];
      const cur = phi % (Math.PI * 2);
      const ease = t * t * (3 - 2 * t);
      globe.update({ phi: cur + (target - cur) * ease, theta: 0.25 + (INDIA[1] - 0.25) * ease });
      if (running) raf = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(([e]) => {
      running = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (running) raf = requestAnimationFrame(loop);
    });
    io.observe(el);
    const onResize = () => {
      size = el.offsetWidth;
      globe.update({ width: size * dpr, height: size * dpr });
    };
    window.addEventListener("resize", onResize);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      globe.destroy();
    };
  }, []);

  const c = data.counts;
  return (
    <section id="vl-globe" ref={ref} className="vl-globe" aria-labelledby="vl-globe-title">
      <div className="vl-globe__stage">
        <div className="vl-wrap vl-globe__copy">
          <p className="vl-eyebrow">01 — Discover India</p>
          <h2 id="vl-globe-title" className="vl-display">
            <span className="vl-globe__l1">One country.</span>
            <span className="vl-globe__l2"><em>Seven worlds.</em></span>
          </h2>
          <p className="vl-body vl-globe__body">
            Snow deserts and salt marshes, tea hills and tiger forests, temple towns and coral islands — mapped as one atlas, so you can see how India fits together before you choose.
          </p>
          <div className="vl-gstats">
            <Stat value={c.states} label="States & UTs" />
            <Stat value={c.places} label="Places with guides" />
            <Stat value={c.experiences} label="Experiences" />
            <Stat value={c.itineraries} label="Ready-made routes" />
          </div>
        </div>
        <div className="vl-globe__art" aria-hidden>
          <div className="vl-globe__orbit" />
          <canvas ref={canvas} className="vl-globe__canvas" />
          <svg viewBox={INDIA_MAP_VIEWBOX} className="vl-globe__india">
            {INDIA_MAP_PATHS.map((s) => <path key={s.id} d={s.path} pathLength={1} />)}
          </svg>
        </div>
      </div>
    </section>
  );
}
