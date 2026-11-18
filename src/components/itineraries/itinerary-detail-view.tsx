"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "@/components/media/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon, type Name } from "@/components/icons/icon";
import { AiBanner } from "@/components/ai-planner/ai-banner";
import type { ItinerarySnapshot, SnapshotImage } from "@/lib/db/schema";
import { routes } from "@/lib/routes";
import "@/components/explore/explore.css";
import "@/components/place/experience-page.css";
import "./itinerary-detail.css";

/**
 * The published itinerary page. Everything shown comes from the itinerary's
 * published plan (and the photos of the places it visits); a block with no
 * data is left out rather than filled with generic text.
 */

export type RelatedItinerary = {
  slug: string;
  title: string;
  durationDays: number;
  summary: string;
  heroUrl?: string | null;
  stateSlug?: string | null;
};

export type StopPhoto = { ref?: string; name: string; image: SnapshotImage };

interface Props {
  itinerary: ItinerarySnapshot & { publishedAt?: Date | null };
  stopLinks?: Record<string, string>;
  photos?: StopPhoto[];
  photosByRef?: Record<string, StopPhoto>;
  relatedItineraries?: RelatedItinerary[];
}

type DayPhoto = { url: string; alt: string; caption?: string | null; attribution?: string | null; license?: string | null; kind?: string | null; href?: string | null };

const ext = { target: "_blank", rel: "nofollow noopener noreferrer" } as const;
const fmt = (n: number) => n.toLocaleString("en-IN");
const cleanTitle = (t: string) => t.replace(/^day\s*\d+\s*[:.–-]\s*/i, "");
const pad = (n: number) => String(n).padStart(2, "0");
const d = (ms: number) => ({ ["--d" as string]: `${ms}ms` }) as React.CSSProperties;

function Credit({ img }: { img: Pick<SnapshotImage, "kind" | "attribution" | "license"> }) {
  return (
    <span className="absolute bottom-2 right-2 max-w-[80%] truncate rounded bg-black/55 px-1.5 py-0.5 text-[0.625rem] text-white backdrop-blur-sm">
      {img.kind === "ai_generated" ? "AI illustration" : `${img.attribution ?? "Photo"}${img.license ? ` · ${img.license}` : ""}`}
    </span>
  );
}

/** Heading with the last word (or the part after a colon) in coral italic. */
function Accent({ text }: { text: string }) {
  const colon = text.indexOf(":");
  if (colon > 0 && colon < text.length - 2) {
    return <>{text.slice(0, colon + 1)} <em className="italic text-coral">{text.slice(colon + 1).trim()}</em></>;
  }
  const sp = text.lastIndexOf(" ");
  if (sp < 0) return <>{text}</>;
  return <>{text.slice(0, sp)} <em className="italic text-coral">{text.slice(sp + 1)}</em></>;
}

function SectionHead({ eyebrow, title, intro }: { eyebrow: string; title: string; intro?: string }) {
  return (
    <div>
      <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#9A9184]">
        <span className="h-px w-6 bg-coral" /> {eyebrow}
      </p>
      <h2 className="mt-2 font-serif text-[clamp(1.6rem,2.6vw,2.15rem)] font-normal leading-[1.1] tracking-[-0.02em] text-ink"><Accent text={title} /></h2>
      {intro ? <p className="mt-2.5 max-w-2xl text-[0.9375rem] leading-relaxed text-[#5C5C5C]">{intro}</p> : null}
    </div>
  );
}

function Chip({ icon, children, tone = "plain" }: { icon?: Name; children: React.ReactNode; tone?: "plain" | "warn" | "good" | "alert" }) {
  const tones = {
    plain: "border-[#ECE9E2] bg-white text-[#444]",
    warn: "border-amber-200 bg-amber-50 text-amber-900",
    good: "border-emerald-200 bg-emerald-50 text-emerald-800",
    alert: "border-red-200 bg-red-50 text-red-800",
  } as const;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>
      {icon ? <Icon name={icon} size={13} className={tone === "plain" ? "text-coral" : ""} /> : null}
      {children}
    </span>
  );
}

export function ItineraryDetailView({ itinerary, stopLinks = {}, photos = [], photosByRef = {}, relatedItineraries = [] }: Props) {
  const router = useRouter();
  const plan = itinerary.plan;
  const days = plan.days;
  const [activeElevationDay, setActiveElevationDay] = useState<number | null>(null);
  const [active, setActive] = useState("overview");
  const navRef = useRef<HTMLDivElement>(null);

  const handleDownloadPdf = () => {
    const prevTitle = document.title;
    document.title = `${itinerary.title} - VacayOut`;
    window.print();
    document.title = prevTitle;
  };

  // ---- Derived facts (only from the plan) ----
  const nights = Math.max(itinerary.durationDays - 1, 0);
  const altitudes = days.map((x) => x.altitude).filter((a): a is number => typeof a === "number");
  const peaks = days.flatMap((x, i) => [
    ...(x.highPoint ? [{ day: i + 1, name: x.highPoint.name, alt: x.highPoint.altitude }] : []),
    ...(typeof x.altitude === "number" ? [{ day: i + 1, name: x.overnight ?? cleanTitle(x.title), alt: x.altitude }] : []),
  ]);
  const peak = peaks.length ? peaks.reduce((a, b) => (b.alt > a.alt ? b : a)) : null;
  const allDistances = days.every((x) => typeof x.distanceKm === "number");
  const routeKm = allDistances ? days.reduce((s, x) => s + (x.distanceKm ?? 0), 0) : null;
  const stopCount = days.reduce((s, x) => s + x.stops.length, 0);

  const quickStats: { icon: Name; label: string; value: string }[] = [
    { icon: "calendar", label: "Duration", value: `${itinerary.durationDays} ${itinerary.durationDays === 1 ? "day" : "days"}${nights ? ` · ${nights} ${nights === 1 ? "night" : "nights"}` : ""}` },
    ...(plan.start ? [{ icon: "pin" as const, label: "Start", value: plan.start }] : []),
    ...(plan.end ? [{ icon: "route" as const, label: "Finish", value: plan.end }] : []),
    ...(plan.season ? [{ icon: "sun" as const, label: "Best season", value: plan.season }] : []),
    ...(peak ? [{ icon: "mountain" as const, label: "Highest point", value: `${fmt(peak.alt)} m · ${peak.name}` }] : []),
    ...(routeKm ? [{ icon: "car" as const, label: "Route length", value: `About ${fmt(Math.round(routeKm / 10) * 10)} km` }] : []),
    ...(plan.difficulty ? [{ icon: "compass" as const, label: "Difficulty", value: plan.difficulty }] : []),
  ];

  // Night-by-night profile: the night's altitude, plus the day's high point when it is higher.
  const elevationData = days.flatMap((x, i) => {
    const pts: { day: number; stop: string; alt: number; isPeak?: boolean }[] = [];
    if (x.highPoint && (x.altitude == null || x.highPoint.altitude > x.altitude)) pts.push({ day: i + 1, stop: x.highPoint.name, alt: x.highPoint.altitude, isPeak: true });
    if (typeof x.altitude === "number") pts.push({ day: i + 1, stop: x.overnight ?? cleanTitle(x.title), alt: x.altitude });
    return pts;
  });
  const showElevation = altitudes.length >= 2 && elevationData.length >= 2;

  const hasRouteTable = days.some((x) => x.distance || x.driveTime);
  const sources = itinerary.sources.filter((s) => /^https?:\/\//.test(s.url));
  const hasPrep = !!(plan.prep?.length || plan.booking.length);
  const hasTips = !!(plan.alternatives.length || plan.tips?.length);

  const nav = [
    { id: "overview", label: "Overview" },
    ...days.map((x, i) => ({ id: `day-${i + 1}`, label: `Day ${i + 1}` })),
    ...(hasPrep ? [{ id: "before-you-go", label: "Before you go" }] : []),
    { id: "budget", label: "Budget" },
    ...(hasTips ? [{ id: "tips", label: "Tips" }] : []),
    ...(plan.faqs?.length ? [{ id: "faqs", label: "FAQs" }] : []),
  ];
  const navKey = nav.map((n) => n.id).join("|");

  // Highlight the section being read, and keep its pill in view in the nav.
  useEffect(() => {
    const els = navKey.split("|").map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    if (!els.length || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [navKey]);

  useEffect(() => {
    const box = navRef.current;
    const pill = box?.querySelector<HTMLElement>(`[data-id="${active}"]`);
    if (!box || !pill) return;
    const left = pill.offsetLeft - box.clientWidth / 2 + pill.clientWidth / 2;
    box.scrollTo({ left, behavior: "smooth" });
  }, [active]);

  const dayPhotosFor = (day: (typeof days)[number]): DayPhoto[] => {
    const out: DayPhoto[] = [];
    const seen = new Set<string>();
    const add = (p: DayPhoto) => {
      if (!p.url || seen.has(p.url)) return;
      seen.add(p.url);
      out.push(p);
    };
    for (const p of day.photos ?? []) if (p?.url) add({ url: p.url, alt: p.alt, caption: p.caption, attribution: p.attribution, license: p.license });
    if (day.photo?.url) add({ url: day.photo.url, alt: day.photo.alt, caption: day.photo.caption, attribution: day.photo.attribution, license: day.photo.license });
    for (const stop of day.stops) {
      const href = stop.placeSlug ? stopLinks[stop.placeSlug] ?? null : null;
      if (stop.photo?.url) add({ url: stop.photo.url, alt: stop.photo.alt, caption: stop.photo.caption ?? stop.name, attribution: stop.photo.attribution, license: stop.photo.license, href });
      const slugPart = stop.placeSlug ? stop.placeSlug.split("/").pop()! : null;
      const found = (slugPart ? photosByRef[slugPart] : null) ?? (stop.placeSlug ? photosByRef[stop.placeSlug] : null) ?? photosByRef[stop.name.toLowerCase()];
      if (found?.image) add({ url: found.image.url, alt: found.image.alt || found.name, caption: found.name, attribution: found.image.attribution, license: found.image.license, kind: found.image.kind, href });
    }
    return out;
  };

  const side = photos.slice(0, 2);

  return (
    <article className="min-h-screen bg-white pb-20 text-ink selection:bg-coral/20 selection:text-coral">
      {/* Print header */}
      <div className="mb-6 hidden border-b-2 border-black p-6 print:block">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-600">VacayOut India — itinerary</p>
        <p className="mt-1 font-serif text-2xl font-bold text-black">{itinerary.title}</p>
        <p className="mt-2 text-xs text-gray-700">{itinerary.summary}</p>
        <div className="mt-3 grid grid-cols-3 gap-3 border-t border-gray-300 pt-3 text-xs">
          {quickStats.map((s) => (
            <div key={s.label}><span className="font-bold">{s.label}:</span> {s.value}</div>
          ))}
        </div>
      </div>

      {/* 1. Header */}
      <section className="ex-hero relative isolate bg-white print:hidden">
        <div aria-hidden className="ex-hero__bg">
          <span className="ex-hero__blob ex-hero__blob--a" />
          <span className="ex-hero__blob ex-hero__blob--b" />
          <span className="ex-hero__grid" />
        </div>
        <div className="container-site relative max-w-6xl pb-10 pt-7 sm:pt-9">
          <div className="explore-in flex flex-wrap items-center justify-between gap-3 text-sm" style={d(0)}>
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-[#8A8A8A]">
              <Link href="/india" className="transition-colors hover:text-coral">India</Link>
              <Icon name="chevronDown" size={12} className="-rotate-90 text-[#C4C0B8]" />
              {itinerary.place.stateSlug ? (
                <>
                  <Link href={`/india/${itinerary.place.stateSlug}`} className="transition-colors hover:text-coral">{itinerary.place.stateName ?? itinerary.place.stateSlug}</Link>
                  <Icon name="chevronDown" size={12} className="-rotate-90 text-[#C4C0B8]" />
                </>
              ) : null}
              <Link href="/itineraries" className="transition-colors hover:text-coral">Itineraries</Link>
            </nav>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#EEE7E0] bg-white/80 px-3 py-1 text-xs font-semibold text-[#666] backdrop-blur-sm">
              <span className="relative flex size-1.5"><span className="absolute inset-0 animate-ping rounded-full bg-coral/60 motion-reduce:hidden" /><span className="relative size-1.5 rounded-full bg-coral" /></span>
              {plan.style ?? `${itinerary.durationDays}-day route`}
            </span>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h1 className="explore-in max-w-3xl font-serif text-[clamp(2.2rem,4.6vw,3.5rem)] font-normal leading-[1.04] tracking-[-0.03em] text-ink" style={d(80)}>
                <Accent text={itinerary.title} />
              </h1>
              <p className="explore-in mt-4 max-w-2xl text-[1.0625rem] leading-relaxed text-[#555]" style={d(160)}>{itinerary.summary}</p>
            </div>
            <div className="explore-in no-print flex flex-wrap items-center gap-2.5" style={d(240)}>
              <Link
                href={routes.chatWithPrompt(`Customize this ${itinerary.title} itinerary for my trip dates, budget and group`)}
                className="group inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-14px_rgba(25,25,25,.8)] transition hover:bg-black active:scale-[0.98]"
              >
                <Icon name="sparkles" size={15} className="text-[#FFB59F]" />
                Customize with AI
                <Icon name="arrowRight" size={14} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#E3DED6] bg-white/90 px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-ink active:scale-[0.98]"
              >
                <Icon name="fileText" size={15} /> Save as PDF
              </button>
            </div>
          </div>

          <dl className="explore-in mt-8 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]" style={d(320)}>
            {quickStats.map((st) => (
              <div key={st.label} className="rounded-2xl border border-[#EFECE6] bg-white/80 px-4 py-3 backdrop-blur-sm">
                <dt className="flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-[#9A9184]"><Icon name={st.icon} size={13} className="text-coral" /> {st.label}</dt>
                <dd className="mt-1 text-sm font-semibold leading-snug text-ink">{st.value}</dd>
              </div>
            ))}
          </dl>

          {itinerary.hero || side.length ? (
            <div className={`explore-in mt-6 grid gap-3 ${itinerary.hero && side.length ? "md:grid-cols-[2fr_1fr]" : ""}`} style={d(400)}>
              {itinerary.hero ? (
                <figure className="relative aspect-[16/10] overflow-hidden rounded-[1.75rem] bg-[#F1EEE8] md:aspect-auto md:h-[440px]">
                  <Image src={itinerary.hero.url} alt={itinerary.hero.alt} fill priority sizes="(max-width: 768px) 100vw, 66vw" className="xp-zoom object-cover" />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                  {itinerary.hero.caption ? <figcaption className="absolute bottom-4 left-5 max-w-[70%] font-serif text-lg text-white">{itinerary.hero.caption}</figcaption> : null}
                  <Credit img={itinerary.hero} />
                </figure>
              ) : null}
              {side.length ? (
                <div className={`grid gap-3 ${itinerary.hero ? "grid-cols-2 md:grid-cols-1" : "grid-cols-2"}`}>
                  {side.map((p) => (
                    <figure key={p.image.url} className="group relative aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-[#F1EEE8] md:aspect-auto md:h-auto md:min-h-[214px]">
                      <Image src={p.image.url} alt={p.image.alt} fill sizes="(max-width: 768px) 50vw, 33vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                      <figcaption className="absolute bottom-3 left-3 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-ink backdrop-blur-sm">{p.name}</figcaption>
                      <span className="absolute right-0 top-0"><Credit img={p.image} /></span>
                    </figure>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      {/* Sticky section nav with reading progress */}
      <div className="no-print sticky top-[4.5rem] z-20 border-y border-[#EFECE6] bg-white/85 backdrop-blur-md lg:top-20">
        <div className="container-site max-w-6xl">
          <div ref={navRef} className="flex items-center gap-2 overflow-x-auto py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {nav.map((n) => (
              <a
                key={n.id}
                href={`#${n.id}`}
                data-id={n.id}
                data-active={active === n.id}
                className="it-pill shrink-0 rounded-full border border-[#ECE9E2] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#555] hover:border-ink hover:text-ink"
              >
                {n.label}
              </a>
            ))}
          </div>
        </div>
        <span aria-hidden className="it-progress absolute inset-x-0 bottom-[-1px] h-[2px] bg-coral" />
      </div>

      {/* 2. Overview */}
      <section id="overview" className="scroll-mt-36 py-14 sm:py-16">
        <div className="container-site grid max-w-6xl gap-10 lg:grid-cols-[1fr_340px]">
          <div className="it-reveal">
            <SectionHead eyebrow="Who it suits and the pace" title="Trip overview" />
            <p className="mt-5 max-w-2xl font-serif text-[1.1875rem] leading-[1.7] text-[#2E2E2E]">{plan.overview}</p>
            {plan.transport ? (
              <div className="mt-6 flex max-w-2xl gap-3 rounded-2xl border border-[#EFECE6] bg-[#FBF8F3] p-4 text-sm leading-relaxed text-[#444]">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-coral shadow-xs"><Icon name="car" size={16} /></span>
                <p><strong className="block text-ink">Getting around</strong>{plan.transport}</p>
              </div>
            ) : null}
          </div>

          <aside className="it-reveal rounded-[1.5rem] border border-[#EFECE6] bg-white p-5 shadow-[0_18px_40px_-30px_rgba(25,25,25,.35)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9A9184]">The route at a glance</p>
            <p className="mt-1 text-sm text-[#666]">{days.length} {days.length === 1 ? "day" : "days"} · {stopCount} {stopCount === 1 ? "stop" : "stops"}</p>
            <ol className="relative mt-4 space-y-1">
              <span aria-hidden className="absolute bottom-4 left-[15px] top-4 w-px bg-[#ECE9E2]" />
              {days.map((x, i) => (
                <li key={i}>
                  <a href={`#day-${i + 1}`} className="group relative flex items-start gap-3 rounded-xl p-1.5 transition hover:bg-[#FBF8F3]">
                    <span className="relative z-10 grid size-[22px] shrink-0 translate-x-[4px] place-items-center rounded-full border border-coral/40 bg-white text-[0.625rem] font-bold text-coral transition group-hover:bg-coral group-hover:text-white">{i + 1}</span>
                    <span className="min-w-0 pt-0.5">
                      <span className="block text-sm font-semibold leading-snug text-ink group-hover:text-coral">{cleanTitle(x.title)}</span>
                      {x.overnight ? <span className="mt-0.5 block text-xs text-[#8A8A8A]">Night in {x.overnight}</span> : null}
                    </span>
                  </a>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </section>

      {/* 3. Altitude profile */}
      {showElevation ? (
        <section className="border-t border-[#EFECE6] py-14">
          <div className="container-site max-w-6xl it-reveal">
            <SectionHead eyebrow="Altitude profile" title="Where you sleep, night by night" intro="Overnight altitudes, plus the highest point crossed on the way. Above about 3,000 m, climb slowly and rest if you feel unwell." />
            <div className="mt-8 overflow-x-auto rounded-[1.5rem] border border-[#EFECE6] bg-[#FBF8F3] p-6">
              <div className="min-w-[720px]">
                <div className="relative h-60 w-full">
                  <svg className="h-full w-full overflow-visible" viewBox="0 0 800 228" preserveAspectRatio="none" role="img" aria-label="Altitude by day">
                    <defs>
                      <linearGradient id="elevationGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#BA4A38" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#BA4A38" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {(() => {
                      const all = elevationData.map((d) => d.alt);
                      const minAlt = Math.floor((Math.min(...all) - 300) / 500) * 500;
                      const maxAlt = Math.ceil((Math.max(...all) + 300) / 500) * 500;
                      const y = (alt: number) => 180 - ((alt - minAlt) / (maxAlt - minAlt)) * 160;
                      const pts = elevationData.map((d, idx) => ({ ...d, x: 50 + idx * (700 / Math.max(elevationData.length - 1, 1)), y: y(d.alt) }));
                      const pathD = `M ${pts[0].x} ${pts[0].y} ` + pts.slice(1).map((p) => `L ${p.x} ${p.y}`).join(" ");
                      const areaD = `${pathD} L ${pts[pts.length - 1].x} 195 L ${pts[0].x} 195 Z`;
                      const guide = 3000 > minAlt && 3000 < maxAlt ? y(3000) : null;
                      return (
                        <>
                          {guide != null ? (
                            <>
                              <line x1="0" y1={guide} x2="800" y2={guide} stroke="#D97706" strokeDasharray="4 4" strokeWidth="1.2" />
                              <text x="5" y={guide - 4} fill="#D97706" fontSize="10" fontWeight="600">3,000 m</text>
                            </>
                          ) : null}
                          <path d={areaD} fill="url(#elevationGrad)" />
                          <path d={pathD} fill="none" stroke="#BA4A38" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                          {pts.map((p, idx) => (
                            <g key={idx} className="group cursor-pointer" onMouseEnter={() => setActiveElevationDay(idx)} onMouseLeave={() => setActiveElevationDay(null)}>
                              <circle cx={p.x} cy={p.y} r={p.isPeak ? 7 : 5} fill={p.isPeak ? "#DC2626" : "#BA4A38"} stroke="#FFFFFF" strokeWidth={p.isPeak ? 3 : 2} />
                              {p.isPeak || idx === 0 || pts[idx - 1].alt !== p.alt ? (
                                <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize="11" fontWeight={p.isPeak ? 700 : 600} fill={p.isPeak ? "#DC2626" : "#1F2937"}>{fmt(p.alt)} m</text>
                              ) : null}
                              <text x={p.x} y={idx % 2 ? 221 : 207} textAnchor="middle" fontSize="10" fontWeight="600" fill="#4B5563">D{p.day}: {p.stop.length > 14 ? `${p.stop.slice(0, 13)}…` : p.stop}</text>
                            </g>
                          ))}
                        </>
                      );
                    })()}
                  </svg>
                </div>
                {peak ? (
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-900">
                    <span>
                      <span className="font-bold uppercase tracking-wider text-red-700">Highest point: </span>
                      <span className="font-semibold">
                        {activeElevationDay !== null && elevationData[activeElevationDay]
                          ? `Day ${elevationData[activeElevationDay].day} — ${elevationData[activeElevationDay].stop} (${fmt(elevationData[activeElevationDay].alt)} m)`
                          : `Day ${peak.day} — ${peak.name} (${fmt(peak.alt)} m)`}
                      </span>
                    </span>
                    <span className="text-red-700">Descend if a headache or breathlessness persists at rest.</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* 4. Day by day */}
      <section aria-label="Day-by-day plan" className="border-t border-[#EFECE6] bg-white">
        <div className="container-site max-w-6xl pt-14 sm:pt-16">
          <SectionHead eyebrow="Day-by-day itinerary" title={`The ${itinerary.durationDays}-day plan`} intro="Times are a guide. Keep the hottest hours light and check opening times on the day." />
        </div>

        {days.map((day, idx) => {
          const prevAlt = idx > 0 ? days[idx - 1].altitude : undefined;
          const change = typeof day.altitude === "number" && typeof prevAlt === "number" ? day.altitude - prevAlt : null;
          const cards = [
            day.overnight ? { icon: "bed" as const, label: "Overnight", text: `${day.overnight}${typeof day.altitude === "number" ? ` (${fmt(day.altitude)} m)` : ""}` } : null,
            day.transport ? { icon: "car" as const, label: "Transport", text: day.transport } : null,
            day.travel ? { icon: "route" as const, label: "Getting around", text: day.travel } : null,
            day.meals ? { icon: "utensils" as const, label: "Meals", text: day.meals } : null,
          ].filter((c): c is { icon: "bed" | "car" | "route" | "utensils"; label: string; text: string } => !!c);
          const dayPhotos = dayPhotosFor(day);

          return (
            <section key={idx} id={`day-${idx + 1}`} className="scroll-mt-32 border-b border-[#EFECE6] py-12 last:border-b-0 sm:py-14">
              <div className="container-site grid max-w-6xl gap-8 lg:grid-cols-[300px_1fr] lg:gap-14">
                {/* Day intro */}
                <header className="it-reveal lg:sticky lg:top-40 lg:self-start">
                  <div className="flex items-baseline gap-3">
                    <span className="it-num font-serif text-[4.5rem] font-normal leading-none tracking-[-0.04em]">{pad(idx + 1)}</span>
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9A9184]">Day {idx + 1} of {days.length}</span>
                  </div>
                  <h3 className="mt-3 font-serif text-[1.6rem] font-normal leading-tight tracking-[-0.02em] text-ink">{cleanTitle(day.title)}</h3>
                  {day.summary ? <p className="mt-3 text-[0.9375rem] leading-relaxed text-[#555]">{day.summary}</p> : null}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {day.distance ? <Chip icon="route">{day.distance}</Chip> : null}
                    {day.driveTime ? <Chip icon="clock">{day.driveTime}</Chip> : null}
                    {day.highPoint ? <Chip icon="mountain" tone="alert">High point: {day.highPoint.name} {fmt(day.highPoint.altitude)} m</Chip> : null}
                    {change != null && change !== 0 ? <Chip>{change > 0 ? "Sleep +" : "Sleep −"}{fmt(Math.abs(change))} m</Chip> : null}
                    {day.access ? <Chip tone="good">{day.access}</Chip> : null}
                    {day.permits ? <Chip icon="shield" tone="warn">{day.permits}</Chip> : null}
                  </div>
                </header>

                <div className="min-w-0 space-y-8">
                  {/* Timeline */}
                  <ol className="relative">
                    <span aria-hidden className="it-line absolute bottom-3 left-[7px] top-3 w-px bg-gradient-to-b from-coral via-coral/40 to-[#ECE9E2]" />
                    {day.stops.map((stop, sIdx) => {
                      const href = stop.placeSlug ? (stopLinks[stop.placeSlug] ?? null) : null;
                      return (
                        <li key={sIdx} className="it-stop relative pb-6 pl-9 last:pb-0">
                          <span className="it-dot absolute left-0 top-[1.15rem] size-[15px] rounded-full border-[3px] border-white bg-coral shadow-[0_0_0_1px_rgba(236,98,66,.35)]" />
                          <div className="rounded-2xl border border-[#EFECE6] bg-white p-4 transition-shadow duration-300 hover:shadow-[0_14px_30px_-22px_rgba(25,25,25,.4)] sm:p-5">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span className="font-mono text-[0.6875rem] font-semibold uppercase tracking-wider text-coral">{stop.time || `Stop ${sIdx + 1}`}</span>
                              {stop.duration ? <span className="inline-flex items-center gap-1 rounded-full bg-[#F5F3EE] px-2 py-0.5 text-[0.6875rem] font-medium text-[#666]"><Icon name="clock" size={11} /> {stop.duration}</span> : null}
                            </div>
                            <h4 className="mt-1.5 text-[1.0625rem] font-semibold leading-snug text-ink">
                              {href ? (
                                <Link href={href} className="group inline-flex items-center gap-1.5 hover:text-coral">
                                  {stop.name}
                                  <Icon name="arrowRight" size={14} className="text-coral opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100" />
                                </Link>
                              ) : stop.name}
                            </h4>
                            {stop.note ? <p className="mt-1 text-sm leading-relaxed text-[#5C5C5C]">{stop.note}</p> : null}
                          </div>
                        </li>
                      );
                    })}
                  </ol>

                  {/* Photos */}
                  {dayPhotos.length ? (
                    <div className="it-reveal">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#9A9184]">What you&apos;ll see</p>
                      <div className={`grid gap-3 ${dayPhotos.length === 1 ? "sm:max-w-md" : dayPhotos.length === 2 ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-3"}`}>
                        {dayPhotos.map((p) => {
                          const card = (
                            <figure className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-[#F1EEE8]">
                              <Image src={p.url} alt={p.alt} fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                              <figcaption className="absolute bottom-2.5 left-3 right-3 truncate text-xs font-semibold text-white">{p.caption || p.alt}</figcaption>
                              {p.attribution || p.kind === "ai_generated" ? (
                                <span className="absolute right-0 top-0"><Credit img={{ kind: p.kind === "ai_generated" ? "ai_generated" : "photo", attribution: p.attribution ?? null, license: p.license ?? "" }} /></span>
                              ) : null}
                            </figure>
                          );
                          return p.href ? <Link key={p.url} href={p.href} className="block">{card}</Link> : <div key={p.url}>{card}</div>;
                        })}
                      </div>
                    </div>
                  ) : null}

                  {/* Day logistics */}
                  {cards.length || day.logistics ? (
                    <div className="it-reveal grid gap-2.5 sm:grid-cols-2">
                      {cards.map((c) => (
                        <div key={c.label} className="flex gap-3 rounded-2xl border border-[#EFECE6] bg-white p-3.5">
                          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#FBF1EC] text-coral"><Icon name={c.icon} size={15} /></span>
                          <p className="text-sm leading-snug text-[#444]"><span className="block text-[0.6875rem] font-semibold uppercase tracking-wider text-[#9A9184]">{c.label}</span>{c.text}</p>
                        </div>
                      ))}
                      {day.logistics ? (
                        <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 sm:col-span-2">
                          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-amber-700"><Icon name="shield" size={15} /></span>
                          <p className="text-sm leading-snug text-amber-950"><span className="block text-[0.6875rem] font-semibold uppercase tracking-wider text-amber-800">Good to know</span>{day.logistics}</p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </section>
          );
        })}
      </section>

      {/* 5. Route table */}
      {hasRouteTable ? (
        <section className="border-t border-[#EFECE6] py-14">
          <div className="container-site max-w-6xl it-reveal">
            <SectionHead eyebrow="Route at a glance" title="Distances and travel times" intro={routeKm ? `About ${fmt(Math.round(routeKm / 10) * 10)} km in all, from ${plan.start ?? "the start"} to ${plan.end ?? "the finish"}.` : undefined} />
            <div className="mt-8 overflow-x-auto rounded-[1.25rem] border border-[#EFECE6] bg-white">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="bg-[#FBF8F3] text-[0.6875rem] font-semibold uppercase tracking-wider text-[#9A9184]">
                  <tr>
                    <th className="px-4 py-3">Day</th>
                    <th className="px-4 py-3">Leg</th>
                    <th className="px-4 py-3">Distance</th>
                    <th className="px-4 py-3">Travel time</th>
                    <th className="px-4 py-3">Overnight</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFECE6]">
                  {days.map((x, i) => (
                    <tr key={i} className="transition-colors hover:bg-[#FCFBF8]">
                      <td className="whitespace-nowrap px-4 py-3 font-serif text-base text-coral">{pad(i + 1)}</td>
                      <td className="px-4 py-3 font-semibold text-ink"><a href={`#day-${i + 1}`} className="hover:text-coral">{cleanTitle(x.title)}</a></td>
                      <td className="px-4 py-3 text-[#666]">{x.distance ?? "—"}</td>
                      <td className="px-4 py-3 text-[#666]">{x.driveTime ?? "—"}</td>
                      <td className="px-4 py-3 text-[#666]">{x.overnight ?? "—"}{typeof x.altitude === "number" ? ` · ${fmt(x.altitude)} m` : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      {/* 6. Preparation and booking */}
      {hasPrep ? (
        <section id="before-you-go" className="scroll-mt-32 border-t border-[#EFECE6] py-14">
          <div className="container-site max-w-6xl">
            <div className="it-reveal"><SectionHead eyebrow="Before you go" title="Bookings and preparation" /></div>
            {plan.prep?.length ? (
              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {plan.prep.map((card, i) => (
                  <div key={card.title} className="it-reveal xp-card rounded-[1.25rem] border border-[#EFECE6] bg-white p-5">
                    <span className="font-serif text-sm text-coral">{pad(i + 1)}</span>
                    <h3 className="mt-2 font-serif text-lg text-ink">{card.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#5C5C5C]">{card.body}</p>
                  </div>
                ))}
              </div>
            ) : null}
            {plan.booking.length ? (
              <div className="it-reveal mt-6 rounded-[1.25rem] border border-[#EFECE6] bg-[#FBF8F3] p-5 sm:p-6">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#9A9184]"><Icon name="ticket" size={14} className="text-coral" /> Book ahead</p>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {plan.booking.map((b) => (
                    <li key={b.item} className="flex gap-3 rounded-xl bg-white p-3.5 text-sm leading-relaxed text-[#444]">
                      <Icon name="checkCircle" size={17} className="mt-0.5 shrink-0 text-coral" />
                      <span><strong className="block text-ink">{b.item}</strong>{b.detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* 7. Budget */}
      <section id="budget" className="scroll-mt-32 border-t border-[#EFECE6] py-14">
        <div className="container-site max-w-6xl">
          <div className={`it-reveal grid gap-8 lg:items-start ${plan.budget.lines.length ? "lg:grid-cols-[1fr_1.2fr]" : ""}`}>
            <div>
              <SectionHead eyebrow="Costs" title="Budget" intro={plan.budget.assumptions} />
              <Link href={routes.chatWithPrompt(`Estimate a budget for ${itinerary.title} for my group and travel style`)} className="no-print group mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black">
                <Icon name="sparkles" size={14} className="text-[#FFB59F]" /> Work out my budget with AI
                <Icon name="arrowRight" size={13} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            {plan.budget.lines.length ? (
              <ul className="divide-y divide-[#EFECE6] rounded-[1.25rem] border border-[#EFECE6] bg-white px-5">
                {plan.budget.lines.map((l) => (
                  <li key={l.label} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{l.label}</p>
                      {l.basis ? <p className="mt-0.5 text-xs text-[#8A8A8A]">{l.basis}</p> : null}
                    </div>
                    <p className="font-serif text-lg text-ink">{l.amount}</p>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </section>

      {/* 8. Alternatives and tips */}
      {hasTips ? (
        <section id="tips" className="scroll-mt-32 border-t border-[#EFECE6] py-14">
          <div className="container-site max-w-6xl">
            <div className="it-reveal"><SectionHead eyebrow="Plan B and tips" title="If plans change" /></div>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {plan.alternatives.length ? (
                <div className="it-reveal rounded-[1.25rem] border border-[#EFECE6] bg-white p-5 sm:p-6">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#9A9184]"><Icon name="route" size={14} className="text-coral" /> Alternatives</p>
                  <ul className="mt-4 space-y-3 text-sm leading-relaxed text-[#444]">
                    {plan.alternatives.map((a) => <li key={a} className="flex gap-3"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-coral" />{a}</li>)}
                  </ul>
                </div>
              ) : null}
              {plan.tips?.length ? (
                <div className="it-reveal rounded-[1.25rem] border border-[#EFECE6] bg-[#FBF8F3] p-5 sm:p-6">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#9A9184]"><Icon name="bulb" size={14} className="text-coral" /> Practical tips</p>
                  <ul className="mt-4 space-y-3 text-sm leading-relaxed text-[#444]">
                    {plan.tips.map((t) => <li key={t} className="flex gap-3"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#2D5A3F]" />{t}</li>)}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {/* 9. FAQs */}
      {plan.faqs?.length ? (
        <section id="faqs" className="scroll-mt-32 border-t border-[#EFECE6] py-14">
          <div className="container-site grid max-w-6xl gap-8 lg:grid-cols-[300px_1fr] lg:gap-14">
            <div className="it-reveal"><SectionHead eyebrow="Travel questions" title="Frequently asked questions" /></div>
            <div className="it-reveal divide-y divide-[#EFECE6] border-y border-[#EFECE6]">
              {plan.faqs.map((f, i) => (
                <details key={f.q} className="it-faq group" open={i === 0}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left font-serif text-[1.0625rem] text-ink transition-colors hover:text-coral">
                    {f.q}
                    <span className="it-faq__chev grid size-7 shrink-0 place-items-center rounded-full border border-[#ECE9E2] text-[#666] transition-transform duration-300"><Icon name="chevronDown" size={14} /></span>
                  </summary>
                  <p className="it-faq__body pb-5 pr-10 text-sm leading-relaxed text-[#555]">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* 10. AI planner */}
      <section className="no-print border-t border-[#EFECE6] py-14">
        <div className="container-site max-w-6xl">
          <AiBanner
            title="Make this plan yours"
            accent="yours"
            text={`Tell the AI planner your dates, group and budget. It reworks ${itinerary.title} around them, using our reviewed guides.`}
            chipsLabel="Change something"
            chips={[
              { key: "dates", label: "My dates", icon: "calendar", prompt: `Fit the ${itinerary.title} itinerary to my travel dates` },
              { key: "budget", label: "My budget", icon: "coins", prompt: `Rework ${itinerary.title} for my budget` },
              { key: "slow", label: "Slower pace", icon: "clock", prompt: `Make ${itinerary.title} slower and more relaxed` },
              { key: "family", label: "With family", icon: "family", prompt: `Adapt ${itinerary.title} for a family with children` },
            ]}
            cta={{ label: "Customize with AI", prompt: `Customize this ${itinerary.title} itinerary for my trip dates, budget and group` }}
            question={`Can you fit ${itinerary.title} to my dates?`}
            answer={relatedItineraries.length ? "Yes. Tell me when you travel and who is coming. These routes nearby could fit too:" : "Yes. Tell me when you travel and who is coming, and I'll adjust each day."}
            picks={relatedItineraries.slice(0, 3).map((r) => ({ href: `/itineraries/${r.slug}`, name: r.title, meta: `${r.durationDays} ${r.durationDays === 1 ? "day" : "days"}`, image: r.heroUrl ? { url: r.heroUrl, alt: "", kind: "photo" as const, attribution: null, license: "" } : null }))}
            onAsk={(p) => router.push(routes.chatWithPrompt(p))}
          />
        </div>
      </section>

      {/* 11. Related */}
      {relatedItineraries.length > 0 ? (
        <section className="border-t border-[#EFECE6] py-14">
          <div className="container-site max-w-6xl">
            <div className="it-reveal flex flex-wrap items-end justify-between gap-4">
              <SectionHead eyebrow="More routes" title="Related itineraries" />
              <Link href="/itineraries" className="group inline-flex items-center gap-1.5 text-sm font-semibold text-ink hover:text-coral">All itineraries <Icon name="arrowRight" size={14} className="transition-transform group-hover:translate-x-0.5" /></Link>
            </div>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {relatedItineraries.slice(0, 4).map((rel) => (
                <Link key={rel.slug} href={`/itineraries/${rel.slug}`} className="it-reveal group flex flex-col">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-[1.25rem] bg-[#F1EEE8]">
                    {rel.heroUrl ? <Image src={rel.heroUrl} alt={rel.title} fill sizes="(max-width: 640px) 100vw, 25vw" className="object-cover transition-transform duration-700 group-hover:scale-105" /> : null}
                    <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-[0.6875rem] font-semibold text-ink backdrop-blur-sm">{rel.durationDays} {rel.durationDays === 1 ? "day" : "days"}</span>
                  </div>
                  <h3 className="mt-3 line-clamp-2 font-serif text-[1.0625rem] leading-snug text-ink transition-colors group-hover:text-coral">{rel.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-[#777]">{rel.summary}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Sources */}
      {sources.length ? (
        <section className="pb-4 pt-6">
          <div className="container-site max-w-6xl">
            <details className="group rounded-[1.25rem] border border-[#EFECE6] bg-white px-5 py-4 text-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-ink">
                <span className="inline-flex items-center gap-2"><Icon name="book" size={15} className="text-coral" /> Sources for this itinerary ({sources.length})</span>
                <Icon name="chevronDown" size={14} className="text-[#888] transition-transform group-open:rotate-180" />
              </summary>
              <ul className="mt-3 grid gap-1.5 text-xs text-[#666] sm:grid-cols-2">
                {sources.map((s) => (
                  <li key={s.url} className="truncate"><a href={s.url} {...ext} className="hover:text-coral hover:underline">{s.title || s.site}</a> <span className="text-[#999]">· {s.site}</span></li>
                ))}
              </ul>
            </details>
          </div>
        </section>
      ) : null}
    </article>
  );
}
