"use client";

import { useEffect } from "react";
import Image from "@/components/media/image";
import "./intro.css";

// Runs while the HTML is parsed, before the intro paints: the intro plays on every full page load
// (first visit and refresh), not when coming back to "/" from another page. No JS, or motion turned off → no intro.
const DECIDE = `document.documentElement.dataset.intro="play"`;

/**
 * Opening reveal for the homepage, after the /landingpage hero: "IN ◯ DIA" — a hairline between
 * the letters opens into a pill that shows the hero photo, the pill grows to fill the screen,
 * and the layer fades away onto the real hero (same photo underneath). ~3 seconds, once per
 * session, never blocks clicks.
 */
export function HomeIntro() {
  // Once it has played, mark it seen so coming back to "/" in the same visit doesn't replay it.
  useEffect(() => {
    const d = document.documentElement;
    if (d.dataset.intro !== "play") return;
    window.setTimeout(() => {
      d.dataset.intro = "seen";
    }, 3900);
  }, []);

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: DECIDE }} />
      <div className="home-intro" aria-hidden>
        <div className="home-intro__window">
          <Image src="/video/hero-india-film.jpg" alt="" fill priority sizes="100vw" className="object-cover" />
          <span className="home-intro__line" />
        </div>
        <div className="home-intro__word">
          <span>IN</span>
          <span className="home-intro__gap" />
          <span>DIA</span>
        </div>
        <p className="home-intro__tag">Discover India. Plan better. Travel further.</p>
      </div>
    </>
  );
}
