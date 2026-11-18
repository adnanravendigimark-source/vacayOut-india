"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { LandingData } from "@/lib/data/landing";
import { reducedMotion } from "./hooks";

const HUES = ["#C35933", "#2F55D4", "#1F4A35", "#D99A2B", "#23201C", "#1E6B73", "#7A3E8F", "#B23A48"];

/**
 * Experiences on a slowly turning 3D ring (CSS transforms only). Drag or swipe to spin it;
 * it keeps turning on its own and pauses while hovered or focused.
 */
export function Ribbon({ data }: { data: LandingData }) {
  const ring = useRef<HTMLDivElement>(null);
  const items = data.experiences.slice(0, 12);
  const n = items.length;

  useEffect(() => {
    const el = ring.current;
    if (!el || n === 0) return;
    let angle = 0, vel = reducedMotion() ? 0 : 0.08, raf = 0, paused = false, dragging = false, lastX = 0, moved = 0;
    const auto = vel;
    const tick = () => {
      if (!dragging) {
        vel += ((paused ? 0 : auto) - vel) * 0.04;
        angle += vel;
      }
      el.style.transform = `translateZ(calc(var(--r) * -1)) rotateY(${angle}deg)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const down = (e: PointerEvent) => { dragging = true; moved = 0; lastX = e.clientX; };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      moved += Math.abs(dx);
      angle += dx * 0.25;
      vel = dx * 0.25;
    };
    const up = () => { dragging = false; };
    // A drag shouldn't also open the card under the pointer.
    const click = (e: MouseEvent) => { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } };
    const enter = () => { paused = true; };
    const leave = () => { paused = false; };
    el.addEventListener("pointerdown", down);
    el.addEventListener("click", click, true);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("mouseenter", enter);
    el.addEventListener("mouseleave", leave);
    el.addEventListener("focusin", enter);
    el.addEventListener("focusout", leave);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("click", click, true);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("mouseenter", enter);
      el.removeEventListener("mouseleave", leave);
      el.removeEventListener("focusin", enter);
      el.removeEventListener("focusout", leave);
    };
  }, [n]);

  if (!n) return null;
  return (
    <section className="vl-ribbon" aria-labelledby="vl-ribbon-title">
      <div className="vl-wrap vl-ribbon__head" data-reveal>
        <p className="vl-eyebrow vl-eyebrow--light">03 — Find experiences</p>
        <h2 id="vl-ribbon-title" className="vl-display vl-display--light">Not just places. <em>Things to do</em> there.</h2>
        <p className="vl-body vl-body--light">Treks, festivals, boat rides and rituals — {data.counts.experiences} experiences with when to go and where to base yourself. Drag the ring.</p>
      </div>
      <div className="vl-ribbon__scene">
        <div ref={ring} className="vl-ribbon__ring" style={{ ["--n" as string]: n }}>
          {items.map((e, i) => (
            <Link key={e.href} href={e.href} className="vl-rcard" style={{ ["--i" as string]: i, ["--h" as string]: HUES[i % HUES.length] }} draggable={false}>
              <span className="vl-rcard__n">{String(i + 1).padStart(2, "0")}</span>
              <span className="vl-rcard__label">{e.label}</span>
              <span className="vl-rcard__name">{e.name}</span>
              <span className="vl-rcard__where">{e.stateName}</span>
              <span className="vl-rcard__go" aria-hidden>↗</span>
            </Link>
          ))}
        </div>
      </div>
      <div className="vl-wrap vl-ribbon__foot">
        <Link href="/things-to-do" className="vl-pill">See all {data.counts.experiences} experiences <span aria-hidden>→</span></Link>
      </div>
    </section>
  );
}
