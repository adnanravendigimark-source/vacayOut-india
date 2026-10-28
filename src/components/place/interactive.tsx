"use client";

import { Children, useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons/icon";
import { routes } from "@/lib/routes";

/**
 * Small interactive pieces for the shared place template. Every panel's
 * content is rendered into the HTML (hidden, not removed), so search engines
 * and no-JS readers still get all of it.
 */

/** A horizontal row of cards with arrow buttons and scroll-snap; swipe on phones. */
export function Rail({ children, label }: { children: ReactNode; label: string }) {
  const ref = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const items = Children.toArray(children);
  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);
  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);
  const move = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.85, behavior: "smooth" });
  const arrow = "absolute top-1/2 z-10 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-white text-ink shadow-card transition hover:scale-105 hover:border-ink disabled:pointer-events-none disabled:opacity-0 @3xl:flex";
  return (
    <div className="relative" role="region" aria-label={label}>
      <ul ref={ref} className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-1 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((c, i) => (
          <li key={i} className="flex w-[82%] shrink-0 snap-start @lg:w-[46%] @3xl:w-[31.5%]">{c}</li>
        ))}
      </ul>
      {items.length > 1 ? (
        <>
          <button type="button" aria-label="Scroll back" onClick={() => move(-1)} disabled={edge.start} className={`${arrow} -left-4`}><Icon name="arrowLeft" size={18} /></button>
          <button type="button" aria-label="Scroll forward" onClick={() => move(1)} disabled={edge.end} className={`${arrow} -right-4`}><Icon name="arrowRight" size={18} /></button>
        </>
      ) : null}
    </div>
  );
}

/** Accessible tabs; all panels stay in the HTML. */
export function Tabs({ tabs, label, variant = "pills" }: { tabs: { id: string; label: string; content: ReactNode }[]; label: string; variant?: "pills" | "underline" }) {
  const base = useId();
  const [active, setActive] = useState(0);
  const btns = useRef<(HTMLButtonElement | null)[]>([]);
  if (!tabs.length) return null;
  const onKey = (e: KeyboardEvent) => {
    const n = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!n) return;
    e.preventDefault();
    const next = (active + n + tabs.length) % tabs.length;
    setActive(next);
    btns.current[next]?.focus();
  };
  return (
    <div>
      <div role="tablist" aria-label={label} onKeyDown={onKey} className={`flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] ${variant === "underline" ? "gap-0 border-b border-line" : ""}`}>
        {tabs.map((t, i) => {
          const on = i === active;
          const cls =
            variant === "underline"
              ? `-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${on ? "border-coral text-ink" : "border-transparent text-[#666] hover:text-ink"}`
              : `shrink-0 rounded-full border px-4 py-2 text-[0.8125rem] font-medium transition-all ${on ? "border-ink bg-ink text-white shadow-sm" : "border-line bg-white text-ink hover:-translate-y-0.5 hover:border-ink"}`;
          return (
            <button
              key={t.id}
              ref={(el) => { btns.current[i] = el; }}
              type="button"
              role="tab"
              id={`${base}-t-${t.id}`}
              aria-selected={on}
              aria-controls={`${base}-p-${t.id}`}
              tabIndex={on ? 0 : -1}
              onClick={() => setActive(i)}
              className={cls}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {tabs.map((t, i) => (
        <div key={t.id} role="tabpanel" id={`${base}-p-${t.id}`} aria-labelledby={`${base}-t-${t.id}`} hidden={i !== active} className="mt-4 animate-[fadeIn_.25s_ease-out]">
          {t.content}
        </div>
      ))}
    </div>
  );
}

/** Long text, shortened with a fade and a "Read more" toggle. */
export function ReadMore({ children, lines = 6 }: { children: ReactNode; lines?: number }) {
  const [open, setOpen] = useState(false);
  const [needed, setNeeded] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) setNeeded(el.scrollHeight > el.clientHeight + 8);
  }, []);
  return (
    <div>
      <div ref={ref} className={`relative overflow-hidden transition-[max-height] duration-300 ${open ? "max-h-none" : ""}`} style={open ? undefined : { maxHeight: `${lines * 1.7}em` }}>
        {children}
        {!open && needed ? <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#FBFAF7] to-transparent" /> : null}
      </div>
      {needed ? (
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[#B9442B] hover:underline">
          {open ? "Show less" : "Read more"} <Icon name="chevronDown" size={15} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      ) : null}
    </div>
  );
}

/** A card grid with filter chips by group, showing the first `initial` cards and a "Show all" button. */
export function FilterGrid({ items, initial = 8, allLabel = "All" }: { items: { key: string; group: string; node: ReactNode }[]; initial?: number; allLabel?: string }) {
  const [group, setGroup] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const groups = [...new Set(items.map((i) => i.group))];
  const shown = items.filter((i) => !group || i.group === group);
  const visible = all ? shown : shown.slice(0, initial);
  return (
    <div className="space-y-4">
      {groups.length > 1 ? (
        <div role="group" aria-label="Filter" className="flex flex-wrap gap-2">
          {[null, ...groups].map((g) => (
            <button
              key={g ?? "all"}
              type="button"
              aria-pressed={group === g}
              onClick={() => { setGroup(g); setAll(false); }}
              className={`rounded-full border px-3.5 py-1.5 text-[0.8125rem] font-medium transition-all ${group === g ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:-translate-y-0.5 hover:border-ink"}`}
            >
              {g ?? allLabel} <span className={group === g ? "text-white/70" : "text-[#888]"}>{g ? items.filter((i) => i.group === g).length : items.length}</span>
            </button>
          ))}
        </div>
      ) : null}
      <ul className="grid grid-cols-2 gap-3 @3xl:grid-cols-3 @3xl:gap-4 @5xl:grid-cols-4">
        {visible.map((i) => <li key={i.key} className="flex">{i.node}</li>)}
      </ul>
      {shown.length > initial ? (
        <button type="button" onClick={() => setAll((a) => !a)} className="mx-auto flex items-center gap-1.5 rounded-full border border-line bg-white px-5 py-2 text-sm font-semibold text-ink transition hover:border-ink">
          {all ? "Show fewer" : `Show all ${shown.length}`} <Icon name="chevronDown" size={15} className={`transition-transform ${all ? "rotate-180" : ""}`} />
        </button>
      ) : null}
    </div>
  );
}

/** Rows that open one at a time (areas, practical info, safety). */
export function Accordion({ items, defaultOpen = 0 }: { items: { title: string; body: ReactNode; badge?: ReactNode }[]; defaultOpen?: number }) {
  const box = useRef<HTMLDivElement>(null);
  // A link to #id inside a closed row opens that row and scrolls to it.
  useEffect(() => {
    const open = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id || !box.current) return;
      const target = box.current.querySelector<HTMLElement>(`[id="${CSS.escape(id)}"]`);
      const row = target?.closest("details");
      if (row && target) {
        row.open = true;
        requestAnimationFrame(() => row.scrollIntoView({ behavior: "smooth", block: "start" }));
      }
    };
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, []);
  return (
    <div ref={box} className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
      {items.map((it, i) => (
        <details key={i} className="group scroll-mt-36" open={i === defaultOpen}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3.5 text-[0.9375rem] font-semibold text-ink transition-colors hover:bg-[#F7F5F0] [&::-webkit-details-marker]:hidden">
            <span className="flex flex-wrap items-center gap-2">{it.title}{it.badge}</span>
            <Icon name="chevronDown" size={17} className="shrink-0 text-[#888] transition-transform group-open:rotate-180" />
          </summary>
          <div className="px-5 pb-4 text-sm leading-relaxed text-[#555]">{it.body}</div>
        </details>
      ))}
    </div>
  );
}

/** "Ask AI to plan your trip" box: opens the chat with the visitor's question. */
export function AskBox({ placeName, suggestions = [], tone = "light" }: { placeName: string; suggestions?: string[]; tone?: "light" | "hero" }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const go = (text: string) => router.push(routes.chatWithPrompt(text.trim() || `Plan a trip to ${placeName}`));
  const hero = tone === "hero";
  return (
    <div>
      <form onSubmit={(e) => { e.preventDefault(); go(q); }} role="search" className={`flex items-center gap-2 rounded-full border p-1.5 pl-4 shadow-card ${hero ? "border-white/40 bg-white/95" : "border-line bg-white"}`}>
        <Icon name="sparkles" size={16} className="shrink-0 text-coral" />
        <label className="sr-only" htmlFor={`ask-${tone}`}>Ask our AI planner about {placeName}</label>
        <input id={`ask-${tone}`} value={q} onChange={(e) => setQ(e.target.value)} maxLength={300} placeholder={`Ask AI to plan your ${placeName} trip…`} className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-[#888] focus:outline-none" />
        <button type="submit" aria-label="Ask" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#2D5A3F] text-white transition hover:scale-105 hover:bg-[#244A33]"><Icon name="arrowRight" size={16} /></button>
      </form>
      {suggestions.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button key={s} type="button" onClick={() => go(s)} className="rounded-full border border-line bg-white px-3 py-1 text-xs text-[#444] transition hover:-translate-y-0.5 hover:border-ink">{s}</button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Detail pop-ups for places shown inside this page. Each has its own link
 * (#slug): following it, or clicking a card that points to it, opens the
 * pop-up. Content stays in the HTML for search engines and no-JS readers.
 */
export function HashDialogs({ items }: { items: { slug: string; title: string; body: ReactNode }[] }) {
  const refs = useRef<Record<string, HTMLDialogElement | null>>({});
  useEffect(() => {
    const open = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const d = id ? refs.current[id] : null;
      if (d && !d.open) d.showModal();
    };
    // Client-side links (next/link) change the hash without a hashchange event, so catch the click itself.
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href^='#']");
      const id = a ? decodeURIComponent((a.getAttribute("href") ?? "").slice(1)) : "";
      const d = id ? refs.current[id] : null;
      if (!d) return;
      e.preventDefault();
      history.pushState(null, "", `#${encodeURIComponent(id)}`);
      if (!d.open) d.showModal();
    };
    open();
    window.addEventListener("hashchange", open);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("hashchange", open);
      document.removeEventListener("click", onClick, true);
    };
  }, []);
  const onClose = (slug: string) => {
    if (window.location.hash === `#${encodeURIComponent(slug)}` || window.location.hash === `#${slug}`) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  };
  return (
    <>
      {items.map((it) => (
        <dialog
          key={it.slug}
          id={it.slug}
          ref={(el) => { refs.current[it.slug] = el; }}
          aria-label={it.title}
          onClose={() => onClose(it.slug)}
          onClick={(e) => { if (e.target === e.currentTarget) e.currentTarget.close(); }}
          className="@container m-auto max-h-[88dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl bg-[#FBFAF7] p-0 text-ink shadow-2xl backdrop:bg-black/55 backdrop:backdrop-blur-[2px] open:animate-[fadeIn_.2s_ease-out]"
        >
          <form method="dialog" className="sticky top-0 z-10 flex justify-end p-2 [height:0]">
            <button type="submit" aria-label="Close" className="flex size-9 items-center justify-center rounded-full bg-white/95 text-ink shadow-card transition hover:scale-105"><span aria-hidden className="text-xl leading-none">×</span></button>
          </form>
          {it.body}
        </dialog>
      ))}
    </>
  );
}
