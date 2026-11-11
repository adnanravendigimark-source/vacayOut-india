"use client";

import Image from "@/components/media/image";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Icon, type Name } from "@/components/icons/icon";
import { AiPlannerModal } from "@/components/chat/ai-planner-modal";
import type { PageHero } from "@/components/explore/explore-page";
import type { TravelGuidesData } from "@/lib/places/public-lists";
import { TRIP_TYPES } from "@/lib/places/trip-types";
import { HubHeader } from "@/components/layout/hub-header";

const fmt = (d: Date | string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const categoryOf = (tripTypes: string[]) => TRIP_TYPES.find((t) => tripTypes.includes(t.key))?.label ?? null;

// `hero` stays in the props for the page files; this page no longer shows a photo hero.
export function TravelGuidesPage({ data, initialTab }: { data: TravelGuidesData; hero: PageHero; initialTab?: "articles" | "destinations" }) {
  const [tab, setTab] = useState<"articles" | "destinations">(initialTab ?? (data.articles.length ? "articles" : "destinations"));
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activePrompt, setActivePrompt] = useState<string | undefined>(undefined);

  const handleStartPlan = (prompt: string) => {
    setActivePrompt(prompt);
    setIsModalOpen(true);
  };

  useEffect(() => {
    const handleOpenAi = (e: Event) => {
      const custom = e as CustomEvent<{ prompt?: string }>;
      if (custom.detail?.prompt) setActivePrompt(custom.detail.prompt);
      setIsModalOpen(true);
    };
    window.addEventListener("vacayout:open-ai", handleOpenAi);
    return () => window.removeEventListener("vacayout:open-ai", handleOpenAi);
  }, []);

  const filteredGuides = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return (tab === "articles" ? data.articles : data.guides).filter(
      (g) =>
        (!activeCategory || g.tripTypes.includes(activeCategory)) &&
        (!q || g.title.toLowerCase().includes(q) || g.name.toLowerCase().includes(q) || g.snippet.toLowerCase().includes(q) || g.stateName.toLowerCase().includes(q)),
    );
  }, [activeCategory, searchQuery, tab, data.guides, data.articles]);
  const current = tab === "articles" ? data.articles : data.guides;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && filteredGuides.length === 0) handleStartPlan(`Travel guide: ${searchQuery.trim()}`);
  };

  const filtersOn = !!activeCategory || !!searchQuery.trim();
  // Magazine layout: a lead story and three more beside it, then the rest.
  const showLead = !filtersOn && filteredGuides.length >= 4;
  const lead = showLead ? filteredGuides[0] : null;
  const side = showLead ? filteredGuides.slice(1, 4) : [];
  const rest = showLead ? filteredGuides.slice(4) : filteredGuides;
  type Guide = (typeof filteredGuides)[number];
  const cat = (g: Guide) => categoryOf(g.tripTypes) ?? g.kindLabel;
  const cover = (g: Guide, sizes: string, iconSize = 26) =>
    g.image ? (
      <>
        <Image src={g.image.url} alt="" fill sizes={sizes} className="object-cover transition-transform duration-500 ease-out group-hover:scale-105" />
        {g.image.kind === "ai_generated" ? <span className="absolute right-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[0.625rem] font-semibold text-white">AI illustration</span> : null}
      </>
    ) : (
      <span className="flex size-full items-center justify-center text-[#B9B4AA]"><Icon name="book" size={iconSize} /></span>
    );

  return (
    <div className="min-h-screen bg-white">
      <HubHeader
        crumb="Travel guides"
        eyebrow="Travel guides"
        title="Plan smarter, travel better"
        intro="How-to guides and full destination guides for India, written from official sources and approved by an editor."
        stats={[
          { value: data.articles.length, label: "articles" },
          { value: data.guides.length, label: "destination guides" },
        ]}
        search={{
          id: "guides-search",
          label: "Search destinations or guides",
          placeholder: "Search guides, places or states…",
          value: searchQuery,
          onChange: setSearchQuery,
          onSubmit: handleSearchSubmit,
        }}
      />

      {/* Guide type + category, one sticky bar */}
      <div className="sticky top-[4.5rem] z-20 border-b border-line-subtle bg-white/95 backdrop-blur-sm lg:top-20">
        <div className="container-site flex flex-col gap-3 py-3 lg:flex-row lg:items-center lg:gap-6">
          <div role="tablist" aria-label="Guide type" className="inline-flex shrink-0 self-start rounded-full bg-[#F2EFE9] p-1">
            {([["articles", "Articles", data.articles.length], ["destinations", "Destination guides", data.guides.length]] as const).map(([key, label, n]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`rounded-full px-4 py-1.5 text-[0.8125rem] font-semibold transition-all ${tab === key ? "bg-white text-ink shadow-xs" : "text-[#666] hover:text-ink"}`}
              >
                {label} <span className="text-xs font-medium text-muted">{n}</span>
              </button>
            ))}
          </div>
          {data.categories.length ? (
            <div className="-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:px-0">
              {[{ key: null as string | null, label: "All", icon: "grid" }, ...data.categories].map((c) => {
                const active = activeCategory === c.key;
                return (
                  <button
                    key={c.key ?? "all"}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setActiveCategory(c.key)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.8125rem] font-medium transition-colors ${active ? "bg-coral-soft text-coral" : "text-[#555] hover:bg-[#F6F4EF] hover:text-ink"}`}
                  >
                    <Icon name={c.icon as Name} size={14} />
                    {c.label}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      <main className="container-site py-8 sm:py-10">
        {current.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line p-10 text-center">
            <p className="text-sm font-semibold text-ink">Our travel guides are being researched and reviewed.</p>
            <p className="mt-1 text-xs text-muted">Every guide is checked against official sources and approved by an editor before it appears here.</p>
            <button type="button" onClick={() => handleStartPlan("Help me plan a trip in India")} className="mt-4 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white">Ask the AI planner</button>
          </div>
        ) : filteredGuides.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line p-10 text-center">
            <p className="text-sm font-semibold text-ink">No travel guides matched your search.</p>
            <div className="mt-3 flex justify-center gap-4">
              <button type="button" onClick={() => { setActiveCategory(null); setSearchQuery(""); }} className="text-xs font-bold text-coral hover:underline">Clear all filters</button>
              {searchQuery.trim() ? <button type="button" onClick={() => handleStartPlan(`Travel guide: ${searchQuery.trim()}`)} className="text-xs font-bold text-coral hover:underline">Ask the AI planner</button> : null}
            </div>
          </div>
        ) : (
          <>
            {lead ? (
              <section className="grid gap-8 border-b border-line-subtle pb-10 lg:grid-cols-12">
                <Link href={lead.href} className="group lg:col-span-7">
                  <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-sand">{cover(lead, "(min-width: 1024px) 55vw, 95vw", 32)}</div>
                  <p className="mt-4 text-[0.6875rem] font-bold uppercase tracking-wider text-coral">{cat(lead)}</p>
                  <h2 className="mt-1.5 font-serif text-2xl font-bold leading-tight text-ink transition-colors group-hover:text-coral sm:text-3xl">{lead.title}</h2>
                  <p className="mt-2 line-clamp-2 text-[0.9375rem] leading-relaxed text-[#5F5F5F]">{lead.snippet}</p>
                  <p className="mt-3 text-xs text-muted">VacayOut editors · {fmt(lead.publishedAt)}</p>
                </Link>
                <div className="flex flex-col divide-y divide-line-subtle lg:col-span-5">
                  {side.map((g) => (
                    <Link key={g.href} href={g.href} className="group flex gap-4 py-4 first:pt-0">
                      <div className="relative aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-xl bg-sand sm:w-36">{cover(g, "144px", 20)}</div>
                      <div className="min-w-0">
                        <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-coral">{cat(g)}</p>
                        <h3 className="mt-1 line-clamp-2 font-serif text-[1.0625rem] font-bold leading-snug text-ink transition-colors group-hover:text-coral">{g.title}</h3>
                        <p className="mt-1.5 text-xs text-muted">{fmt(g.publishedAt)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            {rest.length ? (
              <section className={lead ? "pt-10" : ""}>
                {lead ? <h2 className="mb-6 font-serif text-2xl font-bold text-ink">{tab === "articles" ? "More guides" : "All destination guides"}</h2> : null}
                <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                  {rest.map((g) => (
                    <Link key={g.href} href={g.href} className="group block">
                      <div className="relative aspect-[3/2] overflow-hidden rounded-2xl bg-sand">{cover(g, "(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 95vw")}</div>
                      <p className="mt-4 text-[0.6875rem] font-bold uppercase tracking-wider text-coral">{cat(g)}</p>
                      <h3 className="mt-1 line-clamp-2 font-serif text-lg font-bold leading-snug text-ink transition-colors group-hover:text-coral">{g.title}</h3>
                      <p className="mt-1.5 line-clamp-2 text-[0.8125rem] leading-relaxed text-[#5F5F5F]">{g.snippet}</p>
                      <p className="mt-2.5 text-xs text-muted">{g.stateName ? `${g.stateName} · ` : ""}{fmt(g.publishedAt)}</p>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}

        {/* How our guides are made + AI help */}
        <section className="mt-16 grid gap-6 rounded-3xl bg-[#F4F1EA] p-6 sm:p-8 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-8">
            <h2 className="font-serif text-xl font-bold text-ink">How our guides are made</h2>
            <ul className="mt-3 grid gap-2 text-[0.8125rem] text-[#5F5F5F] sm:grid-cols-3">
              <li className="flex gap-2"><Icon name="checkCircle" size={16} className="mt-0.5 shrink-0 text-emerald-700" />Facts checked against official tourism sites, UNESCO and government data.</li>
              <li className="flex gap-2"><Icon name="checkCircle" size={16} className="mt-0.5 shrink-0 text-emerald-700" />Prices and travel times marked as estimates; hours only from official sources.</li>
              <li className="flex gap-2"><Icon name="checkCircle" size={16} className="mt-0.5 shrink-0 text-emerald-700" />An editor approves every section, and each guide lists its sources.</li>
            </ul>
            <Link href="/sources" className="mt-3 inline-block text-xs font-bold text-coral hover:underline">Our sources policy →</Link>
          </div>
          <div className="lg:col-span-4 lg:text-right">
            <button type="button" onClick={() => handleStartPlan("Help me plan an in-depth travel guide for my destination")} className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-coral">
              Plan your trip with AI →
            </button>
          </div>
        </section>
      </main>

      <AiPlannerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} initialPrompt={activePrompt} />
    </div>
  );
}

/** The page with `?tab=` applied (read in the browser, so the server page stays cacheable). */
export function TravelGuidesPageFromUrl({ data, hero }: { data: TravelGuidesData; hero: PageHero }) {
  const tab = useSearchParams().get("tab");
  return <TravelGuidesPage key={tab ?? ""} data={data} hero={hero} initialTab={tab === "articles" || tab === "destinations" ? tab : undefined} />;
}
