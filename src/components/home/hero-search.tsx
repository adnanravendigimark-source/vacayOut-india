"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/icons/icon";
import type { HomepageData } from "@/lib/data/types";
import "./hero.css";

const RM = "(prefers-reduced-motion: reduce)";
function subscribeRM(cb: () => void) {
  const m = window.matchMedia(RM);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}
const useReducedMotion = () => useSyncExternalStore(subscribeRM, () => window.matchMedia(RM).matches, () => false);

/** Types out each example prompt, holds it, erases it, then moves to the next. */
function useTypewriter(lines: string[], active: boolean) {
  const [text, setText] = useState("");
  const still = useReducedMotion();
  useEffect(() => {
    if (!active || still || lines.length === 0) return;
    let i = 0, c = 0, dir = 1, wait = 10;
    const id = window.setInterval(() => {
      if (wait > 0) return void wait--;
      const full = lines[i];
      c += dir;
      setText(full.slice(0, Math.max(0, c)));
      if (dir === 1 && c >= full.length) { dir = -1; wait = 45; }
      else if (dir === -1 && c <= 0) { dir = 1; i = (i + 1) % lines.length; wait = 6; }
    }, 45);
    return () => window.clearInterval(id);
  }, [active, still, lines]);
  return still ? (lines[0] ?? "") : text;
}

/**
 * The homepage AI search: a slow glowing ring, example trips typed out as a live hint,
 * a sparkle that twinkles while you type, and a send button with a soft shine.
 */
export function HeroSearch({ examples, onStart, id = "hero-ai-search" }: { examples: HomepageData["examplePrompts"]; onStart: (prompt: string) => void; id?: string }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const [lines] = useState(() => [
    "Plan 5 days in Himachal under ₹20,000",
    ...examples.map((e) => e.prompt),
  ]);
  const hint = useTypewriter(lines, !focused && !query);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) onStart(q);
    else input.current?.focus();
  };

  return (
    <div className="hs" data-focus={focused} data-typing={query.length > 0}>
      <form onSubmit={submit} className="hs__box">
        <span className="hs__ring" aria-hidden />
        <span className="hs__spark" aria-hidden><Icon name="sparkles" size={20} /></span>
        <label htmlFor={id} className="sr-only">Where would you like to go? Ask me anything…</label>
        <div className="hs__field">
          <input
            id={id}
            ref={input}
            type="text"
            name="q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={focused ? "Where, when, budget, who's coming…" : ""}
            autoComplete="off"
            maxLength={300}
          />
          {!focused && !query && (
            <span className="hs__hint" aria-hidden>
              <span className="hs__hintText">{hint}</span>
              <i className="hs__caret" />
            </span>
          )}
        </div>
        <button type="submit" aria-label="Ask AI travel planner" className="hs__go">
          <span className="hs__goLabel">Plan</span>
          <Icon name="arrowRight" size={18} strokeWidth={2.2} />
        </button>
      </form>
    </div>
  );
}
