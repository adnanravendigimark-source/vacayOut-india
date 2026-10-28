"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/** Overlays the hero video on the homepage; adapts when scrolled. */
export function HeaderFrame({ children }: { children: (props: { isHome: boolean; isScrolled: boolean }) => React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    if (!isHome) return;
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 48);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHome]);

  // The admin has its own shell.
  if (pathname.startsWith("/admin")) return null;

  const headerClass = !isHome
    ? "sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur-md"
    : isScrolled
      ? "fixed inset-x-0 top-0 z-40 bg-white/95 backdrop-blur-md border-b border-line shadow-sm transition-all duration-300"
      : // At the top of the homepage the header sits directly on the hero video, with no background of its own.
        "fixed inset-x-0 top-0 z-40 bg-transparent transition-all duration-300";

  return (
    <header className={headerClass}>
      {children({ isHome, isScrolled })}
    </header>
  );
}

