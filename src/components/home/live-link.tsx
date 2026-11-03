"use client";

import Link from "next/link";
import { createContext, useContext, type ReactNode } from "react";

/** Paths of pages that are published right now (set by the homepage from the database). */
const LivePaths = createContext<ReadonlySet<string>>(new Set());

export function LivePathsProvider({ paths, children }: { paths: readonly string[]; children: ReactNode }) {
  return <LivePaths.Provider value={new Set(paths)}>{children}</LivePaths.Provider>;
}

/** Hub pages that always exist (their filters are read in the browser). */
const ALWAYS = ["/india", "/things-to-do", "/itineraries", "/travel-guides"];
const isHub = (href: string) => ALWAYS.some((h) => href === h || href.startsWith(`${h}?`));

/** First candidate that is a published page, or null. */
export function useLiveHref(candidates: readonly string[]) {
  const live = useContext(LivePaths);
  return candidates.find((h) => isHub(h) || live.has(h)) ?? null;
}

/**
 * A homepage card link. Goes to the first published page among `hrefs`; when none is
 * published yet it opens the AI planner with `prompt` instead of sending people to a 404.
 */
export function LiveLink({
  hrefs,
  prompt,
  onPlan,
  className,
  children,
}: {
  hrefs: readonly string[];
  prompt: string;
  onPlan?: (prompt: string) => void;
  className?: string;
  children: ReactNode;
}) {
  const href = useLiveHref(hrefs);
  if (href) return <Link href={href} className={className}>{children}</Link>;
  if (onPlan)
    return (
      <button type="button" onClick={() => onPlan(prompt)} className={`${className ?? ""} text-left`}>
        {children}
      </button>
    );
  return <Link href={`/chat?q=${encodeURIComponent(prompt)}`} className={className}>{children}</Link>;
}
