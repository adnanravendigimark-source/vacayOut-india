/**
 * Shown instantly while the next page loads (Next.js loading.tsx), so a click
 * never looks frozen. Pure markup: no data, no client JavaScript.
 */
const bar = "animate-pulse rounded-lg bg-[#ECE8E0]";

export function PageSkeleton({ variant = "place" }: { variant?: "place" | "hub" | "article" }) {
  return (
    <div aria-busy="true" aria-live="polite" className="bg-[#FBFAF7]">
      <span className="sr-only">Loading…</span>
      <div className={`relative ${variant === "article" ? "h-[18rem]" : "h-[22rem] md:h-[30rem]"} animate-pulse bg-[#E4DFD5]`}>
        <div className="container-site flex h-full flex-col justify-end gap-3 pb-14">
          <div className="h-4 w-40 rounded bg-white/50" />
          <div className="h-12 w-72 max-w-full rounded-lg bg-white/60 md:h-14 md:w-[28rem]" />
          <div className="h-4 w-full max-w-xl rounded bg-white/50" />
          {variant === "place" ? <div className="mt-2 h-12 w-full max-w-xl rounded-full bg-white/70" /> : null}
        </div>
      </div>
      <div className="container-site py-10">
        {variant === "hub" ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-line bg-white">
                <div className="aspect-[4/3] animate-pulse bg-[#ECE8E0]" />
                <div className="space-y-2 p-4"><div className={`${bar} h-4 w-2/3`} /><div className={`${bar} h-3 w-full`} /></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="space-y-4">
              <div className={`${bar} h-7 w-56`} />
              {Array.from({ length: 6 }, (_, i) => <div key={i} className={`${bar} h-4 ${i % 3 === 2 ? "w-2/3" : "w-full"}`} />)}
              <div className="grid gap-3 pt-4 sm:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <div key={i} className={`${bar} h-40`} />)}</div>
            </div>
            <div className="hidden space-y-4 lg:block"><div className={`${bar} h-56`} /><div className={`${bar} h-40`} /></div>
          </div>
        )}
      </div>
    </div>
  );
}
