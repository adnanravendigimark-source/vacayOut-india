"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/layout/logo";

const NAV = [
  { href: "/india", label: "Explore India" },
  { href: "/things-to-do", label: "Things to do" },
  { href: "/itineraries", label: "Itineraries" },
  { href: "/travel-guides", label: "Guides" },
];

/**
 * The landing page's own header: transparent over the film, frosted once you scroll,
 * tucked away while scrolling down and back on the way up, with a journey progress line.
 */
export function LandingHeader({ onPlan }: { onPlan: () => void }) {
  const [solid, setSolid] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [menu, setMenu] = useState(false);
  const bar = useRef<HTMLSpanElement>(null);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let last = window.scrollY;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        setSolid(y > 40);
        setHidden(y > 500 && y > last + 4);
        if (y < last - 4 || y < 500) setHidden(false);
        last = y;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        bar.current?.style.setProperty("transform", `scaleX(${max > 0 ? y / max : 0})`);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = menu ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menu]);

  // Magnetic call-to-action: follows the pointer a little, springs back on leave.
  const magnet = (e: React.PointerEvent) => {
    const el = btn.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px, ${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
  };

  return (
    <>
      <header className="vl-header" data-solid={solid || menu} data-hidden={hidden && !menu}>
        <div className="vl-header__inner">
          <span className="vl-header__logo"><Logo tone="dark" /></span>
          <nav aria-label="Primary" className="vl-header__nav">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="vl-navlink"><span data-text={n.label}>{n.label}</span></Link>
            ))}
          </nav>
          <div className="vl-header__actions">
            <Link href="/account" className="vl-header__ghost">Sign in</Link>
            <button ref={btn} type="button" className="vl-cta" onClick={onPlan} onPointerMove={magnet} onPointerLeave={() => btn.current && (btn.current.style.transform = "")}>
              <span className="vl-cta__glow" aria-hidden />
              <span className="vl-cta__label">✦ Plan with AI</span>
            </button>
            <button type="button" className="vl-burger" aria-expanded={menu} aria-controls="vl-menu" aria-label={menu ? "Close menu" : "Open menu"} onClick={() => setMenu((m) => !m)}>
              <span /><span />
            </button>
          </div>
        </div>
        <span ref={bar} className="vl-header__progress" aria-hidden />
      </header>

      <div id="vl-menu" className="vl-menu" data-open={menu} aria-hidden={!menu}>
        <nav aria-label="Menu">
          {[...NAV, { href: "/blog", label: "Blog" }, { href: "/account", label: "Your account" }].map((n, i) => (
            <Link key={n.href} href={n.href} onClick={() => setMenu(false)} style={{ transitionDelay: menu ? `${120 + i * 60}ms` : "0ms" }} tabIndex={menu ? 0 : -1}>
              <small>{String(i + 1).padStart(2, "0")}</small>{n.label}
            </Link>
          ))}
        </nav>
        <button type="button" className="vl-cta vl-cta--block" onClick={() => { setMenu(false); onPlan(); }} tabIndex={menu ? 0 : -1}>
          <span className="vl-cta__label">✦ Plan a trip with AI</span>
        </button>
      </div>
    </>
  );
}
