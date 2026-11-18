"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import Image from "@/components/media/image";
import { Icon } from "@/components/icons/icon";
import type { HomepageData } from "@/lib/data/types";
import { HeroSearch } from "./hero-search";
import { LiveLink } from "./live-link";

const WIDE = "(min-width: 768px)";
function subscribeWide(onChange: () => void) {
  const m = window.matchMedia(WIDE);
  m.addEventListener("change", onChange);
  return () => m.removeEventListener("change", onChange);
}
/** Autoplay the hero film only on wider screens, without data saver / slow network / reduced motion. */
function canPlayVideo() {
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  const slow = !!conn && (conn.saveData === true || /(^|-)2g$|^3g$/.test(conn.effectiveType ?? ""));
  return window.matchMedia(WIDE).matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches && !slow;
}

/**
 * The shots in /video/hero-india-film.mp4, in order (each 4 s, 1 s crossfades → a new shot every
 * 3 s). Built from the licensed photos on these places' own pages; credits are shown per shot,
 * as their CC licences require.
 */
const SHOTS = [
  { place: "Taj Mahal", where: "Agra, Uttar Pradesh", hrefs: ["/india/uttar-pradesh/agra", "/india/uttar-pradesh"], credit: "Yann, edited by Jim Carter", license: "CC BY-SA 4.0" },
  { place: "Pangong Tso", where: "Ladakh", hrefs: ["/india/ladakh/pangong-tso", "/india/ladakh"], credit: "Geet Arts", license: "CC BY-SA 4.0" },
  { place: "Hawa Mahal", where: "Jaipur, Rajasthan", hrefs: ["/india/rajasthan/jaipur", "/india/rajasthan"], credit: "Chainwit.", license: "CC BY-SA 4.0" },
  { place: "Backwaters", where: "Alappuzha, Kerala", hrefs: ["/india/kerala/alappuzha", "/india/kerala"], credit: "Ingo Mehling", license: "CC BY-SA 4.0" },
  { place: "Golden Temple", where: "Amritsar, Punjab", hrefs: ["/india/punjab/amritsar", "/india/punjab"], credit: "Jasleen Kaur", license: "CC BY-SA 2.0" },
  { place: "Jaisalmer Fort", where: "Jaisalmer, Rajasthan", hrefs: ["/india/rajasthan/jaisalmer", "/india/rajasthan"], credit: "Clément Bardot", license: "CC BY-SA 4.0" },
  { place: "Gulmarg", where: "Jammu & Kashmir", hrefs: ["/india/jammu-and-kashmir/gulmarg", "/india/jammu-and-kashmir"], credit: "Mutahir Showkat", license: "CC BY-SA 4.0" },
];
const STEP = 3; // seconds between shots
// Shot k fades in over [3k, 3k + 1] s; switch the label at the middle of that crossfade.
const shotIndex = (t: number) => Math.min(SHOTS.length - 1, Math.max(0, Math.floor((t - 0.5) / STEP)));

export function Hero({
  examples,
  onStart,
}: {
  hero?: HomepageData["hero"];
  examples: HomepageData["examplePrompts"];
  onStart: (prompt: string) => void;
}) {
  const [shot, setShot] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // The film is decoration: phones, data-saver and reduced-motion users get the poster photo only.
  const showVideo = useSyncExternalStore(subscribeWide, canPlayVideo, () => false);
  const current = SHOTS[shot];

  const onTime = useCallback(() => {
    const v = videoRef.current;
    if (!v || Number.isNaN(v.currentTime)) return;
    const i = shotIndex(v.currentTime);
    setShot((p) => (p !== i ? i : p));
  }, []);

  const jump = useCallback((i: number) => {
    const v = videoRef.current;
    if (v) {
      v.currentTime = i * STEP + (i ? 1 : 0);
      v.play().catch(() => {});
    }
    setShot(i);
  }, []);

  return (
    <section aria-labelledby="hero-title" className="hero-v2 relative isolate flex min-h-[100svh] w-full flex-col overflow-hidden bg-[#141210] text-white">
      {/* The film (poster first, optimised and high priority; the video fades in over it when allowed) */}
      <div className="absolute inset-0 -z-20 overflow-hidden">
        <Image
          src="/video/hero-india-film.jpg"
          alt="The Taj Mahal in Agra under a blue sky"
          fill
          priority
          sizes="100vw"
          className="hero-v2__poster object-cover"
        />
        {showVideo ? (
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            poster="/video/hero-india-film.jpg"
            aria-hidden
            onTimeUpdate={onTime}
            className="absolute inset-0 h-full w-full animate-[fadeIn_.8s_ease-out] object-cover"
          >
            <source src="/video/hero-india-film.mp4" type="video/mp4" />
          </video>
        ) : null}
      </div>
      {/* Veil: dark enough for white text on any shot, lighter in the middle so the places show */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(10,8,6,0.35)_0%,rgba(10,8,6,0.08)_30%,rgba(10,8,6,0.12)_60%,rgba(10,8,6,0.55)_100%)]" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(55%_40%_at_50%_42%,rgba(10,8,6,0.32),transparent_75%)]" />

      <div className="container-site relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-6 pt-28 text-center sm:pt-32">
        <div className="mx-auto w-full max-w-3xl">
          <h1
            id="hero-title"
            style={{ ["--d" as string]: "80ms" }}
            className="hero-in font-serif text-[clamp(2.4rem,min(5.4vw,8vh),4.6rem)] font-normal leading-[1.04] tracking-[-0.03em] text-white [text-shadow:0_2px_30px_rgba(0,0,0,0.35)]"
          >
            India is waiting.
            <br />
            <span className="italic font-light text-[#FFD9C7]">Where will you go?</span>
          </h1>

          <p style={{ ["--d" as string]: "160ms" }} className="hero-in mx-auto mt-4 max-w-md text-base font-medium text-white [text-shadow:0_1px_14px_rgba(0,0,0,0.55)] sm:text-lg">
            Plan your India trip, day by day.
          </p>

          <div style={{ ["--d" as string]: "300ms" }} className="hero-in mx-auto mt-7 w-full max-w-2xl">
            <HeroSearch examples={examples} onStart={onStart} />
          </div>

        </div>
      </div>

      {/* Bottom bar: which place is on screen (with its photo credit), and the shot dots */}
      <div style={{ ["--d" as string]: "520ms" }} className="hero-in container-site relative z-10 flex items-end justify-between gap-4 pb-5 sm:pb-7">
        <div className="min-w-0 text-left">
          <LiveLink hrefs={current.hrefs} prompt={`Plan a trip to ${current.place}, ${current.where}`} onPlan={onStart} className="group inline-flex items-center gap-2 rounded-full bg-black/35 py-1.5 pl-2 pr-3.5 text-xs text-white backdrop-blur-md transition-colors hover:bg-black/55">
            <span key={shot} className="hero-v2__place inline-flex items-center gap-2">
              <span className="grid size-6 place-items-center rounded-full bg-coral"><Icon name="pin" size={12} /></span>
              <span className="font-semibold">{current.place}</span>
              <span className="hidden text-white/70 sm:inline">· {current.where}</span>
              <Icon name="arrowRight" size={12} className="text-white/70 transition-transform group-hover:translate-x-0.5" />
            </span>
          </LiveLink>
          {showVideo ? (
            <p className="mt-1.5 truncate pl-1 text-[0.625rem] text-white/60">
              Photo: {current.credit} · Wikimedia Commons · {current.license}
            </p>
          ) : (
            <p className="mt-1.5 truncate pl-1 text-[0.625rem] text-white/60">Photo: {SHOTS[0].credit} · Wikimedia Commons · {SHOTS[0].license}</p>
          )}
        </div>
        {showVideo ? (
          <div className="hidden items-center gap-1.5 sm:flex" role="group" aria-label="Places in the film">
            {SHOTS.map((s, i) => (
              <button
                key={s.place}
                type="button"
                onClick={() => jump(i)}
                aria-label={`Show ${s.place}`}
                aria-pressed={i === shot}
                className={`h-1.5 rounded-full transition-all duration-500 ${i === shot ? "w-7 bg-white" : "w-1.5 bg-white/45 hover:bg-white/80"}`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
