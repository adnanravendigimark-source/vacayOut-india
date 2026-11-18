"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { isBarePage } from "@/lib/chrome";

/** Overlays the hero video on the homepage; on every page it gains a soft shadow once scrolled. */
export function HeaderFrame({ children }: { children: (props: { isHome: boolean; isScrolled: boolean }) => React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 48);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // The admin has its own shell; sign-in and sign-up are full-screen pages.
  if (pathname.startsWith("/admin") || isBarePage(pathname)) return null;

  const headerClass = !isHome
    ? `sticky top-0 z-40 border-b bg-white/90 backdrop-blur-md transition-[box-shadow,border-color] duration-300 ${isScrolled ? "border-transparent shadow-[0_8px_24px_-16px_rgba(25,25,25,0.25)]" : "border-line"}`
    : isScrolled
      ? "fixed inset-x-0 top-0 z-40 bg-white/95 backdrop-blur-md border-b border-line shadow-sm transition-all duration-300"
      : // At the top of the homepage the header sits on the hero film (light text, see site-header) and turns white once scrolled.
        "fixed inset-x-0 top-0 z-40 bg-transparent transition-all duration-300";

  return (
    <header className={headerClass}>
      {children({ isHome, isScrolled })}
    </header>
  );
}

