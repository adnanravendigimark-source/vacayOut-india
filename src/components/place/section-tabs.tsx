"use client";

import { useEffect, useRef, useState } from "react";

/** Sticky in-page tabs; the tab for the section in view is underlined. */
export function SectionTabs({ tabs }: { tabs: { id: string; label: string }[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const nav = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const els = tabs.map((t) => document.getElementById(t.id)).filter((e): e is HTMLElement => !!e);
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -60% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [tabs]);

  // Keep the active tab visible when the bar scrolls sideways on small screens.
  useEffect(() => {
    // Scroll only the tab bar sideways — never the page or a surrounding panel.
    const bar = nav.current;
    const tab = bar?.querySelector<HTMLElement>(`[data-tab="${active}"]`);
    if (!bar || !tab) return;
    if (tab.offsetLeft < bar.scrollLeft || tab.offsetLeft + tab.offsetWidth > bar.scrollLeft + bar.clientWidth) {
      bar.scrollTo({ left: tab.offsetLeft - 16, behavior: "smooth" });
    }
  }, [active]);

  return (
    <nav aria-label="On this page" className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur-md">
      <div ref={nav} className="container-site relative flex gap-1 overflow-x-auto [scrollbar-width:none]">
        {tabs.map((t) => (
          <a
            key={t.id}
            href={`#${t.id}`}
            data-tab={t.id}
            aria-current={active === t.id ? "location" : undefined}
            className={`shrink-0 border-b-2 px-3 py-4 text-sm font-medium transition-colors sm:px-4 ${active === t.id ? "border-coral text-ink" : "border-transparent text-muted hover:text-ink"}`}
          >
            {t.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
