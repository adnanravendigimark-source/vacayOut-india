"use client";

import Link from "next/link";
import Lenis from "lenis";
import { useEffect, useState } from "react";
import type { LandingData } from "@/lib/data/landing";
import { AiPlannerModal } from "@/components/chat/ai-planner-modal";
import { LandingHeader } from "./landing-header";
import { LandingHero, PromptBox } from "./hero";
import { GlobeSection } from "./globe-section";
import { Terrains } from "./terrains";
import { Ribbon } from "./ribbon";
import { LandingJourney } from "./journey";
import { reducedMotion, useReveal, useSectionProgress, useVideoInView } from "./hooks";
import "./landing.css";

function Proof({ data }: { data: LandingData }) {
  const sites = data.sourceSites.length ? data.sourceSites : ["incredibleindia.gov.in", "unesco.org"];
  const rows = [sites, [...sites].reverse()];
  return (
    <section className="vl-proof" aria-label="Sources we quote">
      <p className="vl-wrap vl-eyebrow">The sources behind our pages</p>
      {rows.map((row, r) => (
        <div key={r} className="vl-proof__row" data-dir={r ? "rev" : "fwd"} aria-hidden={r === 1}>
          <div className="vl-proof__track">
            {[0, 1].map((k) => (
              <div key={k} className="vl-proof__set">
                {row.map((s) => <span key={s + k}>{s}</span>)}
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function Finale({ onPlan, examples }: { onPlan: (p: string) => void; examples: string[] }) {
  const ref = useSectionProgress<HTMLElement>();
  const video = useVideoInView();
  return (
    <section ref={ref} className="vl-finale" aria-labelledby="vl-finale-title">
      <div className="vl-finale__stage">
        <video ref={video} className="vl-finale__film" muted loop playsInline preload="none" poster="/landing/terrain-road.jpg" aria-hidden>
          <source src="/landing/terrain-road.mp4" type="video/mp4" />
        </video>
        <div className="vl-finale__mask" aria-hidden>
          <span>INDIA</span>
        </div>
        <div className="vl-wrap vl-finale__inner">
          <p className="vl-eyebrow vl-eyebrow--light">The path is drawn</p>
          <h2 id="vl-finale-title" className="vl-display vl-display--light">Where to <em>first?</em></h2>
          <PromptBox onPlan={onPlan} examples={examples} dark />
          <nav className="vl-finale__links" aria-label="Browse">
            <Link href="/india">Explore India</Link>
            <Link href="/things-to-do">Things to do</Link>
            <Link href="/itineraries">Itineraries</Link>
            <Link href="/travel-guides">Travel guides</Link>
          </nav>
        </div>
        <p className="vl-finale__credit">Background films: MotionSites</p>
      </div>
    </section>
  );
}

/** The /landingpage experience. */
export function LandingShell({ data, monoClass }: { data: LandingData; monoClass: string }) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState<string | undefined>();
  const root = useReveal<HTMLDivElement>();
  const plan = (p?: string) => {
    setPrompt(p || undefined);
    setOpen(true);
  };

  // Smooth, weighted scrolling (native scroll underneath, so sticky and anchors still work).
  useEffect(() => {
    if (reducedMotion()) return;
    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    let raf = 0;
    const loop = (t: number) => {
      lenis.raf(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  const examples = data.examples.map((e) => e.prompt);
  return (
    <div ref={root} className={`vl ${monoClass}`}>
      <LandingHeader onPlan={() => plan()} />
      <LandingHero data={data} onPlan={plan} />
      <GlobeSection data={data} />
      <Terrains data={data} />
      <Ribbon data={data} />
      <LandingJourney data={data} onPlan={plan} />
      <Proof data={data} />
      <Finale onPlan={plan} examples={examples} />
      <AiPlannerModal isOpen={open} onClose={() => setOpen(false)} initialPrompt={prompt} examples={data.examples} />
    </div>
  );
}
