"use client";

import Link from "next/link";
import { useState } from "react";
import {
  INDIA_MAP_VIEWBOX,
  INDIA_MAP_PATHS,
  MAP_BADGES,
} from "./india-map-data";

const ZONE_COLORS: Record<
  string,
  { base: string; stroke: string; active: string; borderActive: string }
> = {
  north: {
    base: "#CFE3D5",
    stroke: "#BED6C4",
    active: "#9ECBAE",
    borderActive: "#1F4D3F",
  },
  central: {
    base: "#BEDBC7",
    stroke: "#B2D0BA",
    active: "#92C2A6",
    borderActive: "#1F4D3F",
  },
  east: {
    base: "#C9DFD0",
    stroke: "#B8D4C0",
    active: "#9DC8AA",
    borderActive: "#1F4D3F",
  },
  west: {
    base: "#DFE8DC",
    stroke: "#BED6C4",
    active: "#B8D8BD",
    borderActive: "#1F4D3F",
  },
  south: {
    base: "#B4D5C0",
    stroke: "#A5C9B7",
    active: "#84B796",
    borderActive: "#1F4D3F",
  },
  northeast: {
    base: "#C6E1D0",
    stroke: "#BED6C4",
    active: "#95C7A5",
    borderActive: "#1F4D3F",
  },
  islands: {
    base: "#B4D5C0",
    stroke: "#A5C9B7",
    active: "#84B796",
    borderActive: "#1F4D3F",
  },
};

interface IndiaRegionalMapProps {
  activeZone?: string | null;
  onHoverZone?: (zone: string | null) => void;
  className?: string;
}

export function IndiaRegionalMap({
  activeZone: controlledZone,
  onHoverZone,
  className = "",
}: IndiaRegionalMapProps) {
  const [internalZone, setInternalZone] = useState<string | null>(null);
  const currentZone = controlledZone !== undefined ? controlledZone : internalZone;

  const handleZoneHover = (zone: string | null) => {
    setInternalZone(zone);
    onHoverZone?.(zone);
  };

  return (
    <div
      className={`relative flex items-center justify-center p-2 sm:p-3 rounded-2xl bg-[#F6F8F5] border border-[#E8EDE6] h-full min-h-[360px] sm:min-h-[420px] overflow-hidden ${className}`}
    >
      <svg
        viewBox={INDIA_MAP_VIEWBOX}
        className="w-full h-full max-h-[430px] drop-shadow-xs transition-transform duration-300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Map of India showing North, West, Central, East, Northeast, and South regions"
        role="img"
      >
        <defs>
          <filter id="badge-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.12" />
          </filter>
        </defs>

        {/* States grouped by region */}
        <g id="india-states">
          {INDIA_MAP_PATHS.map((item) => {
            const isZoneActive = currentZone === item.zone;
            const colors = ZONE_COLORS[item.zone] || ZONE_COLORS.central;
            const fill = isZoneActive ? colors.active : colors.base;

            return (
              <path
                key={item.id}
                id={`state-${item.id}`}
                d={item.path}
                fill={fill}
                stroke="#FFFFFF"
                strokeWidth={isZoneActive ? "1.5" : "1.1"}
                strokeLinejoin="round"
                strokeLinecap="round"
                className="transition-colors duration-200 cursor-pointer"
                onMouseEnter={() => handleZoneHover(item.zone === "islands" ? "south" : item.zone)}
                onMouseLeave={() => handleZoneHover(null)}
              >
                <title>{`${item.name} (${item.zone})`}</title>
              </path>
            );
          })}
        </g>

        {/* Regional Badges Overlaid Directly onto the Map */}
        <g id="map-badges">
          {MAP_BADGES.map((badge) => {
            const isActive = currentZone === badge.zone;
            const badgeWidth = 92;
            const badgeHeight = 27;
            const rx = 13.5;

            return (
              <Link
                key={badge.zone}
                href={`/india?zone=${badge.zone}`}
                onMouseEnter={() => handleZoneHover(badge.zone)}
                onMouseLeave={() => handleZoneHover(null)}
                aria-label={`${badge.label} India (${badge.count} states and UTs)`}
              >
                <g
                  transform={`translate(${badge.x - badgeWidth / 2}, ${badge.y - badgeHeight / 2})`}
                  filter="url(#badge-shadow)"
                  className="cursor-pointer group"
                >
                  {/* Badge pill background */}
                  <rect
                    width={badgeWidth}
                    height={badgeHeight}
                    rx={rx}
                    fill="#FFFFFF"
                    stroke={isActive ? "#E8553E" : "#BED6C4"}
                    strokeWidth={isActive ? "1.8" : "1.1"}
                    fillOpacity="0.97"
                    className="transition-all duration-200 group-hover:stroke-coral"
                  />
                  {/* Badge Label text */}
                  <text
                    x={badgeWidth / 2}
                    y={17.5}
                    textAnchor="middle"
                    fontSize="12"
                    fontFamily="inherit"
                    fontWeight="700"
                    fill={isActive ? "#E8553E" : "#1C201D"}
                    className="select-none transition-colors duration-200 group-hover:fill-coral"
                  >
                    {badge.label}{" "}
                    <tspan fontWeight="400" fill="#666666">
                      ({badge.count})
                    </tspan>
                  </text>
                </g>
              </Link>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

