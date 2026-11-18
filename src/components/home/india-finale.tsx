"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { HomepageData } from "@/lib/data/types";
import { HeroSearch } from "./hero-search";

/**
 * Closing scene above the footer (ported from /landingpage): a sunrise film shows through
 * a huge "INDIA"; as you scroll the word zooms past and "Where to first?" appears with the
 * AI search. Scroll progress is written to --p on the section; CSS does the rest.
 */
export function IndiaFinale({ examples, onStart }: { examples: HomepageData["examplePrompts"]; onStart: (prompt: string) => void }) {
  const ref = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let visible = false;
    const tick = () => {
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
      el.style.setProperty("--p", p.toFixed(4));
      if (visible) raf = requestAnimationFrame(tick);
    };
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      const v = video.current;
      if (visible) {
        raf = requestAnimationFrame(tick);
        if (v && !still) v.play().catch(() => {});
      } else v?.pause();
    }, { rootMargin: "200px 0px" });
    io.observe(el);
    tick();
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section ref={ref} className="india-finale" aria-labelledby="india-finale-title">
      <div className="india-finale__stage">
        <video ref={video} className="india-finale__film" muted loop playsInline preload="none" poster="/landing/terrain-road.jpg" aria-hidden>
          <source src="/landing/terrain-road.mp4" type="video/mp4" />
        </video>
        <div className="india-finale__mask" aria-hidden>
          <span>INDIA</span>
        </div>
        <div className="container-site india-finale__inner">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">Your trip starts here</p>
          <h2 id="india-finale-title" className="mt-3 font-serif text-[clamp(2.4rem,5.6vw,4.6rem)] font-normal leading-[1.02] tracking-[-0.03em] text-white">
            Where to <em className="font-light italic text-[#FFC8A8]">first?</em>
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/85 sm:text-base">
            Tell us where, when and who&apos;s coming. We&apos;ll draw the route day by day.
          </p>
          <div className="mt-6 w-full max-w-2xl">
            <HeroSearch id="finale-ai-search" examples={examples} onStart={onStart} />
          </div>
          <nav className="india-finale__links" aria-label="Browse">
            <Link href="/india">Explore India</Link>
            <Link href="/things-to-do">Things to do</Link>
            <Link href="/itineraries">Itineraries</Link>
            <Link href="/travel-guides">Travel guides</Link>
          </nav>
        </div>
        <p className="india-finale__credit">Film: MotionSites</p>
      </div>
    </section>
  );
}
