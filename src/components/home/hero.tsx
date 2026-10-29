"use client";

import { useState, useRef, useCallback, useSyncExternalStore } from "react";
import Image from "next/image";
import { Icon } from "@/components/icons/icon";
import type { HomepageData } from "@/lib/data/types";

const WIDE = "(min-width: 768px)";
function subscribeWide(onChange: () => void) {
  const m = window.matchMedia(WIDE);
  m.addEventListener("change", onChange);
  return () => m.removeEventListener("change", onChange);
}
/** Autoplay the hero video only on wider screens, without data saver / slow network / reduced motion. */
function canPlayVideo() {
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  const slow = !!conn && (conn.saveData === true || /(^|-)2g$|^3g$/.test(conn.effectiveType ?? ""));
  return window.matchMedia(WIDE).matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches && !slow;
}

interface DestinationScene {
  id: string;
  name: string;
  region: string;
  locationTag: string;
  badge: string;
  startTime: number;
}

const DESTINATION_SCENES: DestinationScene[] = [
  {
    id: "kashmir",
    name: "Kashmir",
    region: "North India",
    locationTag: "Gulmarg & Dal Lake, Kashmir",
    badge: "Alpine Snow Peaks & Valleys",
    startTime: 0,
  },
  {
    id: "rajasthan",
    name: "Rajasthan",
    region: "West India",
    locationTag: "Jaisalmer Fort & Royal Palaces, Rajasthan",
    badge: "Golden Fortresses & Palaces",
    startTime: 10,
  },
  {
    id: "himachal",
    name: "Himachal",
    region: "Himalayas",
    locationTag: "Spiti Valley & Manali Pine Valleys",
    badge: "Misty Mountain Passes",
    startTime: 20,
  },
  {
    id: "kerala",
    name: "Kerala",
    region: "South India",
    locationTag: "Alleppey & Kumarakom Backwaters",
    badge: "Tranquil Houseboats & Palm Lagoons",
    startTime: 30,
  },
];

export function Hero({
  examples,
  onStart,
}: {
  hero?: HomepageData["hero"];
  examples: HomepageData["examplePrompts"];
  onStart: (prompt: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // The video is decoration: phones, data-saver and reduced-motion users get the poster photo only.
  const showVideo = useSyncExternalStore(subscribeWide, canPlayVideo, () => false);

  const currentScene = DESTINATION_SCENES[activeSceneIndex];

  // Sync active pill and HUD location with the continuous video playback time
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || isNaN(video.currentTime)) return;
    const ct = video.currentTime % 40;
    const sceneIndex = Math.min(3, Math.floor(ct / 10));
    setActiveSceneIndex((prev) => (prev !== sceneIndex ? sceneIndex : prev));
  }, []);

  // When clicking a destination pill, smoothly jump to that region in the continuous video
  const handleSelectScene = useCallback((index: number) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = index * 10;
      video.play().catch(() => {});
    }
    setActiveSceneIndex(index);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      onStart(q);
    }
  };

  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-[100svh] w-full items-center justify-center overflow-hidden bg-white"
    >
      {/* Single Continuous Cinematic India Auto Video for All Destinations */}
      <div className="absolute inset-0 -z-20 overflow-hidden">
        {/* Poster photo first (optimised, high priority); the video fades in over it when allowed. */}
        <Image
          src="/images/cinematic/hero-india-poster.jpg"
          alt="Cinematic India travel hero showing mountains, palaces, and backwaters"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        {showVideo ? (
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            aria-hidden
            onTimeUpdate={handleTimeUpdate}
            className="absolute inset-0 h-full w-full animate-[fadeIn_.8s_ease-out] object-cover scale-[1.02] transition-transform duration-1000 ease-out"
          >
            <source src="/video/hero-cinematic-india.mp4" type="video/mp4" />
          </video>
        ) : null}
      </div>

      {/* Light, Balanced Cinematic Overlay */}
      <div
        aria-hidden
        className={`absolute inset-0 -z-10 transition-all duration-700 ${
          isFocused
            ? "bg-white/60 backdrop-blur-[2px]"
            : "bg-gradient-to-b from-white/40 via-white/10 to-white/50"
        }`}
      />

      {/* Main Hero Visual Center */}
      <div className="container-site relative z-10 flex flex-col items-center justify-center text-center px-4 pt-24 pb-10 sm:pt-28 sm:pb-12">
        <div className="mx-auto max-w-3xl">
          {/* Headline in Deep Near-Black #191919 with subtle shadow */}
          <h1
            id="hero-title"
            className="font-serif text-[clamp(2rem,min(4.2vw,6.4vh),3.5rem)] font-normal leading-[1.08] tracking-[-0.025em] text-ink drop-shadow-[0_1px_3px_rgba(255,255,255,0.7)]"
          >
            India is waiting.
            <br />
            <span className="italic font-light text-ink/85">Where will you go?</span>
          </h1>

          {/* Supporting Text */}
          <p className="mx-auto mt-[min(1rem,1.8vh)] max-w-xl text-[0.9375rem] sm:text-[1.0625rem] font-medium leading-relaxed text-[#222222] drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]">
            Discover places, plan unforgettable trips, and figure out every detail with AI.
          </p>

          {/* Destination Scene Switcher Bar (Kashmir • Rajasthan • Himachal • Kerala) */}
          <div className="mt-[min(1.75rem,3vh)] flex flex-wrap items-center justify-center gap-2">
            {DESTINATION_SCENES.map((scene, idx) => {
              const isCurrent = idx === activeSceneIndex;
              return (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => handleSelectScene(idx)}
                  className={`group inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs sm:text-sm font-medium transition-all duration-300 ${
                    isCurrent
                      ? "bg-ink text-white shadow-md ring-2 ring-coral/50 scale-[1.03]"
                      : "border border-black/10 bg-white/85 text-ink/80 hover:bg-white hover:text-ink hover:border-black/20 backdrop-blur-md shadow-xs"
                  }`}
                  aria-pressed={isCurrent}
                >
                  <span
                    className={`size-1.5 rounded-full transition-colors ${
                      isCurrent ? "bg-coral animate-pulse" : "bg-black/30 group-hover:bg-coral"
                    }`}
                  />
                  <span>{scene.name}</span>
                  {isCurrent && (
                    <span className="hidden sm:inline text-[0.7rem] uppercase tracking-wider text-white/60">
                      Live
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Current Location Tag HUD */}
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 border border-black/10 px-3.5 py-1 text-xs text-[#444444] backdrop-blur-md shadow-xs animate-fade-in">
              <Icon name="pin" size={13} className="text-coral shrink-0" />
              <span className="font-semibold text-ink">{currentScene.name}:</span>
              <span>{currentScene.locationTag}</span>
              <span className="text-[#888888]">• {currentScene.badge}</span>
            </span>
          </div>

          {/* The Signature Interaction — Expanding AI Search Capsule (White surface) */}
          <div className="mt-[min(2.25rem,4vh)] w-full max-w-3xl mx-auto">
            <div
              className={`group relative mx-auto max-w-2xl rounded-full bg-white p-1.5 sm:p-2 border transition-all duration-300 ${
                isFocused
                  ? "border-coral shadow-[0_24px_60px_-12px_rgba(236,98,66,0.3)] ring-2 ring-coral/40 scale-[1.01]"
                  : "border-black/10 shadow-[0_16px_40px_-12px_rgba(25,25,25,0.12)] hover:shadow-[0_20px_50px_-10px_rgba(25,25,25,0.18)] hover:border-black/20"
              }`}
            >
              <form onSubmit={handleSubmit} className="flex items-center gap-2 sm:gap-3 pl-3 sm:pl-4">
                <Icon
                  name="sparkles"
                  size={20}
                  className="shrink-0 text-coral transition-transform duration-300 group-hover:scale-110"
                />
                <label htmlFor="hero-ai-search" className="sr-only">
                  Where would you like to go? Ask me anything…
                </label>
                <input
                  id="hero-ai-search"
                  ref={inputRef}
                  type="text"
                  name="q"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder="Where would you like to go? Ask me anything…"
                  autoComplete="off"
                  className="h-10 sm:h-12 min-w-0 flex-1 bg-transparent text-[0.875rem] sm:text-[0.9375rem] text-ink outline-none placeholder:text-[#777777] font-medium"
                />
                <button
                  type="submit"
                  aria-label="Ask AI travel planner"
                  className="flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-full bg-coral text-white shadow-coral transition-all duration-200 hover:bg-coral-hover hover:scale-105 active:scale-95"
                >
                  <Icon name="arrowRight" size={18} strokeWidth={2.2} />
                </button>
              </form>
            </div>

            {/* Supporting line below the search bar */}
            <p className="mt-2.5 text-center text-[0.75rem] sm:text-[0.8125rem] font-medium tracking-wide text-[#555555]">
              From weekend escapes to complete India itineraries.
            </p>

            {/* Quick Prompt Pills */}
            <div className="mt-3 flex flex-wrap justify-center gap-1.5 sm:gap-2">
              {examples.map((ex) => (
                <button
                  key={ex.label}
                  type="button"
                  onClick={() => onStart(ex.prompt)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white/85 px-3 py-1 sm:px-3.5 sm:py-1.5 text-[0.75rem] sm:text-[0.8125rem] font-medium text-ink shadow-xs backdrop-blur-md transition-all hover:border-coral hover:bg-white hover:text-coral hover:shadow-sm"
                >
                  <Icon name={ex.icon} size={13} className="text-coral" />
                  {ex.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
