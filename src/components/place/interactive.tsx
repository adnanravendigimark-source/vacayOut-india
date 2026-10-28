"use client";

import { Children, useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Icon } from "@/components/icons/icon";

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
          <li key={i} className="flex w-[80%] shrink-0 snap-start @xl:w-[45%] @4xl:w-[31.5%]">{c}</li>
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
      <ul className="grid grid-cols-1 gap-4 @lg:grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-4">
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
        <details key={i} className="group scroll-mt-24" open={i === defaultOpen}>
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
