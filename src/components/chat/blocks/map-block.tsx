"use client";

import { useState } from "react";
import { Icon } from "@/components/icons/icon";
import type { BlockOf } from "@/lib/chat/schema";
import { PlaceMap } from "@/components/map/place-map";

/** Folded by default: a small "View on map" button; Leaflet only renders once opened. */
export default function MapBlock({ block }: { block: BlockOf<"map"> }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E2DC] bg-white px-3.5 py-1.5 text-[0.75rem] font-semibold text-ink transition-colors hover:border-ink"
      >
        <Icon name="map" size={14} className="text-coral" />
        {open ? "Hide map" : `View on map (${block.points.length})`}
      </button>
      {open ? (
        <div className="cx-in mt-2 overflow-hidden rounded-2xl border border-[#ECE9E2]">
          <PlaceMap points={block.points} label={`Map: ${block.title}`} height={220} />
        </div>
      ) : null}
    </div>
  );
}
