"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons/icon";
import { routes } from "@/lib/routes";
import { Logo } from "./logo";
import { HeaderFrame } from "./header-frame";

/** Opens the AI planner: in place on the homepage, otherwise on the chat page. */
function openPlanner(e: React.MouseEvent, prompt?: string) {
  if (typeof window !== "undefined" && window.location.pathname === "/") {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent("vacayout:open-ai", { detail: { prompt } }));
  }
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

  // The chat is a full-screen app with its own header (Home · title · New trip).
  if (pathname.startsWith("/chat")) return null;

  const navLink = (href: string) =>
    `py-2 transition-colors hover:text-coral ${pathname === href ? "text-coral font-semibold" : ""}`;

  return (
    <HeaderFrame>
      {() => (
        <div className="container-site">
          <div className="flex h-[4.5rem] items-center justify-between gap-4 lg:h-20">
            <Logo tone="dark" />

            <nav aria-label="Primary" className="hidden items-center gap-5 whitespace-nowrap text-[0.9375rem] font-medium text-ink lg:flex xl:gap-7">
              <Link href={routes.home} className={navLink("/")}>Home</Link>
              <Link href={routes.destinations} className={navLink(routes.destinations)}>Explore India</Link>
              <Link href="/things-to-do" className={navLink("/things-to-do")}>Things to do</Link>
              <Link href="/travel-guides" className={navLink("/travel-guides")}>Travel guides</Link>
              <Link href="/itineraries" className={navLink("/itineraries")}>Itineraries</Link>
            </nav>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 xl:gap-3">
              <Link
                href={routes.chat}
                onClick={(e) => openPlanner(e)}
                aria-label="Search or ask the AI planner"
                title="Search or ask"
                className="flex size-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-black/5 hover:text-coral"
              >
                <Icon name="search" size={19} />
              </Link>
              <Link
                href="/account"
                aria-label="Your account — sign in or sign up"
                title="Your account"
                className="hidden size-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-black/5 hover:text-coral sm:flex lg:hidden xl:flex"
              >
                <Icon name="user" size={18} strokeWidth={1.8} />
              </Link>
              <Link
                href={routes.chat}
                onClick={(e) => openPlanner(e)}
                className="hidden h-11 items-center gap-2 whitespace-nowrap rounded-full bg-ink px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-black sm:inline-flex xl:px-5"
              >
                <Icon name="sparkles" size={16} className="text-coral" />
                Plan a trip with AI
              </Link>
              <Link
                href={routes.chat}
                onClick={(e) => openPlanner(e)}
                aria-label="Plan a trip with AI"
                className="flex size-10 items-center justify-center rounded-full bg-ink text-white sm:hidden"
              >
                <Icon name="sparkles" size={17} className="text-coral" />
              </Link>
              <button
                type="button"
                aria-expanded={menu}
                aria-controls="mobile-menu"
                aria-label={menu ? "Close menu" : "Open menu"}
                onClick={() => setMenu((m) => !m)}
                className="flex size-10 items-center justify-center rounded-full text-ink hover:bg-black/5 lg:hidden"
              >
                <Icon name={menu ? "x" : "menu"} size={20} />
              </button>
            </div>
          </div>

          {menu ? (
            <nav id="mobile-menu" aria-label="Mobile" className="mb-3 max-h-[75dvh] overflow-y-auto rounded-2xl border border-line bg-white p-3 shadow-card-hover lg:hidden">
              <Link href={routes.home} onClick={() => setMenu(false)} className="block rounded-xl px-3 py-2.5 font-semibold text-ink hover:bg-canvas">Home</Link>
              <Link href={routes.destinations} onClick={() => setMenu(false)} className="block rounded-xl px-3 py-2.5 font-semibold text-ink hover:bg-canvas">Explore India</Link>
              <Link href="/things-to-do" onClick={() => setMenu(false)} className="block rounded-xl px-3 py-2.5 font-semibold text-ink hover:bg-canvas">Things to do</Link>
              <div className="mt-2 border-t border-line pt-2">
                <Link href="/travel-guides" onClick={() => setMenu(false)} className="block rounded-xl px-3 py-2.5 font-semibold text-ink hover:bg-canvas">Travel guides</Link>
                <Link href="/itineraries" onClick={() => setMenu(false)} className="block rounded-xl px-3 py-2.5 font-semibold text-ink hover:bg-canvas">Itineraries</Link>
                <Link href="/account" onClick={() => setMenu(false)} className="block rounded-xl px-3 py-2.5 font-semibold text-ink hover:bg-canvas">Your account</Link>
              </div>
            </nav>
          ) : null}
        </div>
      )}
    </HeaderFrame>
  );
}
