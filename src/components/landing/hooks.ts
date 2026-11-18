"use client";

import { useEffect, useRef, useState } from "react";

export const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Writes the scroll progress (0 → 1) of a tall "pinned" section to the CSS variable
 * --p on that element, every frame while it is near the viewport. No React re-renders:
 * CSS reads the variable. An optional callback receives the value too.
 */
export function useSectionProgress<T extends HTMLElement>(onProgress?: (p: number) => void) {
  const ref = useRef<T>(null);
  const cb = useRef(onProgress);
  useEffect(() => {
    cb.current = onProgress;
  });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let visible = false;
    const tick = () => {
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : r.top < 0 ? 1 : 0;
      el.style.setProperty("--p", p.toFixed(4));
      cb.current?.(p);
      if (visible) raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) raf = requestAnimationFrame(tick);
    }, { rootMargin: "200px 0px" });
    io.observe(el);
    tick();
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);
  return ref;
}

/** Sets data-in="true" on every [data-reveal] inside the root once it scrolls into view. */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            (e.target as HTMLElement).dataset.in = "true";
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    root.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return ref;
}

/** Counts from 0 to `to` once the element is visible. */
export function useCountUp(to: number | null, ms = 1600) {
  const ref = useRef<HTMLElement>(null);
  const [value, setValue] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || to == null) return;
    const dur = reducedMotion() ? 1 : ms;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const step = (t: number) => {
        const k = Math.min(1, (t - start) / dur);
        setValue(Math.round(to * (1 - Math.pow(1 - k, 4))));
        if (k < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, ms]);
  return { ref, value };
}

/** Plays a <video> only while it is on screen (saves battery and bandwidth). */
export function useVideoInView() {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v || reducedMotion()) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) v.play().catch(() => {});
      else v.pause();
    }, { rootMargin: "100px 0px" });
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return ref;
}
