import Link from "next/link";
import { Icon } from "@/components/icons/icon";
import { GUIDE_HREF_RE } from "@/lib/chat/constants";
import type { BlockOf } from "@/lib/chat/schema";
import { BlockImage } from "./shared";

export function DestinationBlock({ block }: { block: BlockOf<"destination"> }) {
  return (
    <div className="relative isolate overflow-hidden rounded-2xl">
      <BlockImage photo={block.photo} sizes="(min-width:1024px) 52rem, 100vw" className="absolute inset-0 -z-20" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(14,28,24,0.8)_0%,rgba(14,28,24,0.5)_45%,rgba(14,28,24,0.1)_80%)]" />
      {block.climate ? (
        <div className="absolute right-3 top-3 hidden items-center gap-2 rounded-full bg-white/95 px-3.5 py-1.5 shadow sm:flex">
          <Icon name="sun" size={22} className="text-amber-500" />
          <div className="leading-tight">
            <p className="text-[0.75rem] font-semibold text-ink">{block.climate.range}</p>
            <p className="text-[0.625rem] text-muted">{block.climate.label}</p>
          </div>
        </div>
      ) : null}
      <div className="px-5 py-8 text-white sm:px-7 sm:py-10">
        <p className="flex items-center gap-1.5 text-[0.875rem] font-medium">
          <Icon name="pin" size={16} />
          {block.stateName}
        </p>
        <p className="mt-1 font-serif text-[clamp(2rem,4vw,2.75rem)] font-medium leading-none">{block.name}</p>
        <p className="mt-2 text-[0.9375rem] text-white/95">{block.tagline}</p>
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[0.8125rem] font-medium">
          {block.days ? (
            <li className="flex items-center gap-1.5">
              <Icon name="clock" size={15} />
              {block.days} {block.days === 1 ? "Day" : "Days"}
            </li>
          ) : null}
          {block.group ? (
            <li className="flex items-center gap-1.5">
              <Icon name="family" size={15} />
              {block.group}
            </li>
          ) : null}
          {block.bestTime ? (
            <li className="flex items-center gap-1.5">
              <Icon name="calendar" size={15} />
              Best Time: {block.bestTime}
            </li>
          ) : null}
        </ul>
        {block.href && GUIDE_HREF_RE.test(block.href) ? (
          <Link href={block.href} className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[0.8125rem] font-semibold text-ink hover:bg-white/90">
            Read the VacayOut guide <Icon name="arrowRight" size={14} />
          </Link>
        ) : null}
      </div>
      {block.credit ? <p className="absolute bottom-1.5 right-3 max-w-[70%] truncate text-[0.625rem] text-white/80">Photo: {block.credit}</p> : null}
    </div>
  );
}
