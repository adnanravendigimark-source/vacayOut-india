import Link from "next/link";
import { Icon } from "@/components/icons/icon";
import { GUIDE_HREF_RE } from "@/lib/chat/constants";
import type { BlockOf } from "@/lib/chat/schema";
import { BlockImage } from "./shared";

/**
 * Places as part of the answer: a numbered list in one panel (small photo,
 * name, why it fits), not a grid of big cards. Actions are real: ask to plan
 * it here, or open our guide.
 */
export function PicksBlock({ block, onAsk, disabled }: { block: BlockOf<"picks">; onAsk: (q: string) => void; disabled: boolean }) {
  const names = block.items.map((p) => p.name);
  return (
    <section aria-label={block.title}>
      <h3 className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-[#999999]">{block.title}</h3>
      <ol className="divide-y divide-[#F0ECE6] overflow-hidden rounded-2xl border border-[#ECE9E2] bg-white">
        {block.items.map((p, i) => {
          const href = p.href && GUIDE_HREF_RE.test(p.href) ? p.href : null;
          return (
            <li key={p.name} className="flex min-w-0 items-start gap-3 px-3.5 py-3 transition-colors hover:bg-[#FBFAF7]">
              <span aria-hidden className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[#FDF0EB] text-[0.75rem] font-semibold text-coral">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.9375rem] leading-snug text-ink">
                  <span className="font-semibold">{p.name}</span>
                  {p.place !== "India" && p.place !== p.name ? <span className="text-[0.8125rem] text-muted">, {p.place}</span> : null}
                  <span className="text-ink/80"> — {p.why}</span>
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.75rem] font-semibold">
                  <button type="button" disabled={disabled} onClick={() => onAsk(`Plan a trip to ${p.name}`)} className="rounded-full bg-ink px-2.5 py-0.5 text-white transition-colors hover:bg-coral disabled:opacity-50">
                    Plan this
                  </button>
                  {href ? (
                    <Link href={href} className="inline-flex items-center gap-0.5 text-ink hover:text-coral">
                      Read guide <Icon name="arrowRight" size={12} />
                    </Link>
                  ) : null}
                  {p.tags?.map((t) => (
                    <span key={t} className="font-medium text-[#999999]">#{t.toLowerCase()}</span>
                  ))}
                </div>
              </div>
              {p.photo ? <BlockImage photo={p.photo} sizes="64px" className="relative size-14 shrink-0 rounded-xl sm:size-16" /> : null}
            </li>
          );
        })}
      </ol>
      {names.length >= 2 && !block.compared ? (
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" disabled={disabled} onClick={() => onAsk(`Compare ${names.slice(0, 3).join(", ")}`)} className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E2DC] bg-white px-3.5 py-1.5 text-[0.75rem] font-semibold text-ink transition-colors hover:border-ink disabled:opacity-50">
            Compare top {Math.min(3, names.length)}
          </button>
        </div>
      ) : null}
    </section>
  );
}
