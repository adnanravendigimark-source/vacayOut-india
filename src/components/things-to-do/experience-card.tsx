"use client";

import Image from "@/components/media/image";
import Link from "next/link";
import { useRef } from "react";
import { Icon, type Name } from "@/components/icons/icon";
import type { ThingsToDoData } from "@/lib/places/public-lists";

type Item = ThingsToDoData["items"][number];

/**
 * An experience as a tall photo card, matching the Explore India state cards (styles in
 * explore.css): a gentle tilt and light glare towards the mouse, and the summary slides up on
 * hover. Touch and reduced-motion users get a still card with the summary always shown.
 */
export function ExperienceCard({ item, label, icon, fallbackIcon, index }: { item: Item; label: string; icon: Name; fallbackIcon: Name; index: number }) {
  const ref = useRef<HTMLAnchorElement>(null);

  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--rx", `${(0.5 - py) * 7}deg`);
    el.style.setProperty("--ry", `${(px - 0.5) * 9}deg`);
    el.style.setProperty("--gx", `${px * 100}%`);
    el.style.setProperty("--gy", `${py * 100}%`);
  };
  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };

  return (
    <li className="explore-card [perspective:900px]" style={{ ["--i" as string]: Math.min(index, 12) }}>
      <Link ref={ref} href={item.href} onPointerMove={onMove} onPointerLeave={onLeave} className="scard group relative block aspect-[4/5] overflow-hidden rounded-2xl bg-[#1a1714] text-white">
        {item.image ? (
          <Image src={item.image.url} alt={item.image.alt} fill sizes="(min-width: 1024px) 22vw, (min-width: 768px) 30vw, 46vw" className="scard__img object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center text-white/30"><Icon name={fallbackIcon} size={32} /></span>
        )}
        <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/0" />
        <span aria-hidden className="scard__glare" />

        <span className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wider text-white backdrop-blur-md">
            <Icon name={icon} size={11} />
            {label}
          </span>
          {item.image?.kind === "ai_generated" ? <span className="rounded bg-black/60 px-1.5 py-0.5 text-[0.625rem] font-semibold">AI illustration</span> : null}
        </span>

        <span className="absolute inset-x-3.5 bottom-3.5 block">
          <span className="line-clamp-2 block font-serif text-lg leading-tight sm:text-xl">{item.name}</span>
          {item.summary ? <span className="scard__sum mt-1.5 line-clamp-3 block text-xs leading-relaxed text-white/85">{item.summary}</span> : null}
          <span className="mt-2.5 inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[0.6875rem] font-semibold backdrop-blur-md transition-colors group-hover:bg-white group-hover:text-ink">
            <Icon name="pin" size={11} className="shrink-0" />
            <span className="truncate">{item.location}</span>
            <Icon name="arrowRight" size={11} className="shrink-0 transition-transform group-hover:translate-x-0.5" />
          </span>
        </span>
      </Link>
    </li>
  );
}
