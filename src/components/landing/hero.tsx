"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import type { LandingData } from "@/lib/data/landing";
import { reducedMotion } from "./hooks";

export const CHAPTERS = [
  { n: "01", label: "Discover India" },
  { n: "02", label: "Explore destinations" },
  { n: "03", label: "Find experiences" },
  { n: "04", label: "Build your trip" },
  { n: "05", label: "Travel with confidence" },
];

/** Typewriter that cycles through example prompts while the field is idle. */
function useTypewriter(examples: string[], idle: boolean) {
  const [text, setText] = useState(examples[0] ?? "");
  useEffect(() => {
    if (!idle || reducedMotion() || examples.length < 2) return;
    let i = 0, c = examples[0]?.length ?? 0, dir = -1, wait = 40;
    const id = setInterval(() => {
      if (wait > 0) return void wait--;
      const full = examples[i];
      c += dir;
      setText(full.slice(0, Math.max(0, c)));
      if (dir === 1 && c >= full.length) { dir = -1; wait = 40; }
      else if (dir === -1 && c <= 0) { dir = 1; i = (i + 1) % examples.length; wait = 6; }
    }, 42);
    return () => clearInterval(id);
  }, [idle, examples]);
  return text;
}

/** Compact AI prompt box (used in the dark finale). */
export function PromptBox({ onPlan, examples, dark }: { onPlan: (p: string) => void; examples: string[]; dark?: boolean }) {
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState(false);
  const ph = useTypewriter(examples, !focus && !q);
  const id = dark ? "vl-q2" : "vl-q";
  return (
    <form className={`vl-prompt ${dark ? "vl-prompt--dark" : ""}`} onSubmit={(e) => { e.preventDefault(); onPlan(q.trim()); }}>
      <span className="vl-prompt__spark" aria-hidden>✦</span>
      <label htmlFor={id} className="sr-only">Describe your trip</label>
      <input id={id} value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        placeholder={focus ? "Where, when, who's coming, what you love…" : ph} maxLength={300} autoComplete="off" />
      <button type="submit"><span>Plan my trip</span><i aria-hidden>→</i></button>
    </form>
  );
}

/**
 * The hero search: an aurora ring that spins round the field, a live typewriter with a
 * blinking caret, a compass that turns while you type, and quick-start chips that drop in.
 */
function HeroSearch({ onPlan, examples, chips }: { onPlan: (p: string) => void; examples: string[]; chips: { label: string; prompt: string }[] }) {
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const ph = useTypewriter(examples, !focus && !q);
  return (
    <div className="vl-search" data-focus={focus} data-typing={q.length > 0}>
      <form className="vl-search__box" onSubmit={(e) => { e.preventDefault(); onPlan(q.trim()); }}>
        <span className="vl-search__ring" aria-hidden />
        <span className="vl-search__compass" aria-hidden>
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></svg>
        </span>
        <label htmlFor="vl-q" className="sr-only">Describe your trip</label>
        <div className="vl-search__field">
          <input ref={input} id="vl-q" value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
            maxLength={300} autoComplete="off" placeholder={focus ? "Where, when, who's coming, what you love…" : ""} />
          {!focus && !q && (
            <span className="vl-search__ghost" aria-hidden>{ph}<i className="vl-search__caret" /></span>
          )}
        </div>
        <button type="submit" className="vl-search__go">
          <span>Plan my trip</span>
          <svg viewBox="0 0 24 24" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
      </form>
      <ul className="vl-search__chips" aria-label="Try one">
        {chips.map((c, i) => (
          <li key={c.label} style={{ ["--d" as string]: `${2200 + i * 110}ms` }}>
            <button type="button" onClick={() => { setQ(c.prompt); input.current?.focus(); }}>{c.label}</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

const SCENES = [
  { key: "terrain-himalaya", label: "The Himalaya" },
  { key: "terrain-thar", label: "The Thar" },
  { key: "terrain-waters", label: "The Waters" },
  { key: "terrain-northeast", label: "The Blue Hills" },
  { key: "terrain-road", label: "Open roads" },
];

/** Films inside the pill, cross-fading every few seconds. Only the visible one plays. */
function PillFilms() {
  const [idx, setIdx] = useState(0);
  const vids = useRef<(HTMLVideoElement | null)[]>([]);
  useEffect(() => {
    if (reducedMotion()) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % SCENES.length), 5200);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (reducedMotion()) return;
    vids.current.forEach((v, i) => {
      if (!v) return;
      if (i === idx) { v.currentTime = 0; v.play().catch(() => {}); }
      else window.setTimeout(() => v.pause(), 900);
    });
  }, [idx]);
  return (
    <>
      {SCENES.map((s, i) => (
        <video key={s.key} ref={(el) => { vids.current[i] = el; }} className="vl-wild__film" data-on={i === idx}
          muted loop playsInline preload={i < 2 ? "auto" : "metadata"} poster={`/landing/${s.key}.jpg`} aria-hidden>
          <source src={`/landing/${s.key}.mp4`} type="video/mp4" />
        </video>
      ))}
      <span className="vl-wild__line" aria-hidden />
      <span className="vl-wild__tag" aria-live="off">
        <i />{SCENES[idx].label}
      </span>
      <span className="vl-wild__dots" aria-hidden>
        {SCENES.map((s, i) => <b key={s.key} data-on={i === idx} />)}
      </span>
    </>
  );
}

// Long, soft white strokes sweeping up and to the right (the paper behind the word).
const LINES = Array.from({ length: 15 }, (_, i) => {
  const x = -260 + i * 120;
  return { d: `M${x} 1000 C ${x + 260} 760, ${x + 120} 420, ${x + 420} 240 S ${x + 760} -20, ${x + 900} -120`, w: 1.2 + ((i * 7) % 10) * 0.27, o: 0.55 + ((i * 3) % 7) * 0.05 };
});

export function LandingHero({ data, onPlan }: { data: LandingData; onPlan: (p: string) => void }) {
  const c = data.counts;
  const examples = data.examples.map((e) => e.prompt);
  const chips = [
    { label: "7 days · Rajasthan forts", prompt: "7 days in Rajasthan for forts, palaces and desert camps" },
    { label: "Kerala with kids", prompt: "6 relaxed days in Kerala with two kids — backwaters and beaches" },
    { label: "Ladakh road trip", prompt: "10-day Ladakh road trip from Manali in July" },
    { label: "First time in India", prompt: "First time in India, 10 days, Golden Triangle plus Varanasi" },
  ];
  return (
    <section className="vl-hero" aria-labelledby="vl-hero-title">
      <div className="vl-hero__paper" aria-hidden>
        <svg viewBox="0 0 1600 1000" preserveAspectRatio="none">
          {LINES.map((l, i) => <path key={i} d={l.d} strokeWidth={l.w} opacity={l.o} />)}
        </svg>
        <span className="vl-hero__sun" />
      </div>

      <div className="vl-hero__center">
        <p className="vl-hero__eyebrow">
          <span className="vl-kicker__dot" /> India travel planner · {c.states} states · {c.places.toLocaleString("en-IN")} places
        </p>
        <h1 id="vl-hero-title" className="vl-wild">
          <span className="sr-only">India travel planner: discover India, plan better, travel further</span>
          <span className="vl-wild__half vl-wild__half--a" aria-hidden>IN</span>
          <span className="vl-wild__pill" aria-hidden><PillFilms /></span>
          <span className="vl-wild__half vl-wild__half--b" aria-hidden>DIA</span>
        </h1>
        <p className="vl-hero__tag" aria-hidden>
          {["Discover India.", "Plan better.", "Travel further."].map((t, i) => (
            <Fragment key={t}><span style={{ ["--d" as string]: `${1500 + i * 160}ms` }}>{t}</span>{" "}</Fragment>
          ))}
        </p>
        <HeroSearch onPlan={onPlan} examples={examples} chips={chips} />
      </div>

      <div className="vl-hero__bar">
        <p className="vl-hero__note">
          <span className="vl-hero__cap">T</span>ell us where, when and who&apos;s coming. We draw the route day by day — places, stays and travel times — {data.trust.sources ? `built from ${data.trust.sources.toLocaleString("en-IN")} checked sources` : "built from checked official sources"}, not guesswork.
        </p>
        <span className="vl-hero__rule" aria-hidden />
        <Link href="/itineraries" className="vl-hero__btn">See {c.itineraries} ready-made routes <span aria-hidden>→</span></Link>
      </div>
    </section>
  );
}
