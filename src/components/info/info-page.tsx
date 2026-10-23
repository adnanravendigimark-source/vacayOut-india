import Link from "next/link";

type Block = { heading?: string; paragraphs?: string[]; list?: string[] };

/** Simple text page (About, policies). Plain React text only — no HTML is injected. */
export function InfoPage({ eyebrow, title, intro, blocks, note }: { eyebrow: string; title: string; intro: string; blocks: Block[]; note?: string }) {
  return (
    <article className="bg-[#FBFAF7]">
      <header className="border-b border-line bg-white">
        <div className="container-site max-w-3xl py-12 sm:py-16">
          <p className="eyebrow mb-3 text-coral">{eyebrow}</p>
          <h1 className="font-serif text-[clamp(2rem,4vw,2.75rem)] font-medium leading-tight text-ink">{title}</h1>
          <p className="mt-4 text-[1.0625rem] leading-relaxed text-muted">{intro}</p>
        </div>
      </header>
      <div className="container-site max-w-3xl space-y-8 py-10 sm:py-14">
        {note ? <p className="rounded-xl border border-dashed border-line bg-white px-4 py-3 text-sm text-muted">{note}</p> : null}
        {blocks.map((b, i) => (
          <section key={i} className="space-y-3">
            {b.heading ? <h2 className="font-serif text-xl font-medium text-ink">{b.heading}</h2> : null}
            {b.paragraphs?.map((p, j) => <p key={j} className="leading-relaxed text-[#444]">{p}</p>)}
            {b.list ? (
              <ul className="list-disc space-y-1.5 pl-5 leading-relaxed text-[#444]">
                {b.list.map((x) => <li key={x}>{x}</li>)}
              </ul>
            ) : null}
          </section>
        ))}
        <p className="border-t border-line pt-6 text-sm text-muted">
          Questions? Write to <a href="mailto:hello@vacayout.in" className="font-semibold text-coral hover:underline">hello@vacayout.in</a> · <Link href="/" className="font-semibold text-coral hover:underline">Back to VacayOut</Link>
        </p>
      </div>
    </article>
  );
}
