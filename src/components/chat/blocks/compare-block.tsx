import type { BlockOf } from "@/lib/chat/schema";

/**
 * Side-by-side table. The verdict is the answer text right above it. The table
 * scrolls sideways inside its own box on small screens while the first column
 * (what is being compared) stays put.
 */
export function CompareBlock({ block }: { block: BlockOf<"compare"> }) {
  const n = block.columns.length;
  return (
    <figure className="overflow-hidden rounded-2xl border border-line bg-white">
      <div className="overflow-x-auto overscroll-x-contain" tabIndex={0} role="region" aria-label={`${block.title} table`}>
        <table className={`w-full border-collapse text-left ${n > 2 ? "min-w-[34rem]" : "min-w-[22rem]"}`}>
          <caption className="sr-only">{block.title}</caption>
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="sticky left-0 z-10 w-[6.5rem] bg-[#FBFAF8] px-3 py-3 sm:w-[9rem] sm:px-4">
                <span className="sr-only">Aspect</span>
              </th>
              {block.columns.map((c) => (
                <th key={c} scope="col" className="bg-[#FBFAF8] px-3 py-3 font-serif text-[1.0625rem] font-normal text-ink sm:px-4">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((r) => (
              <tr key={r.label} className="border-t border-line-subtle align-top first:border-t-0">
                <th scope="row" className="sticky left-0 z-10 bg-white px-3 py-2.5 text-[0.8125rem] font-semibold leading-snug text-[#555555] shadow-[1px_0_0_#ECEAE4] sm:px-4">{r.label}</th>
                {r.values.map((v, i) => (
                  <td key={i} className="px-3 py-2.5 text-[0.9375rem] leading-snug text-ink sm:px-4">{v || "—"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {n > 2 ? <figcaption className="border-t border-line-subtle px-3 py-1.5 text-[0.75rem] text-[#666666] sm:hidden">Swipe the table to see all {n} places</figcaption> : null}
    </figure>
  );
}
