"use client";

import { Icon } from "@/components/icons/icon";

export function ManaliMapCard({ name = "Manali" }: { name?: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#E6E3DC] bg-[#EDF3E8] shadow-xs">
      <div className="relative aspect-[16/10] w-full min-h-[220px]">
        {/* Stylized Topographic Map Background */}
        <svg
          viewBox="0 0 400 250"
          className="h-full w-full object-cover select-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Topographic Contour lines pattern */}
            <linearGradient id="terrainGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#DFEAD7" />
              <stop offset="50%" stopColor="#E9F2E2" />
              <stop offset="100%" stopColor="#D8E7CF" />
            </linearGradient>
            <linearGradient id="riverGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#B3D5E8" />
              <stop offset="100%" stopColor="#9BC7DF" />
            </linearGradient>
            <filter id="pinShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.2" />
            </filter>
          </defs>

          {/* Background fill */}
          <rect width="400" height="250" fill="url(#terrainGrad)" />

          {/* Elevation contour rings */}
          <path
            d="M -20,60 Q 60,30 140,70 T 320,50 T 420,80 L 420,-20 L -20,-20 Z"
            fill="#D3E3C9"
            opacity="0.6"
          />
          <path
            d="M -20,110 Q 80,80 180,120 T 350,90 T 420,130 L 420,-20 L -20,-20 Z"
            fill="#C9DCBE"
            opacity="0.4"
          />
          <path
            d="M -20,200 Q 100,230 200,180 T 380,220 L 420,250 L -20,250 Z"
            fill="#C0D6B3"
            opacity="0.5"
          />

          {/* Beas River Winding Stream */}
          <path
            d="M 120,-10 C 130,40 160,80 190,130 C 210,165 205,210 220,260"
            fill="none"
            stroke="url(#riverGrad)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 120,-10 C 130,40 160,80 190,130 C 210,165 205,210 220,260"
            fill="none"
            stroke="#CDE6F4"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* Mountain Roads */}
          <path
            d="M 80,260 C 110,210 150,180 170,140 C 185,110 140,70 120,40"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="4"
            strokeDasharray="4 2"
            opacity="0.8"
          />
          <path
            d="M 195,140 C 250,120 310,100 370,60"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="3.5"
            strokeDasharray="4 2"
            opacity="0.75"
          />

          {/* Solang Valley Marker (North-West) */}
          <g transform="translate(110, 85)">
            <circle cx="0" cy="0" r="4" fill="#60825B" />
            <text
              x="8"
              y="4"
              fontFamily="sans-serif"
              fontSize="11"
              fontWeight="600"
              fill="#2E4A2A"
            >
              Solang Valley
            </text>
          </g>

          {/* Old Manali Marker */}
          <g transform="translate(145, 120)">
            <circle cx="0" cy="0" r="3.5" fill="#60825B" />
            <text
              x="-65"
              y="4"
              fontFamily="sans-serif"
              fontSize="10"
              fontWeight="600"
              fill="#3A5636"
            >
              Old Manali
            </text>
          </g>

          {/* Manali Center Big Red Pin */}
          <g transform="translate(195, 130)" filter="url(#pinShadow)">
            {/* Pin graphic */}
            <path
              d="M 0,0 C -8,-8 -12,-16 -12,-24 C -12,-32 -6,-38 0,-38 C 6,-38 12,-32 12,-24 C 12,-16 8,-8 0,0 Z"
              fill="#D93829"
            />
            <circle cx="0" cy="-24" r="5" fill="#FFFFFF" />

            {/* Label box */}
            <rect
              x="16"
              y="-34"
              width="60"
              height="22"
              rx="6"
              fill="#FFFFFF"
              opacity="0.95"
            />
            <text
              x="22"
              y="-19"
              fontFamily="sans-serif"
              fontSize="12"
              fontWeight="700"
              fill="#191919"
            >
              {name}
            </text>
          </g>
        </svg>

        {/* Floating "View on map" button matching screenshot */}
        <div className="absolute bottom-3 right-3">
          <a
            href="https://www.google.com/maps/search/Manali+Himachal+Pradesh"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#D5D0C6] bg-white/95 px-3 py-1.5 text-xs font-semibold text-ink shadow-xs backdrop-blur-xs transition-colors hover:bg-white hover:text-coral"
          >
            <span>View on map</span>
            <Icon name="map" size={13} className="text-coral" />
          </a>
        </div>
      </div>
    </div>
  );
}
