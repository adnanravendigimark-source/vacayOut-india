"use client";

import type { BlockOf } from "@/lib/chat/schema";
import { PlaceMap } from "@/components/map/place-map";
import { BlockTitle, Card } from "./shared";

export default function MapBlock({ block }: { block: BlockOf<"map"> }) {
  return (
    <Card className="p-4">
      <BlockTitle icon="map">{block.title}</BlockTitle>
      <div className="mt-3">
        <PlaceMap points={block.points} label={`Map: ${block.title}`} height={260} />
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[0.75rem] text-muted">
        {block.points.map((p) => (
          <li key={p.name}>{p.href ? <a href={p.href} className="underline underline-offset-2">{p.name}</a> : p.name}</li>
        ))}
      </ul>
    </Card>
  );
}
