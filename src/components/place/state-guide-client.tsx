"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import Image from "@/components/media/image";
import Link from "next/link";
import { Icon, type Name } from "@/components/icons/icon";
import { AiPlannerModal } from "@/components/chat/ai-planner-modal";

/** Opens the AI planner with a prompt about this page. */
export function PlanAiButton({ prompt, children, className }: { prompt: string; children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      {open ? <AiPlannerModal isOpen onClose={() => setOpen(false)} initialPrompt={prompt} /> : null}
    </>
  );
}

export type PracticalTab = {
  key: string;
  title: string;
  icon: Name;
  count: number;
  node: ReactNode;
};

/** Tabbed switcher for practical information categories. */
export function PracticalTabs({ tabs }: { tabs: PracticalTab[] }) {
  const [activeKey, setActiveKey] = useState(tabs[0]?.key);
  const activeTab = tabs.find((t) => t.key === activeKey) ?? tabs[0];

  return (
    <div className="space-y-6">
      {/* Tab Navigation Bar */}
      <div
        role="tablist"
        aria-label="Practical info categories"
        className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]"
      >
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab?.key;
          return (
            <button
              key={tab.key}
              role="tab"
              type="button"
              id={`tab-${tab.key}`}
              aria-selected={isActive}
              aria-controls={`panel-${tab.key}`}
              onClick={() => setActiveKey(tab.key)}
              className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all duration-150 sm:text-sm ${
                isActive
                  ? "bg-ink text-white shadow-sm"
                  : "border border-[#E5E2DC] bg-white text-[#555] hover:border-ink hover:text-ink hover:bg-neutral-50"
              }`}
            >
              <Icon
                name={tab.icon}
                size={16}
                className={isActive ? "text-coral" : "text-[#777]"}
              />
              <span>{tab.title}</span>
              <span
                className={`ml-0.5 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${
                  isActive ? "bg-white/20 text-white" : "bg-[#F0ECE1] text-[#666]"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Tab Content Panel */}
      {activeTab ? (
        <div
          role="tabpanel"
          id={`panel-${activeTab.key}`}
          aria-labelledby={`tab-${activeTab.key}`}
          className="rounded-3xl border border-[#E5E2DC] bg-white p-6 shadow-xs sm:p-8"
        >
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#F0ECE1] pb-4">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-coral/10 text-coral">
                <Icon name={activeTab.icon} size={20} />
              </span>
              <div>
                <h3 className="font-serif text-lg font-bold text-ink sm:text-xl">{activeTab.title}</h3>
                <p className="text-xs text-[#777]">Essential on-ground guidance and verified rules</p>
              </div>
            </div>
            <span className="self-start rounded-full bg-[#FAF8F5] border border-[#EAE6DE] px-3 py-1 text-xs font-semibold text-[#555] sm:self-auto">
              {activeTab.count} verified points
            </span>
          </div>

          {activeTab.node}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Cards with filter chips (a card can sit in several groups) and a "show all" button.
 * Chips appear only when there are at least two groups; counts are real card counts.
 */
export function FilterCards({
  items,
  initial = 8,
  allLabel = "All",
  gridClass,
  label,
}: {
  items: { key: string; groups: string[]; node: ReactNode }[];
  initial?: number;
  allLabel?: string;
  gridClass: string;
  label: string;
}) {
  const [group, setGroup] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const groups = [...new Set(items.flatMap((i) => i.groups))].map((g) => ({ g, n: items.filter((i) => i.groups.includes(g)).length })).filter((x) => x.n > 0 && x.n < items.length);
  const shown = group ? items.filter((i) => i.groups.includes(group)) : items;
  const visible = all ? shown : shown.slice(0, initial);
  return (
    <div className="space-y-5">
      {groups.length > 1 ? (
        <div role="group" aria-label={label} className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          {[{ g: null as string | null, n: items.length }, ...groups].map(({ g, n }) => (
            <button
              key={g ?? "all"}
              type="button"
              aria-pressed={group === g}
              onClick={() => {
                setGroup(g);
                setAll(false);
              }}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[0.8125rem] font-medium transition-colors ${group === g ? "bg-[#F3EFEA] text-ink" : "text-[#777777] hover:text-ink"}`}
            >
              {g ?? allLabel} <span className="ml-0.5 text-[#AAAAAA]">{n}</span>
            </button>
          ))}
        </div>
      ) : null}
      <ul className={gridClass}>
        {visible.map((i) => (
          <li key={i.key} className="flex">
            {i.node}
          </li>
        ))}
      </ul>
      {shown.length > initial ? (
        <button type="button" onClick={() => setAll((a) => !a)} className="mx-auto mt-4 flex items-center gap-1.5 rounded-full border border-[#E5E2DC] bg-white px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink">
          {all ? "Show fewer" : `Show all ${shown.length}`} <Icon name="chevronDown" size={15} className={`transition-transform ${all ? "rotate-180" : ""}`} />
        </button>
      ) : null}
    </div>
  );
}

/**
 * The sticky "on this page" bar. The tab for the section being read is marked as you scroll
 * (a pill slides to it and it scrolls into view on small screens), and a thin line under the
 * bar shows how far down the page you are.
 */
export function SectionNav({ items, children }: { items: { id: string; label: string }[]; children?: ReactNode }) {
  const [active, setActive] = useState(items[0]?.id ?? "");
  const list = useRef<HTMLUListElement>(null);
  const pill = useRef<HTMLLIElement>(null);
  const bar = useRef<HTMLSpanElement>(null);

  // Work out the current section and the read progress from the scroll position.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = 170; // a little below the sticky header and this bar
      let current = items[0]?.id ?? "";
      for (const it of items) {
        const el = document.getElementById(it.id);
        if (el && el.getBoundingClientRect().top <= line) current = it.id;
      }
      setActive(current);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    frame = requestAnimationFrame(update);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [items]);

  // Slide the pill under the active tab and keep that tab in view.
  useEffect(() => {
    const ul = list.current;
    const a = ul?.querySelector<HTMLAnchorElement>(`a[href="#${CSS.escape(active)}"]`);
    if (!ul || !a || !pill.current) return;
    pill.current.style.width = `${a.offsetWidth}px`;
    pill.current.style.transform = `translateX(${a.offsetLeft}px)`;
    pill.current.style.opacity = "1";
    const left = a.offsetLeft - ul.clientWidth / 2 + a.offsetWidth / 2;
    ul.scrollTo({ left, behavior: "smooth" });
  }, [active]);

  return (
    <nav aria-label="On this page" className="sg-nav sticky top-[4.5rem] z-30 border-b border-[#ECE8E2] bg-white/90 backdrop-blur-md lg:top-20">
      <div className="container-site flex items-center gap-4 py-2.5">
        <ul ref={list} className="sg-nav__list relative flex min-w-0 flex-1 items-center gap-1 overflow-x-auto text-[0.8125rem] font-medium [scrollbar-width:none]">
          <li ref={pill} aria-hidden className="sg-nav__pill pointer-events-none absolute left-0 top-0 h-full rounded-full bg-[#F3EFEA] opacity-0" />
          {items.map((n) => {
            const on = n.id === active;
            return (
              <li key={n.id} className="shrink-0">
                <a href={`#${n.id}`} aria-current={on ? "location" : undefined} onClick={() => setActive(n.id)} className={`relative block rounded-full px-3.5 py-1.5 transition-colors ${on ? "text-ink" : "text-[#777777] hover:text-ink"}`}>
                  {n.label}
                </a>
              </li>
            );
          })}
        </ul>
        {children}
      </div>
      <span ref={bar} aria-hidden className="sg-nav__bar absolute bottom-[-1px] left-0 h-[2px] w-full origin-left bg-coral" style={{ transform: "scaleX(0)" }} />
    </nav>
  );
}


export type MapDot = { name: string; x: number; y: number; href?: string };
export type RegionGeo = { view: [number, number, number, number]; state: string; context: string[]; all: MapDot[] };
export type RegionItem = {
  title: string;
  body: string;
  image: { url: string; alt: string; ai?: boolean } | null;
  towns: { name: string; href: string; dot: MapDot | null; lat: number | null; lng: number | null }[];
};

const fmtCoord = (lat: number, lng: number) => `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? "N" : "S"}, ${Math.abs(lng).toFixed(2)}° ${lng >= 0 ? "E" : "W"}`;

/**
 * A line-drawn map of the state (neighbouring states in faint lines). Every destination is a
 * small dot; the open region's towns are coral dots with labels, and the area around them is
 * filled with the region's photo.
 */
function RegionMap({ geo, region, index }: { geo: RegionGeo; region: RegionItem | undefined; index: number }) {
  const [vx, vy, vw, vh] = geo.view;
  const u = Math.max(vw, vh) / 100; // one "unit" = 1% of the view, so sizes look the same on any state
  const dots = (region?.towns ?? []).map((t) => t.dot).filter(Boolean) as MapDot[];
  const clip = `rgn-clip-${index}`;
  const r = u * 10;
  const xs = dots.map((d) => d.x), ys = dots.map((d) => d.y);
  const bx = Math.min(...xs) - r, by = Math.min(...ys) - r, bw = Math.max(...xs) - Math.min(...xs) + r * 2, bh = Math.max(...ys) - Math.min(...ys) + r * 2;
  const geoPts = (region?.towns ?? []).filter((t) => t.lat != null && t.lng != null);
  const coord = geoPts.length ? fmtCoord(geoPts.reduce((a, t) => a + t.lat!, 0) / geoPts.length, geoPts.reduce((a, t) => a + t.lng!, 0) / geoPts.length) : null;
  // Stack labels so close towns don't print on top of each other.
  const fs = u * 2.6;
  const labels = new Map<string, { x: number; y: number }>();
  const placed: { x: number; y: number; w: number }[] = [];
  for (const d of [...dots].sort((a, b) => a.y - b.y)) {
    const w = d.name.length * fs * 0.68;
    const x = d.x + u * 2;
    let y = d.y - u * 1.6;
    for (let k = 0; k < 8 && placed.some((p) => Math.abs(p.y - y) < fs * 1.3 && x < p.x + p.w && p.x < x + w); k++) y += fs * 1.4;
    placed.push({ x, y, w });
    labels.set(d.name, { x, y });
  }
  const img = region?.image ? `/_next/image?url=${encodeURIComponent(region.image.url)}&w=640&q=70` : null;

  return (
    <div className="rgn-map relative size-full">
      <svg viewBox={`${vx} ${vy} ${vw} ${vh}`} className="size-full" role="img" aria-label={region ? `Map: ${region.title}` : "Map of the regions"}>
        <defs>
          {dots.length ? (
            <clipPath id={clip}>
              {dots.map((d) => <circle key={d.name} cx={d.x} cy={d.y} r={r} />)}
              {dots.length > 1 ? <polyline points={dots.map((d) => `${d.x},${d.y}`).join(" ")} fill="none" stroke="#000" strokeWidth={r * 1.2} strokeLinecap="round" strokeLinejoin="round" /> : null}
            </clipPath>
          ) : null}
        </defs>
        {geo.context.map((d, i) => <path key={i} d={d} fill="none" stroke="#CFC6BA" strokeWidth={u * 0.18} />)}
        <path d={geo.state} fill="#FFFFFF" fillOpacity={0.55} stroke="#2B2722" strokeWidth={u * 0.32} strokeLinejoin="round" />

        {/* the open region: photo inside a soft shape around its towns */}
        {dots.length ? (
          <g key={`blob-${index}`} className="rgn-blob" style={{ transformOrigin: `${bx + bw / 2}px ${by + bh / 2}px` }}>
            {img ? (
              <image href={img} x={bx} y={by} width={bw} height={bh} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clip})`} />
            ) : (
              <rect x={bx} y={by} width={bw} height={bh} fill="#E8553E" fillOpacity={0.15} clipPath={`url(#${clip})`} />
            )}
          </g>
        ) : null}

        {geo.all.map((d) => <circle key={d.name} cx={d.x} cy={d.y} r={u * 0.75} fill="#B5AA9C" />)}

        {dots.map((d, i) => (
          <g key={`${index}-${d.name}`} className="rgn-dot" style={{ ["--i" as string]: i }}>
            <circle cx={d.x} cy={d.y} r={u * 2.2} fill="#E8553E" fillOpacity={0.18} className="rgn-dot__pulse" style={{ transformOrigin: `${d.x}px ${d.y}px` }} />
            <circle cx={d.x} cy={d.y} r={u * 1.15} fill="#E8553E" stroke="#FFFFFF" strokeWidth={u * 0.35} />
            <text x={labels.get(d.name)?.x} y={labels.get(d.name)?.y} fontSize={fs} className="rgn-dot__label">{d.name}</text>
          </g>
        ))}
      </svg>

      <p className="pointer-events-none absolute left-4 top-3.5 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-[#8A8178]">Plan by region</p>
      {coord ? <p key={coord} className="rgn__cap pointer-events-none absolute right-4 top-3.5 font-mono text-[0.625rem] tracking-[0.12em] text-[#8A8178]">{coord}</p> : null}
      {region ? (
        <p key={`t-${index}`} className="rgn__cap pointer-events-none absolute bottom-3.5 left-4 text-sm">
          <span className="font-semibold text-coral">{String(index + 1).padStart(2, "0")}</span>
          <span className="ml-2 font-serif text-ink">{region.title}</span>
        </p>
      ) : null}
      {region?.image?.ai && dots.length ? <span className="absolute bottom-3.5 right-4 rounded bg-black/55 px-1.5 py-0.5 text-[0.625rem] font-semibold text-white">Photo area: AI illustration</span> : null}
    </div>
  );
}

/**
 * Regions as a numbered accordion beside a line-drawn map: open a region and its towns light
 * up on the map with the region's photo around them. One region is open at a time.
 */
export function RegionAccordion({ regions, geo }: { regions: RegionItem[]; geo: RegionGeo | null }) {
  const [open, setOpen] = useState(0);
  const cur = regions[open];

  return (
    <div className={`grid gap-6 ${geo ? "lg:grid-cols-12 lg:gap-10" : ""}`}>
      {geo ? (
        <div className="lg:col-span-6">
          <div className="overflow-hidden rounded-2xl border border-[#ECE4D9] bg-[#F6F1EA] lg:sticky lg:top-[9.5rem]">
            <div className="h-[300px] sm:h-[340px] lg:h-[380px]">
              <RegionMap geo={geo} region={open >= 0 ? cur : undefined} index={open} />
            </div>
          </div>
        </div>
      ) : null}

      <ol className={`border-t border-[#ECE8E2] ${geo ? "lg:col-span-6" : ""}`}>
        {regions.map((r, i) => {
          const on = i === open;
          const pid = `rgn-panel-${i}`;
          return (
            <li key={i} className="border-b border-[#ECE8E2]">
              <h3>
                <button
                  type="button"
                  aria-expanded={on}
                  aria-controls={pid}
                  onClick={() => setOpen(on ? -1 : i)}
                  className="group flex w-full items-center gap-4 py-3.5 text-left"
                >
                  <span className={`w-6 shrink-0 font-serif text-xs tabular-nums transition-colors ${on ? "text-coral" : "text-[#BBBBBB]"}`}>{String(i + 1).padStart(2, "0")}</span>
                  <span className={`min-w-0 flex-1 font-serif text-[1.125rem] leading-snug transition-colors ${on ? "text-ink" : "text-[#777777] group-hover:text-ink"}`}>{r.title}</span>
                  {r.towns.length ? <span className="hidden shrink-0 text-[0.6875rem] text-[#AAAAAA] sm:block">{r.towns.length} {r.towns.length === 1 ? "place" : "places"}</span> : null}
                  <span className={`grid size-7 shrink-0 place-items-center rounded-full border transition-all duration-300 ${on ? "rotate-180 border-ink bg-ink text-white" : "border-[#E2DED7] text-[#777777] group-hover:border-ink"}`}>
                    <Icon name="chevronDown" size={13} />
                  </span>
                </button>
              </h3>
              <div id={pid} role="region" className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(.16,1,.3,1)] ${on ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                <div className="overflow-hidden">
                  <div className="pb-4 pl-10 pr-2">
                    <p className="text-sm leading-relaxed text-[#555555]">{r.body}</p>
                    {r.towns.length ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {r.towns.map((t) => (
                          <Link key={t.href} href={t.href} tabIndex={on ? 0 : -1} className="inline-flex items-center gap-1 rounded-full border border-[#E5E2DC] px-2.5 py-0.5 text-xs font-medium text-ink transition-colors hover:border-coral hover:text-coral">
                            {t.name} <Icon name="arrowRight" size={10} className="text-[#BBBBBB]" />
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export type SeasonPanel = {
  label: string;
  when: string | null;
  text: string;
  months: number[]; // 0 = January
  image: { url: string; alt: string; ai?: boolean } | null;
};

const noop = () => () => {};

/**
 * Seasons as tall photo panels. The one you point at (or tap) opens wide with its months and
 * what that season is like; the season we are in now opens first and is marked "Now".
 */
export function SeasonPanels({ seasons }: { seasons: SeasonPanel[] }) {
  const month = useSyncExternalStore(noop, () => new Date().getMonth(), () => -1);
  const nowIdx = seasons.findIndex((s) => s.months.includes(month));
  const [picked, setPicked] = useState<number | null>(null);
  const active = picked ?? (nowIdx >= 0 ? nowIdx : 0);

  return (
    <ul className="flex flex-col gap-3 lg:h-[440px] lg:flex-row">
      {seasons.map((s, i) => {
        const on = i === active;
        return (
          <li
            key={s.label}
            className={`season relative overflow-hidden rounded-2xl bg-[#1a1714] text-white lg:min-w-0 ${on ? "lg:flex-[3.2]" : "lg:flex-1"}`}
            onPointerEnter={(e) => { if (e.pointerType === "mouse") setPicked(i); }}
          >
            <button type="button" onClick={() => setPicked(i)} aria-expanded={on} className="absolute inset-0 z-10 hidden cursor-pointer lg:block" aria-label={`${s.label}${s.when ? `, ${s.when}` : ""}`} />
            <div className="relative h-44 lg:absolute lg:inset-0 lg:h-auto">
              {s.image ? <Image src={s.image.url} alt={s.image.alt} fill sizes="(min-width: 1024px) 50vw, 100vw" className={`season__img object-cover ${on ? "scale-100" : "lg:scale-110"}`} /> : null}
              <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/5" />
              {s.image?.ai ? <span className="absolute right-3 top-3 rounded bg-black/55 px-1.5 py-0.5 text-[0.625rem] font-semibold">AI illustration</span> : null}
            </div>

            <div className="relative p-5 lg:absolute lg:inset-x-0 lg:bottom-0 lg:p-6">
              <div className="flex flex-wrap items-center gap-2">
                {i === nowIdx ? <span className="rounded-full bg-coral px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wider">Now</span> : null}
                {s.when ? <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-white/75">{s.when}</span> : null}
              </div>
              <h3 className={`mt-1.5 font-serif leading-tight transition-[font-size] duration-500 ${on ? "text-[1.9rem]" : "text-[1.35rem]"}`}>{s.label}</h3>
              <p className={`season__text mt-2 max-w-xl text-sm leading-relaxed text-white/85 ${on ? "lg:opacity-100" : "lg:pointer-events-none lg:h-0 lg:opacity-0"}`}>{s.text}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
