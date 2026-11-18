"use client";

import Image from "@/components/media/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon, type Name } from "@/components/icons/icon";
import type { CardImage } from "@/lib/places/public-lists";
import "./ai-banner.css";

export type AiBannerPick = { href: string; name: string; meta: string; image: CardImage | null };
export type AiBannerChip = { key: string; label: string; icon: Name; prompt: string };

/**
 * The "ask the AI planner" banner used across the hub pages. Left: title, interest chips that
 * open the planner with that interest, and one main button. Right: a short example chat whose
 * answer lists real cards from the page (never invented ones). It plays once when scrolled into
 * view, and again when `replayKey` changes (e.g. a new filter).
 */
export function AiBanner({
  title,
  accent,
  text,
  chips = [],
  chipsLabel = "Start with what you like",
  cta,
  question,
  answer,
  picks = [],
  replayKey = "",
  onAsk,
  className = "",
}: {
  /** Title text; `accent` is the word shown in coral italics and must appear in `title`. */
  title: string;
  accent?: string;
  text: string;
  chips?: AiBannerChip[];
  chipsLabel?: string;
  cta: { label: string; prompt: string };
  question: string;
  answer: string;
  picks?: AiBannerPick[];
  replayKey?: string;
  onAsk: (prompt: string) => void;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => {
      if (e.some((x) => x.isIntersecting)) {
        setSeen(true);
        io.disconnect();
      }
    }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const at = accent ? title.indexOf(accent) : -1;
  const heading = at < 0 ? title : (
    <>
      {title.slice(0, at)}
      <em className="italic text-coral">{accent}</em>
      {title.slice(at + accent!.length)}
    </>
  );

  return (
    <section ref={ref} data-seen={seen} aria-label="Plan with the AI planner" className={`aip relative isolate overflow-hidden rounded-3xl border border-[#F3DED4] p-6 sm:p-8 lg:p-10 ${className}`}>
      <span aria-hidden className="aip__blob aip__blob--a" />
      <span aria-hidden className="aip__blob aip__blob--b" />

      <div className={`relative grid items-center gap-8 ${picks.length ? "lg:grid-cols-[1.1fr_1fr] lg:gap-12" : ""}`}>
        <div>
          <p className="aip-up inline-flex items-center gap-2 rounded-full border border-[#F0DDD3] bg-white/80 px-3 py-1 text-xs font-semibold text-[#666666]" style={{ ["--d" as string]: "0ms" }}>
            <span className="aip__live size-1.5 rounded-full bg-coral" /> AI trip planner
          </p>
          <h2 className="aip-up mt-3 font-serif text-[clamp(1.75rem,3vw,2.4rem)] font-normal leading-[1.08] tracking-[-0.02em] text-ink" style={{ ["--d" as string]: "80ms" }}>
            {heading}
          </h2>
          <p className="aip-up mt-2 max-w-md text-sm leading-relaxed text-[#555555] sm:text-[0.9375rem]" style={{ ["--d" as string]: "160ms" }}>
            {text}
          </p>

          {chips.length ? (
            <div className="aip-up mt-5" style={{ ["--d" as string]: "240ms" }}>
              <p className="text-xs font-semibold text-[#888888]">{chipsLabel}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {chips.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => onAsk(c.prompt)}
                    className="aip-chip inline-flex items-center gap-1.5 rounded-full border border-[#EEDCD2] bg-white px-3 py-1.5 text-xs font-medium text-ink hover:border-coral hover:text-coral"
                  >
                    <Icon name={c.icon} size={13} className="text-coral" />
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => onAsk(cta.prompt)}
            className="aip-go aip-up mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-black"
            style={{ ["--d" as string]: "320ms" }}
          >
            <Icon name="sparkles" size={16} className="text-coral" />
            {cta.label}
            <Icon name="arrowRight" size={15} className="aip-go__arrow" />
          </button>
        </div>

        {/* Example chat built from the cards on this page */}
        {picks.length ? (
          <div aria-hidden className="aip-chat hidden rounded-2xl border border-[#EFE9E1] bg-white/90 p-4 shadow-[0_24px_50px_-30px_rgba(25,25,25,0.35)] backdrop-blur-sm sm:block sm:p-5">
            <div className="flex items-center justify-between border-b border-[#F2EEE8] pb-3">
              <span className="flex items-center gap-2 text-xs font-semibold text-ink">
                <span className="flex size-6 items-center justify-center rounded-full bg-[#FFF1EA] text-coral"><Icon name="sparkles" size={13} /></span>
                VacayOut planner
              </span>
              <span className="rounded-full bg-[#F5F3EE] px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-[#888888]">Example</span>
            </div>

            <div key={replayKey} className="space-y-3 pt-4">
              <p className="aip-step ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-ink px-3.5 py-2 text-[0.8125rem] text-white" style={{ ["--d" as string]: "200ms" }}>
                {question}
              </p>
              {/* Typing dots, then the answer in the same spot */}
              <div className="grid">
                <p className="aip-typing w-fit self-start rounded-2xl rounded-bl-md bg-[#F5F3EE] px-3 py-2.5 [grid-area:1/1]"><i /><i /><i /></p>
                <p className="aip-step w-fit max-w-[90%] rounded-2xl rounded-bl-md bg-[#F5F3EE] px-3.5 py-2 text-[0.8125rem] text-ink [grid-area:1/1]" style={{ ["--d" as string]: "1600ms" }}>
                  {answer}
                </p>
              </div>
              <ul className="space-y-2">
                {picks.map((p, i) => (
                  <li key={p.href} className="aip-step" style={{ ["--d" as string]: `${1850 + i * 220}ms` }}>
                    <Link href={p.href} tabIndex={-1} className="flex items-center gap-3 rounded-xl border border-[#F0ECE6] bg-white p-2 transition-colors hover:border-coral/40">
                      <span className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-[#EFECE6]">
                        {p.image ? <Image src={p.image.url} alt="" fill sizes="44px" className="object-cover" /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.8125rem] font-semibold text-ink">{p.name}</span>
                        <span className="block truncate text-[0.6875rem] text-[#888888]">{p.meta}</span>
                      </span>
                      <Icon name="arrowRight" size={13} className="mr-1 shrink-0 text-[#BBBBBB]" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
