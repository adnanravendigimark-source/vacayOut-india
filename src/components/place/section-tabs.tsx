"use client";

import { useEffect, useRef, useState } from "react";
import { Icon, type Name } from "@/components/icons/icon";

/** Sticky in-page tabs; the tab for the section in view is underlined. */
export function SectionTabs({ tabs, variant = "bar" }: { tabs: { id: string; label: string; icon?: Name }[]; variant?: "bar" | "cards" }) {
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
      { rootMargin: "-150px 0px -55% 0px" },
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

  if (variant === "cards") {
    // State pages: an icon menu that sits over the hero's edge and stays pinned below the header.
    return (
      <nav aria-label="On this page" className="sticky top-[4.5rem] z-30 lg:top-20">
        <div className="container-site">
          <div ref={nav} className="-mt-8 flex overflow-x-auto rounded-2xl border border-line bg-white/95 p-1.5 shadow-card backdrop-blur-md [scrollbar-width:none]">
            {tabs.map((t) => (
              <a
                key={t.id}
                href={`#${t.id}`}
                data-tab={t.id}
                aria-current={active === t.id ? "location" : undefined}
                className={`flex min-w-[6.5rem] flex-1 shrink-0 flex-col items-center gap-1 rounded-xl border-b-2 px-3 py-2.5 text-center text-[0.8125rem] font-medium transition-colors ${active === t.id ? "border-coral bg-[#F7F5F0] text-ink" : "border-transparent text-[#666] hover:bg-[#FBFAF7] hover:text-ink"}`}
              >
                {t.icon ? <Icon name={t.icon} size={19} className={active === t.id ? "text-[#2D5A3F]" : ""} /> : null}
                <span className="whitespace-nowrap">{t.label}</span>
              </a>
            ))}
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav aria-label="On this page" className="sticky top-[4.5rem] z-30 lg:top-20 border-b border-line bg-white/95 backdrop-blur-md">
      <div ref={nav} className="container-site relative flex gap-1 overflow-x-auto [scrollbar-width:none]">
        {tabs.map((t) => (
          <a
            key={t.id}
            href={`#${t.id}`}
            data-tab={t.id}
            aria-current={active === t.id ? "location" : undefined}
            className={`shrink-0 border-b-2 px-3 py-3.5 text-sm font-medium transition-colors sm:px-4 ${active === t.id ? "border-coral text-ink" : "border-transparent text-muted hover:text-ink"}`}
          >
            {t.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
