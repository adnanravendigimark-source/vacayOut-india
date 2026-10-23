"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { TILE_ATTRIBUTION, TILE_URL, type MapPoint } from "@/lib/map";

/**
 * OpenStreetMap via Leaflet, loaded only in the browser. Popups are built
 * from DOM nodes with textContent (never HTML strings), and links are limited
 * to our own /india pages. The list next to the map carries the same
 * information for keyboard and screen-reader users.
 */
export function PlaceMap({ points, label, height = 320 }: { points: MapPoint[]; label: string; height?: number }) {
  const el = useRef<HTMLDivElement>(null);
  const key = JSON.stringify(points);

  useEffect(() => {
    let cancelled = false;
    let map: import("leaflet").Map | null = null;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !el.current) return;
      const pts: MapPoint[] = JSON.parse(key);
      map = L.map(el.current, { scrollWheelZoom: false, attributionControl: true });
      L.tileLayer(TILE_URL, { maxZoom: 18, attribution: TILE_ATTRIBUTION }).addTo(map);
      const layer = L.featureGroup();
      for (const p of pts) {
        const popup = document.createElement("div");
        if (p.href && /^\/india\//.test(p.href)) {
          const a = document.createElement("a");
          a.href = p.href;
          a.textContent = p.name;
          a.style.fontWeight = "600";
          popup.appendChild(a);
        } else {
          popup.textContent = p.name;
        }
        L.circleMarker([p.lat, p.lng], {
          radius: p.primary ? 9 : 7,
          color: "#ffffff",
          weight: 2,
          fillColor: p.primary ? "#e8553e" : "#1f4d3f",
          fillOpacity: 1,
        })
          .bindPopup(popup)
          .bindTooltip(p.name)
          .addTo(layer);
      }
      layer.addTo(map);
      if (pts.length === 1) map.setView([pts[0].lat, pts[0].lng], 12);
      else map.fitBounds(layer.getBounds(), { padding: [28, 28], maxZoom: 13 });
    })();
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [key]);

  if (!points.length) return null;
  return <div ref={el} role="region" aria-label={label} style={{ height }} className="isolate z-0 w-full overflow-hidden rounded-2xl border border-line bg-sand" />;
}
