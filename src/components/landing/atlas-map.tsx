"use client";

import { useMemo } from "react";
import { INDIA_MAP_PATHS, INDIA_MAP_VIEWBOX } from "@/components/home/india-map-data";
import { project, slugsOf, ZONE_INFO, type MapZone } from "./geo";

export type AtlasPin = { name: string; lat: number; lng: number };

/**
 * The ink-line atlas of India that the journey travels across. One SVG; each
 * chapter only changes fills, pins and the route, so transitions are CSS-only.
 */
export function AtlasMap({
  chapter,
  zone,
  liveStates,
  pins,
  route,
  onZone,
}: {
  chapter: number;
  zone: MapZone | null;
  liveStates: Set<string>;
  pins: AtlasPin[];
  route: AtlasPin[];
  onZone?: (z: MapZone | null) => void;
}) {
  // Stops closer than ~6 map units (a few km) are one point on this scale: keep the first.
  const routePts = useMemo(() => {
    const out: [number, number][] = [];
    const names: string[] = [];
    for (const r of route) {
      const p = project(r.lat, r.lng);
      if (!out.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 6)) {
        out.push(p);
        names.push(r.name);
      }
    }
    return Object.assign(out, { names });
  }, [route]);
  const routeD = useMemo(() => {
    if (routePts.length < 2) return "";
    let d = `M ${routePts[0][0].toFixed(1)} ${routePts[0][1].toFixed(1)}`;
    for (let i = 1; i < routePts.length; i++) {
      const [x0, y0] = routePts[i - 1];
      const [x1, y1] = routePts[i];
      // A gentle arc between stops, bowed to one side, reads as a journey rather than a graph.
      const mx = (x0 + x1) / 2 - (y1 - y0) * 0.18;
      const my = (y0 + y1) / 2 + (x1 - x0) * 0.18;
      d += ` Q ${mx.toFixed(1)} ${my.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
    }
    return d;
  }, [routePts]);
  const pinPts = useMemo(() => pins.map((p) => ({ ...p, xy: project(p.lat, p.lng) })), [pins]);
  // Chapter 4 zooms the atlas onto the route so close stops stay readable.
  const zoom = useMemo(() => {
    if (routePts.length < 2) return { s: 1, tx: 0, ty: 0 };
    const xs = routePts.map((p) => p[0]), ys = routePts.map((p) => p[1]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const s = Math.max(1, Math.min(612 / (x1 - x0 + 160), 696 / (y1 - y0 + 160), 3.2));
    return { s, tx: 306 - s * ((x0 + x1) / 2), ty: 348 - s * ((y0 + y1) / 2) };
  }, [routePts]);
  const z = chapter === 3 ? zoom : { s: 1, tx: 0, ty: 0 };

  const fillFor = (id: string, name: string, z: MapZone) => {
    const live = slugsOf(id, name).some((s) => liveStates.has(s));
    if (chapter === 1 && zone) return z === zone ? ZONE_INFO[z].color : "var(--vl-paper)";
    if (chapter === 2) return pinPts.length && live ? "var(--vl-sand)" : "var(--vl-paper)";
    if (chapter === 4) return live ? "var(--vl-saffron-soft)" : "var(--vl-paper)";
    return "var(--vl-paper)";
  };

  return (
    <svg viewBox={INDIA_MAP_VIEWBOX} className="vl-atlas h-full w-full" role="img" aria-label="Map of India">
      <g className="vl-zoom" style={{ transform: `matrix(${z.s},0,0,${z.s},${z.tx},${z.ty})` }}>
      <g>
        {INDIA_MAP_PATHS.map((s, i) => (
          <path
            key={s.id}
            d={s.path}
            pathLength={1}
            className="vl-state"
            style={{ fill: fillFor(s.id, s.name, s.zone), animationDelay: `${(i % 12) * 70}ms` }}
            onMouseEnter={chapter === 1 && onZone ? () => onZone(s.zone) : undefined}
          >
            <title>{s.name}</title>
          </path>
        ))}
      </g>

      {/* Chapter 3: experiences as pulsing pins */}
      <g className="vl-layer" data-on={chapter === 2}>
        {pinPts.map((p, i) => (
          <g key={p.name + i} transform={`translate(${p.xy[0].toFixed(1)} ${p.xy[1].toFixed(1)})`}>
            <circle r={9} className="vl-halo" style={{ animationDelay: `${(i % 6) * 0.35}s` }} />
            <circle r={3.6} className="vl-dot" />
          </g>
        ))}
      </g>

      {/* Chapter 4: a real itinerary's route */}
      <g className="vl-layer" data-on={chapter === 3}>
        {routeD ? <path d={routeD} pathLength={1} className="vl-route" data-draw={chapter === 3} style={{ strokeWidth: 2.6 / zoom.s }} /> : null}
        {routeD && chapter === 3 ? (
          // A traveller marker that keeps moving along the drawn route.
          <g className="vl-traveller">
            <path d="M -7 -4 L 7 0 L -7 4 L -4 0 Z" transform={`scale(${(1 / zoom.s).toFixed(3)})`} />
            <animateMotion dur="6s" begin="1.6s" repeatCount="indefinite" rotate="auto" path={routeD} />
          </g>
        ) : null}
        {routePts.map(([x, y], i) => (
          <g key={i} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(1 / zoom.s).toFixed(3)})`}>
            <circle r={8} className="vl-stop" />
            <text y={3.2} textAnchor="middle" className="vl-stop-n">{i + 1}</text>
            <text x={12} y={4} className="vl-stop-name">{routePts.names[i]}</text>
          </g>
        ))}
      </g>
      </g>
    </svg>
  );
}
