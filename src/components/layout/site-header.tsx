"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons/icon";
import { routes } from "@/lib/routes";
import { Logo } from "./logo";
import { HeaderFrame } from "./header-frame";
import "./site-header.css";

/** Opens the AI planner: in place on the homepage, otherwise on the chat page. */
function openPlanner(e: React.MouseEvent, prompt?: string) {
  if (typeof window !== "undefined" && window.location.pathname === "/") {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent("vacayout:open-ai", { detail: { prompt } }));
  }
}

const NAV = [
  { href: routes.destinations, label: "Explore India" },
  { href: routes.thingsToDo, label: "Things to do" },
  { href: routes.travelGuides, label: "Travel guides" },
  { href: routes.itineraries, label: "Itineraries" },
  { href: "/blog", label: "Blog" },
];
/** The section a page belongs to, so /india/rajasthan still marks "Explore India". */
const isCurrent = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

/**
 * Desktop links in a pill. A white highlight slides to the link under the mouse and returns
 * to the current section when the mouse leaves. It's moved with CSS variables, not React
 * state, so hovering doesn't re-render the header.
 */
function DesktopNav({ pathname, onFilm }: { pathname: string; onFilm: boolean }) {
  const nav = useRef<HTMLElement>(null);
  const moveTo = useCallback((el: HTMLElement | null) => {
    const n = nav.current;
    if (!n) return;
    if (!el) return void n.style.setProperty("--o", "0");
    n.style.setProperty("--x", `${el.offsetLeft}px`);
    n.style.setProperty("--w", `${el.offsetWidth}px`);
    n.style.setProperty("--o", "1");
  }, []);
  const toCurrent = useCallback(() => moveTo(nav.current?.querySelector<HTMLElement>('[aria-current="page"]') ?? null), [moveTo]);

  useEffect(() => {
    toCurrent();
    // Re-measure once web fonts load and when the window is resized.
    document.fonts?.ready.then(toCurrent).catch(() => {});
    window.addEventListener("resize", toCurrent);
    return () => window.removeEventListener("resize", toCurrent);
  }, [pathname, toCurrent]);

  return (
    <nav ref={nav} aria-label="Primary" data-film={onFilm} onMouseLeave={toCurrent} className="sh-nav hidden lg:flex">
      <span aria-hidden className="sh-thumb" />
      {NAV.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={isCurrent(pathname, l.href) ? "page" : undefined}
          onMouseEnter={(e) => moveTo(e.currentTarget)}
          onFocus={(e) => moveTo(e.currentTarget)}
          onBlur={toCurrent}
          className="sh-link"
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  // Close the mobile menu whenever the page changes.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMenu(false);
  }
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu]);

  // The chat is a full-screen app with its own header (Home · title · New trip).
  if (pathname.startsWith("/chat")) return null;
  if (pathname.startsWith("/landingpage")) return null;

  return (
    <HeaderFrame>
      {({ isHome, isScrolled }) => {
        // At the top of the homepage the header sits on the dark hero film: light text, no bar.
        const onFilm = isHome && !isScrolled && !menu;
        const iconBtn = onFilm ? "text-white hover:bg-white/15" : "text-ink hover:bg-black/5 hover:text-coral";
        return (
          <div className="container-site sh-in">
            <div className="flex h-[4.5rem] items-center justify-between gap-4 lg:h-20">
              <Logo tone={onFilm ? "light" : "dark"} />

              <DesktopNav pathname={pathname} onFilm={onFilm} />

              <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                <Link
                  href={routes.chat}
                  onClick={(e) => openPlanner(e)}
                  aria-label="Search or ask the AI planner"
                  title="Search or ask"
                  className={`flex size-10 items-center justify-center rounded-full transition-colors ${iconBtn}`}
                >
                  <Icon name="search" size={19} />
                </Link>
                <Link
                  href="/account"
                  aria-label="Your account — sign in or sign up"
                  title="Your account"
                  className={`hidden size-10 items-center justify-center rounded-full transition-colors sm:flex lg:hidden xl:flex ${iconBtn}`}
                >
                  <Icon name="user" size={18} strokeWidth={1.8} />
                </Link>
                <Link
                  href={routes.chat}
                  onClick={(e) => openPlanner(e)}
                  className={`sh-cta hidden h-11 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-semibold shadow-sm transition-colors sm:inline-flex xl:px-5 ${onFilm ? "bg-white text-ink hover:bg-white/90" : "bg-ink text-white hover:bg-black"}`}
                >
                  <Icon name="sparkles" size={16} className="sh-cta__spark text-coral" />
                  Plan a trip with AI
                </Link>
                <Link
                  href={routes.chat}
                  onClick={(e) => openPlanner(e)}
                  aria-label="Plan a trip with AI"
                  className={`sh-cta flex size-10 items-center justify-center rounded-full sm:hidden ${onFilm ? "bg-white text-ink" : "bg-ink text-white"}`}
                >
                  <Icon name="sparkles" size={17} className="text-coral" />
                </Link>
                <button
                  type="button"
                  aria-expanded={menu}
                  aria-controls="mobile-menu"
                  aria-label={menu ? "Close menu" : "Open menu"}
                  onClick={() => setMenu((m) => !m)}
                  className={`flex size-10 items-center justify-center rounded-full transition-colors lg:hidden ${onFilm ? "text-white hover:bg-white/15" : "text-ink hover:bg-black/5"}`}
                >
                  <Icon name={menu ? "x" : "menu"} size={20} />
                </button>
              </div>
            </div>

            {menu ? (
              <nav id="mobile-menu" aria-label="Mobile" className="sh-menu mb-3 max-h-[75dvh] overflow-y-auto rounded-2xl border border-line bg-white p-2 shadow-card-hover lg:hidden">
                {[...NAV, { href: "/account", label: "Your account" }].map((l, i) => {
                  const on = isCurrent(pathname, l.href);
                  return (
                    <Link
                      key={l.href}
                      href={l.href}
                      aria-current={on ? "page" : undefined}
                      onClick={() => setMenu(false)}
                      style={{ ["--i" as string]: i }}
                      className={`flex items-center justify-between rounded-xl px-3 py-3 font-semibold transition-colors ${on ? "bg-[#FFF4EF] text-coral" : "text-ink hover:bg-canvas"} ${i === NAV.length ? "mt-1 border-t border-line pt-3.5" : ""}`}
                    >
                      {l.label}
                      <Icon name="arrowRight" size={15} className={on ? "text-coral" : "text-[#BBBBBB]"} />
                    </Link>
                  );
                })}
              </nav>
            ) : null}
          </div>
        );
      }}
    </HeaderFrame>
  );
}
