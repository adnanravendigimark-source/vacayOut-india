import Link from "next/link";
import { Icon } from "@/components/icons/icon";
import { GUIDE_HREF_RE } from "@/lib/chat/constants";
import type { BlockOf } from "@/lib/chat/schema";
import { BlockImage } from "./shared";

/**
 * Places as part of the answer: a numbered list in one panel (small photo,
 * name, why it fits). Actions are real: ask to plan it here, or open our
 * guide. When a comparison already describes the places, only guide links show.
 */
export function PicksBlock({ block, onAsk, disabled }: { block: BlockOf<"picks">; onAsk: (q: string) => void; disabled: boolean }) {
  const names = block.items.map((p) => p.name);
  const guide = (p: (typeof block.items)[number]) => (p.href && GUIDE_HREF_RE.test(p.href) ? p.href : null);

  if (block.display === "chips") {
    const linked = block.items.filter((p) => guide(p));
    if (!linked.length) return null;
    return (
      <nav aria-label={block.title} className="flex flex-wrap items-center gap-2">
        <span className="text-[0.8125rem] text-[#666666]">{block.title}:</span>
        {linked.map((p) => (
          <Link key={p.name} href={guide(p)!} className="inline-flex h-8 items-center gap-1 rounded-full border border-line bg-white px-3 font-serif text-[0.9375rem] text-ink transition-colors hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
            {p.name}
            <Icon name="arrowRight" size={13} className="text-[#666666]" />
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <section aria-label={block.title}>
      <h3 className="mb-2 text-[0.8125rem] font-semibold text-[#666666]">{block.title}</h3>
      <ol className="divide-y divide-line-subtle overflow-hidden rounded-2xl border border-line bg-white">
        {block.items.map((p, i) => {
          const href = guide(p);
          return (
            <li key={p.name} className="flex min-w-0 items-start gap-3 px-4 py-3.5">
              <span aria-hidden className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-sand text-[0.75rem] font-semibold tabular-nums text-ink">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="leading-snug">
                  <span className="font-serif text-[1.0625rem] text-ink">{p.name}</span>
                  {p.place !== "India" && p.place !== p.name ? <span className="text-[0.8125rem] text-[#666666]">, {p.place}</span> : null}
                </p>
                <p className="mt-0.5 text-[0.9375rem] leading-relaxed text-[#444444]">{p.why}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[0.8125rem]">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onAsk(`Plan a trip to ${p.name}`)}
                    className="inline-flex h-8 items-center rounded-full border border-line bg-white px-3 font-semibold text-ink transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  >
                    Plan this
                  </button>
                  {href ? (
                    <Link href={href} className="inline-flex h-8 items-center gap-1 font-semibold text-ink underline-offset-4 hover:underline">
                      Read guide <Icon name="arrowRight" size={13} />
                    </Link>
                  ) : null}
                  {p.tags?.length ? <span className="text-[#666666]">{p.tags.join(" · ")}</span> : null}
                </div>
                {p.photo && p.credit ? <p className="mt-1 text-[0.75rem] text-[#767676]">Photo: {p.credit}</p> : null}
              </div>
              {p.photo ? <BlockImage photo={p.photo} sizes="64px" className="relative size-14 shrink-0 rounded-xl sm:size-16" /> : null}
            </li>
          );
        })}
      </ol>
      {names.length >= 2 && !block.compared ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onAsk(`Compare ${names.slice(0, 3).join(", ")}`)}
          className="mt-2 inline-flex h-8 items-center rounded-full border border-line bg-white px-3.5 text-[0.8125rem] font-semibold text-ink transition-colors hover:border-ink disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Compare top {Math.min(3, names.length)}
        </button>
      ) : null}
    </section>
  );
}
