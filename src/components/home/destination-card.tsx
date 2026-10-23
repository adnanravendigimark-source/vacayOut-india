import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/icons/icon";
import type { Destination } from "@/lib/data/types";
import { routes } from "@/lib/routes";

export const planPrompt = (d: Destination) => (d.level === "state" ? `Plan a trip to ${d.name}` : `Plan a trip to ${d.name}, ${d.stateName}`);

/** A published destination: photo (credited or labelled AI), name, summary, guide link and "Plan trip". */
export function DestinationCard({ d, onPlan, meta, large = false }: { d: Destination; onPlan?: (prompt: string) => void; meta?: string; large?: boolean }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card transition-all duration-500 hover:-translate-y-1 hover:shadow-card-hover">
      <div className={`relative overflow-hidden ${large ? "aspect-[16/9]" : "aspect-[3/2]"}`}>
        {d.photo ? (
          <Image src={d.photo.src} alt={d.photo.alt} fill sizes={large ? "(min-width: 1024px) 66vw, 100vw" : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"} className="object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-sand text-muted/50"><Icon name="mountain" size={40} /></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
        <div className="absolute inset-x-4 top-4 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-3 py-1 text-xs font-medium text-white/95 backdrop-blur-md">
            <Icon name="pin" size={13} className="text-coral" />
            {d.level === "state" ? "India" : d.stateName}
          </span>
          {d.aiImage ? <span className="rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">AI-generated illustration</span> : null}
        </div>
        <div className="absolute inset-x-4 bottom-4 text-white">
          {d.tagline ? <p className="text-xs font-medium uppercase tracking-wider text-white/80">{d.tagline}</p> : null}
          <h3 className={`mt-0.5 font-serif font-medium text-white ${large ? "text-2xl" : "text-xl"}`}>{d.name}</h3>
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-between p-4">
        {meta ? <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-coral">{meta}</p> : null}
        <p className="line-clamp-2 text-sm leading-relaxed text-[#555555]">{d.description}</p>
        <div className="mt-4 flex items-center justify-between border-t border-line-subtle pt-3">
          {d.sample ? (
            <span className="text-xs font-semibold uppercase tracking-wide text-muted/70">Guide coming soon</span>
          ) : (
            <Link href={routes.destination(d)} className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted transition-colors hover:text-ink after:absolute after:inset-0">
              <span>Read the guide</span>
              <Icon name="arrowRight" size={14} />
            </Link>
          )}
          {onPlan ? (
            <button type="button" onClick={() => onPlan(planPrompt(d))} className="relative z-10 inline-flex items-center gap-1.5 rounded-full bg-coral/10 px-3.5 py-1.5 text-xs font-semibold text-coral transition-all duration-200 hover:bg-coral hover:text-white">
              <Icon name="sparkles" size={13} />
              <span>Plan trip</span>
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
