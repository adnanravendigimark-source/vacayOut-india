"use client";

import dynamic from "next/dynamic";
import type { Block } from "@/lib/chat/schema";
import { AttractionsBlock } from "./attractions-block";
import { DestinationBlock } from "./destination-block";
import { BookingsBlock, BudgetBlock, FoodBlock, ReachBlock, StayBlock, TipsBlock } from "./info-blocks";
import { ItineraryBlock } from "./itinerary-block";
import { BestTimeBlock, FaqsBlock, NoticeBlock, SourcesBlock, SuggestionsBlock, TextBlock } from "./misc-blocks";

/** Leaflet only loads when an answer actually includes a map. */
const MapBlock = dynamic(() => import("./map-block"), { ssr: false, loading: () => <div className="h-[260px] rounded-xl bg-sand" /> });

const INFO = new Set(["reach", "stay", "food", "budget", "bookings", "tips"]);

function InfoBlock({ block }: { block: Block }) {
  switch (block.type) {
    case "reach": return <ReachBlock block={block} />;
    case "stay": return <StayBlock block={block} />;
    case "food": return <FoodBlock block={block} />;
    case "budget": return <BudgetBlock block={block} />;
    case "bookings": return <BookingsBlock block={block} />;
    case "tips": return <TipsBlock block={block} />;
    default: return null;
  }
}

/** Renders an answer; consecutive info cards are laid out together in a grid. */
export function BlockList({ blocks, onAsk, busy }: { blocks: Block[]; onAsk: (q: string) => void; busy: boolean }) {
  const groups: (Block | Block[])[] = [];
  for (const b of blocks) {
    const last = groups[groups.length - 1];
    if (INFO.has(b.type)) {
      if (Array.isArray(last)) last.push(b);
      else groups.push([b]);
    } else groups.push(b);
  }

  return (
    <div className="space-y-5">
      {groups.map((g, i) => {
        if (Array.isArray(g)) {
          return (
            <div key={i} className={`grid gap-3 ${g.length > 1 ? "md:grid-cols-2" : ""}`}>
              {g.map((b, j) => <InfoBlock key={j} block={b} />)}
            </div>
          );
        }
        switch (g.type) {
          case "text": return <TextBlock key={i} block={g} />;
          case "destination": return <DestinationBlock key={i} block={g} />;
          case "attractions": return <AttractionsBlock key={i} block={g} onAsk={onAsk} disabled={busy} />;
          case "itinerary": return <ItineraryBlock key={i} block={g} />;
          case "bestTime": return <BestTimeBlock key={i} block={g} />;
          case "faqs": return <FaqsBlock key={i} block={g} />;
          case "suggestions": return <SuggestionsBlock key={i} block={g} onAsk={onAsk} disabled={busy} />;
          case "notice": return <NoticeBlock key={i} block={g} />;
          case "sources": return <SourcesBlock key={i} block={g} />;
          case "map": return <MapBlock key={i} block={g} />;
          default: return null;
        }
      })}
    </div>
  );
}
