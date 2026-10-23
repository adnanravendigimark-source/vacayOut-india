import type { BlockOf } from "@/lib/chat/schema";
import { BlockImage, BlockTitle } from "./shared";

/** Tapping a place asks about it in the same conversation instead of navigating away. */
export function AttractionsBlock({ block, onAsk, disabled }: { block: BlockOf<"attractions">; onAsk: (q: string) => void; disabled: boolean }) {
  return (
    <div>
      <BlockTitle icon="palace">{block.title}</BlockTitle>
      <ul className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        {block.items.map((a) => (
          <li key={a.name}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onAsk(`Tell me more about ${a.name}`)}
              className="group block w-full overflow-hidden rounded-xl border border-line bg-white text-left shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-float)] disabled:cursor-not-allowed"
            >
              {a.photo ? <BlockImage photo={a.photo} sizes="(min-width:768px) 13rem, 50vw" className="relative aspect-[16/10]" /> : null}
              <span className="block px-3 py-2.5">
                <span className="block text-[0.8125rem] font-semibold text-ink group-hover:text-forest">{a.name}</span>
                <span className="mt-0.5 block text-[0.75rem] text-muted">{a.category}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
