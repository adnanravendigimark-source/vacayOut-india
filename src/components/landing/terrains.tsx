"use client";

import Link from "next/link";
import type { LandingData } from "@/lib/data/landing";
import { useSectionProgress, useVideoInView } from "./hooks";

const PANELS = [
  { key: "himalaya", title: "The Himalaya", kicker: "Mountains", line: "High passes, monasteries and meadows above the clouds.", states: ["himachal-pradesh", "uttarakhand", "ladakh", "sikkim", "jammu-and-kashmir"] },
  { key: "thar", title: "The Thar", kicker: "Desert", line: "Forts of sandstone, camel trails and nights under desert stars.", states: ["rajasthan", "gujarat"] },
  { key: "waters", title: "The Waters", kicker: "Coasts & backwaters", line: "Houseboats, palm-lined beaches and islands of coral.", states: ["kerala", "goa", "andaman-and-nicobar-islands", "lakshadweep"] },
  { key: "northeast", title: "The Blue Hills", kicker: "Northeast", line: "Living-root bridges, cloud forests and seven sister states.", states: ["meghalaya", "arunachal-pradesh", "nagaland", "assam"] },
] as const;

function Panel({ p, i, data }: { p: (typeof PANELS)[number]; i: number; data: LandingData }) {
  const video = useVideoInView();
  const states = p.states.map((s) => data.states.find((x) => x.slug === s)).filter((x): x is LandingData["states"][number] => Boolean(x));
  const places = states.reduce((a, s) => a + s.places, 0);
  return (
    <article className="vl-terrain" style={{ ["--i" as string]: i }}>
      <video ref={video} className="vl-terrain__film" muted loop playsInline preload="none" poster={`/landing/terrain-${p.key}.jpg`} aria-hidden>
        <source src={`/landing/terrain-${p.key}.mp4`} type="video/mp4" />
      </video>
      <div className="vl-terrain__veil" aria-hidden />
      <div className="vl-terrain__copy">
        <p className="vl-terrain__kicker"><span>{String(i + 1).padStart(2, "0")}</span> {p.kicker}</p>
        <h3 className="vl-terrain__title">{p.title}</h3>
        <p className="vl-terrain__line">{p.line}</p>
        <ul className="vl-terrain__states" role="list">
          {states.map((s) => (
            <li key={s.slug}><Link href={s.href}>{s.name}<span>{s.places}</span></Link></li>
          ))}
        </ul>
        <p className="vl-terrain__count">{places} places to explore</p>
      </div>
    </article>
  );
}

/** Chapter 02 opener: a pinned, horizontally scrolling film strip of India's landscapes. */
export function Terrains({ data }: { data: LandingData }) {
  const ref = useSectionProgress<HTMLElement>();
  return (
    <section ref={ref} className="vl-terrains" style={{ ["--n" as string]: PANELS.length + 1 }} aria-labelledby="vl-terrains-title">
      <div className="vl-terrains__stage">
        <div className="vl-terrains__track">
          <div className="vl-terrains__intro">
            <p className="vl-eyebrow">02 — Explore destinations</p>
            <h2 id="vl-terrains-title" className="vl-display">Pick a <em>landscape.</em><br />We&apos;ll show you where.</h2>
            <p className="vl-body">Scroll sideways through India&apos;s great terrains. Every state links to its full guide.</p>
            <span className="vl-terrains__hint" aria-hidden>Scroll <i>→</i></span>
          </div>
          {PANELS.map((p, i) => <Panel key={p.key} p={p} i={i} data={data} />)}
        </div>
        <div className="vl-terrains__bar" aria-hidden><span /></div>
      </div>
    </section>
  );
}
