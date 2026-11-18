"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ExploreData } from "@/lib/places/public-lists";
import { INDIA_MAP_PATHS, INDIA_MAP_VIEWBOX } from "@/components/home/india-map-data";
import { shapeStates } from "@/components/home/regions";

// One soft colour per region; the chosen region is shown in its deeper tone.
const ZONE_TINT: Record<string, { soft: string; deep: string }> = {
  north: { soft: "#DCE6F7", deep: "#6F8FD6" },
  central: { soft: "#F6E7C8", deep: "#D9A441" },
  east: { soft: "#D7EDDF", deep: "#4F9E70" },
  west: { soft: "#F7DCD2", deep: "#E07A55" },
  south: { soft: "#D5ECEC", deep: "#3E9A9A" },
  northeast: { soft: "#E6DDF4", deep: "#8C6CC9" },
  islands: { soft: "#D6E4F2", deep: "#4A7FB8" },
};
const [, , VW, VH] = INDIA_MAP_VIEWBOX.split(" ").map(Number);

type Shape = { id: string; d: string; zone: string | null; states: { name: string; slug: string; guides: number }[] };

/**
 * The Explore map. Every state is tinted by its region; picking a region zooms the map to it
 * and greys out the rest. Hover (or focus) a state to see its name and guide count; click it
 * to open its page. Click the sea around India to go back to all regions.
 */
export function ExploreMap({ data, region, onRegion }: { data: ExploreData; region: string; onRegion: (r: string) => void }) {
  const router = useRouter();
  const [hover, setHover] = useState<{ shape: Shape; x: number; y: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const groups = useRef<Record<string, SVGGElement | null>>({});
  const zoomG = useRef<SVGGElement>(null);

  const shapes = useMemo<Shape[]>(() => {
    const bySlug = new Map(data.states.map((s) => [s.slug, s]));
    return INDIA_MAP_PATHS.map((p) => {
      const sts = shapeStates(p.id, p.name).map((s) => ({ ...s, guides: bySlug.get(s.slug)?.destinationsCount ?? 0, zone: bySlug.get(s.slug)?.zone ?? null }));
      return { id: p.id, d: p.path, zone: sts[0]?.zone ?? null, states: sts.map(({ name, slug, guides }) => ({ name, slug, guides })) };
    });
  }, [data]);
  const zones = useMemo(() => Array.from(new Set(shapes.map((s) => s.zone).filter(Boolean))) as string[], [shapes]);

  // Zoom to the chosen region's bounding box (with some room around it). Written straight to
  // the DOM: the transform is animated by CSS and nothing else needs to re-render.
  useEffect(() => {
    const zg = zoomG.current;
    if (!zg) return;
    let s = 1, x = 0, y = 0;
    const g = region === "all" ? null : groups.current[region];
    if (g) {
      const b = g.getBBox();
      const pad = 40;
      s = Math.min(3.2, Math.min(VW / (b.width + pad * 2), VH / (b.height + pad * 2)));
      x = VW / 2 - (b.x + b.width / 2) * s;
      y = VH / 2 - (b.y + b.height / 2) * s;
    }
    zg.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
    zg.style.setProperty("--sw", String(1.2 / s));
  }, [region]);

  const move = (e: React.PointerEvent, shape: Shape) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    setHover({ shape, x: e.clientX - r.left, y: e.clientY - r.top });
  };

  return (
    <div ref={box} className="exmap relative">
      <svg viewBox={INDIA_MAP_VIEWBOX} className="h-auto w-full max-h-[520px]" role="img" aria-label="Map of India by region">
        <rect width={VW} height={VH} fill="transparent" onClick={() => onRegion("all")} />
        <g ref={zoomG} className="exmap__zoom">
          {zones.map((z, zi) => (
            <g key={z} ref={(el) => { groups.current[z] = el; }} className="exmap__zone" style={{ ["--z" as string]: zi }}>
              {shapes
                .filter((s) => s.zone === z)
                .map((s) => {
                  const on = region === "all" || region === z;
                  const tint = ZONE_TINT[z] ?? ZONE_TINT.north;
                  const isHover = hover?.shape.id === s.id;
                  const first = s.states[0];
                  return (
                    <path
                      key={s.id}
                      d={s.d}
                      tabIndex={0}
                      role="link"
                      aria-label={`${s.states.map((x) => x.name).join(" and ")}${first ? `, ${first.guides} guides` : ""}`}
                      fill={isHover ? tint.deep : on ? (region === z ? tint.deep : tint.soft) : "#EEF0EC"}
                      fillOpacity={region === z && !isHover ? 0.78 : 1}
                      stroke="#FFFFFF"
                      className="exmap__state"
                      onPointerMove={(e) => move(e, s)}
                      onPointerLeave={() => setHover(null)}
                      onFocus={() => setHover({ shape: s, x: (box.current?.clientWidth ?? 0) / 2, y: 24 })}
                      onBlur={() => setHover(null)}
                      onClick={() => (region === z || region === "all" ? first && router.push(`/india/${first.slug}`) : onRegion(z))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && first) router.push(`/india/${first.slug}`);
                      }}
                    />
                  );
                })}
            </g>
          ))}
        </g>
      </svg>

      {hover ? (
        <div
          className="exmap__tip pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl bg-ink px-3 py-2 text-left text-white shadow-lg"
          style={{ left: hover.x, top: hover.y - 12 }}
        >
          {hover.shape.states.map((s) => (
            <p key={s.slug} className="whitespace-nowrap text-xs">
              <span className="font-semibold">{s.name}</span>
              <span className="text-white/60"> · {s.guides ? `${s.guides} guides` : "State guide"}</span>
            </p>
          ))}
          <p className="mt-0.5 text-[0.625rem] text-white/50">Click to open</p>
        </div>
      ) : null}

      {region !== "all" ? (
        <button type="button" onClick={() => onRegion("all")} className="exmap__back absolute left-0 top-0 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ink shadow-sm ring-1 ring-black/5 hover:text-coral">
          ← All of India
        </button>
      ) : null}
    </div>
  );
}
