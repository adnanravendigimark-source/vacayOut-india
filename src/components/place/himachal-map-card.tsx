"use client";

import { Icon } from "@/components/icons/icon";

export function HimachalMapCard({ stateName = "Himachal Pradesh" }: { stateName?: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#E6E3DC] bg-[#F2F6EF] shadow-xs">
      <div className="relative aspect-[16/11] w-full min-h-[230px]">
        {/* Stylized Regional State Map Vector */}
        <svg
          viewBox="0 0 400 275"
          className="h-full w-full object-cover select-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="stateShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
            </filter>
            <filter id="statePinShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.25" />
            </filter>
          </defs>

          {/* Canvas base */}
          <rect width="400" height="275" fill="#F4F8F1" />

          {/* Surrounding State Outlines (Subtle beige/green-grey borders) */}
          {/* Jammu & Kashmir (North-West) */}
          <path
            d="M 50,20 L 140,20 L 175,70 L 140,115 L 75,115 L 40,80 Z"
            fill="#EAF1E7"
            stroke="#D6E2D2"
            strokeWidth="1.5"
          />
          <text
            x="70"
            y="55"
            fontFamily="sans-serif"
            fontSize="10"
            fontWeight="600"
            fill="#6A7D66"
          >
            Jammu &
          </text>
          <text
            x="70"
            y="68"
            fontFamily="sans-serif"
            fontSize="10"
            fontWeight="600"
            fill="#6A7D66"
          >
            Kashmir
          </text>

          {/* Ladakh (North-East) */}
          <path
            d="M 175,20 L 370,20 L 370,120 L 260,115 L 175,70 Z"
            fill="#EFF5EC"
            stroke="#D6E2D2"
            strokeWidth="1.5"
          />
          <text
            x="270"
            y="55"
            fontFamily="sans-serif"
            fontSize="11"
            fontWeight="600"
            fill="#6A7D66"
          >
            Ladakh
          </text>

          {/* Punjab (West) */}
          <path
            d="M 20,115 L 140,115 L 130,220 L 30,220 Z"
            fill="#EBF2E8"
            stroke="#D6E2D2"
            strokeWidth="1.5"
          />
          <text
            x="60"
            y="170"
            fontFamily="sans-serif"
            fontSize="11"
            fontWeight="600"
            fill="#6A7D66"
          >
            Punjab
          </text>

          {/* Uttarakhand (South-East) */}
          <path
            d="M 235,175 L 340,150 L 380,240 L 245,260 Z"
            fill="#EDF4EA"
            stroke="#D6E2D2"
            strokeWidth="1.5"
          />
          <text
            x="265"
            y="215"
            fontFamily="sans-serif"
            fontSize="11"
            fontWeight="600"
            fill="#6A7D66"
          >
            Uttarakhand
          </text>

          {/* Himachal Pradesh Shape (Highlighted vibrant sage green) */}
          <path
            d="M 140,110 
               C 150,90 170,75 190,75 
               C 215,75 235,90 255,100 
               C 270,110 275,130 265,150 
               C 260,165 245,180 230,190 
               C 215,200 195,195 180,185 
               C 165,175 150,175 140,165 
               C 130,155 130,125 140,110 Z"
            fill="#A3D4AA"
            stroke="#7CB585"
            strokeWidth="2"
            filter="url(#stateShadow)"
          />

          {/* Internal shading & contours */}
          <path
            d="M 155,115 C 175,95 210,105 240,120 C 250,145 235,170 215,180 C 185,185 160,160 155,115 Z"
            fill="#B5DFBC"
            opacity="0.6"
          />

          {/* Pin in Himachal Pradesh */}
          <g transform="translate(195, 135)" filter="url(#statePinShadow)">
            <path
              d="M 0,0 C -6,-6 -9,-12 -9,-18 C -9,-24 -5,-28 0,-28 C 5,-28 9,-24 9,-18 C 9,-12 6,-6 0,0 Z"
              fill="#D93829"
            />
            <circle cx="0" cy="-18" r="3.5" fill="#FFFFFF" />
            <circle cx="0" cy="-18" r="1.5" fill="#D93829" />
          </g>

          {/* Central State Label */}
          <text
            x="200"
            y="112"
            textAnchor="middle"
            fontFamily="sans-serif"
            fontSize="12"
            fontWeight="700"
            fill="#1E381C"
          >
            {stateName}
          </text>
        </svg>

        {/* Floating "View full map" button matching Image 2 */}
        <div className="absolute bottom-3 right-3">
          <a
            href="https://www.google.com/maps/search/Himachal+Pradesh"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#D5D0C6] bg-white/95 px-3 py-1.5 text-xs font-semibold text-ink shadow-xs backdrop-blur-xs transition-colors hover:bg-white hover:text-coral"
          >
            <span>View full map</span>
            <Icon name="map" size={13} className="text-coral" />
          </a>
        </div>
      </div>
    </div>
  );
}
