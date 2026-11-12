import type { BlockOf } from "@/lib/chat/schema";

/** Side-by-side table. Scrolls sideways inside its own box on small screens; the first column stays put. */
export function CompareBlock({ block }: { block: BlockOf<"compare"> }) {
  const wide = block.columns.length > 2;
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white shadow-[var(--shadow-card)]">
      {wide ? <p className="px-3 pt-2 text-[0.6875rem] text-muted sm:hidden">Swipe the table to see all {block.columns.length} places →</p> : null}
      <div className="overflow-x-auto">
        <table className={`w-full border-collapse ${wide ? "min-w-[32rem]" : ""} text-left text-[0.8125rem]`}>
          <caption className="sr-only">{block.title}</caption>
          <thead>
            <tr className="bg-sand/70">
              <th scope="col" className="sticky left-0 w-[5.5rem] bg-sand px-2.5 py-2.5 sm:w-[8.5rem] sm:px-3.5 text-[0.75rem] font-semibold text-muted">
                <span className="sr-only">Aspect</span>
              </th>
              {block.columns.map((c) => (
                <th key={c} scope="col" className="px-2.5 py-2.5 sm:px-3.5 text-[0.875rem] font-semibold text-ink">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((r) => (
              <tr key={r.label} className="border-t border-line align-top">
                <th scope="row" className="sticky left-0 bg-white px-2.5 py-2.5 text-[0.75rem] sm:px-3.5 font-semibold text-muted">{r.label}</th>
                {r.values.map((v, i) => (
                  <td key={i} className="px-2.5 py-2.5 sm:px-3.5 leading-snug text-ink/85">{v || "—"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
