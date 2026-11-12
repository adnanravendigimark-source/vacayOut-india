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
      <h3 className="mb-1.5 text-[0.75rem] font-semibold uppercase tracking-wide text-muted">{block.title}</h3>
      <ol className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
        {block.items.map((p, i) => {
          const href = p.href && GUIDE_HREF_RE.test(p.href) ? p.href : null;
          return (
            <li key={p.name} className="flex min-w-0 items-start gap-3 px-3 py-2.5">
              <span aria-hidden className="mt-0.5 w-4 shrink-0 text-right text-[0.8125rem] font-semibold text-coral">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.9375rem] leading-snug text-ink">
                  <span className="font-semibold">{p.name}</span>
                  {p.place !== "India" && p.place !== p.name ? <span className="text-[0.8125rem] text-muted">, {p.place}</span> : null}
                  <span className="text-ink/80"> — {p.why}</span>
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.75rem] font-semibold">
                  <button type="button" disabled={disabled} onClick={() => onAsk(`Plan a trip to ${p.name}`)} className="text-coral hover:underline disabled:opacity-50">
                    Plan this
                  </button>
                  {href ? (
                    <Link href={href} className="inline-flex items-center gap-0.5 text-forest hover:underline">
                      Read guide <Icon name="arrowRight" size={12} />
                    </Link>
                  ) : null}
                  {p.tags?.map((t) => (
                    <span key={t} className="font-medium text-muted">#{t.toLowerCase()}</span>
                  ))}
                </div>
              </div>
              {p.photo ? <BlockImage photo={p.photo} sizes="64px" className="relative size-14 shrink-0 rounded-lg sm:size-16" /> : null}
            </li>
          );
        })}
      </ol>
      {names.length >= 2 && !block.compared ? (
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" disabled={disabled} onClick={() => onAsk(`Compare ${names.slice(0, 3).join(", ")}`)} className="rounded-full border border-line bg-white px-3 py-1 text-[0.75rem] font-medium text-ink hover:border-forest disabled:opacity-50">
            Compare top {Math.min(3, names.length)}
          </button>
        </div>
      ) : null}
    </section>
  );
}
