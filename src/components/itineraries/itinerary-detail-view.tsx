"use client";

import React, { useState } from "react";
import Image from "@/components/media/image";
import Link from "next/link";
import { Icon } from "@/components/icons/icon";
import type { ItinerarySnapshot, SnapshotImage } from "@/lib/db/schema";
import { routes } from "@/lib/routes";

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

const ext = { target: "_blank", rel: "nofollow noopener noreferrer" } as const;
const fmt = (n: number) => n.toLocaleString("en-IN");
const cleanTitle = (t: string) => t.replace(/^day\s*\d+\s*[:.–-]\s*/i, "");

function Credit({ img }: { img: SnapshotImage }) {
  return (
    <span className="absolute bottom-2 right-2 max-w-[80%] truncate rounded bg-black/60 px-1.5 py-0.5 text-[0.625rem] text-white">
      {img.kind === "ai_generated" ? "AI illustration" : `${img.attribution ?? "Photo"} · ${img.license}`}
    </span>
  );
}

function SectionHead({ eyebrow, title, intro }: { eyebrow: string; title: string; intro?: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-[#BA4A38]">{eyebrow}</p>
      <h2 className="mt-1 font-serif text-2xl font-medium text-ink sm:text-3xl">{title}</h2>
      {intro ? <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#555]">{intro}</p> : null}
    </div>
  );
}

export function ItineraryDetailView({ itinerary, stopLinks = {}, photos = [], photosByRef = {}, relatedItineraries = [] }: Props) {
  const plan = itinerary.plan;
  const days = plan.days;
  const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>(() => Object.fromEntries(days.map((_, i) => [i, true])));
  const [activeElevationDay, setActiveElevationDay] = useState<number | null>(null);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);

  const toggleDay = (idx: number) => setExpandedDays((prev) => ({ ...prev, [idx]: !prev[idx] }));
  const expandAll = () => setExpandedDays(Object.fromEntries(days.map((_, i) => [i, true])));
  const collapseAll = () => setExpandedDays({});

  const handleDownloadPdf = () => {
    setIsPdfGenerating(true);
    expandAll();
    const prevTitle = document.title;
    document.title = `${itinerary.title} - VacayOut`;
    setTimeout(() => {
      window.print();
      document.title = prevTitle;
      setIsPdfGenerating(false);
    }, 200);
  };

  // ---- Derived facts (only from the plan) ----
  const nights = Math.max(itinerary.durationDays - 1, 0);
  const altitudes = days.map((d) => d.altitude).filter((a): a is number => typeof a === "number");
  const peaks = days.flatMap((d, i) => [
    ...(d.highPoint ? [{ day: i + 1, name: d.highPoint.name, alt: d.highPoint.altitude }] : []),
    ...(typeof d.altitude === "number" ? [{ day: i + 1, name: d.overnight ?? cleanTitle(d.title), alt: d.altitude }] : []),
  ]);
  const peak = peaks.length ? peaks.reduce((a, b) => (b.alt > a.alt ? b : a)) : null;
  const allDistances = days.every((d) => typeof d.distanceKm === "number");
  const routeKm = allDistances ? days.reduce((s, d) => s + (d.distanceKm ?? 0), 0) : null;

  const quickStats = [
    { label: "Duration", value: `${itinerary.durationDays} days / ${nights} nights` },
    ...(peak ? [{ label: "Highest point", value: `${fmt(peak.alt)} m (${peak.name})` }] : []),
    ...(plan.season ? [{ label: "Best season", value: plan.season }] : []),
    ...(routeKm ? [{ label: "Route length", value: `About ${fmt(Math.round(routeKm / 10) * 10)} km` }] : []),
    ...(plan.start || plan.end ? [{ label: "Start / finish", value: `${plan.start ?? "—"} / ${plan.end ?? "—"}` }] : []),
    ...(plan.difficulty ? [{ label: "Difficulty", value: plan.difficulty }] : []),
  ];

  // Night-by-night profile: the night's altitude, plus the day's high point when it is higher.
  const elevationData = days.flatMap((d, i) => {
    const pts: { day: number; stop: string; alt: number; isPeak?: boolean }[] = [];
    if (d.highPoint && (d.altitude == null || d.highPoint.altitude > d.altitude)) pts.push({ day: i + 1, stop: d.highPoint.name, alt: d.highPoint.altitude, isPeak: true });
    if (typeof d.altitude === "number") pts.push({ day: i + 1, stop: d.overnight ?? cleanTitle(d.title), alt: d.altitude });
    return pts;
  });
  const showElevation = altitudes.length >= 2 && elevationData.length >= 2;

  const hasRouteTable = days.some((d) => d.distance || d.driveTime);
  const sources = itinerary.sources.filter((s) => /^https?:\/\//.test(s.url));

  return (
    <article className="min-h-screen bg-white pb-20 text-ink selection:bg-coral/20 selection:text-coral">
      {/* Print header */}
      <div className="mb-6 hidden border-b-2 border-black p-6 print:block">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-600">VacayOut India — itinerary</p>
        <p className="mt-1 font-serif text-2xl font-bold text-black">{itinerary.title}</p>
        <p className="mt-2 text-xs text-gray-700">{itinerary.summary}</p>
        <div className="mt-3 grid grid-cols-3 gap-3 border-t border-gray-300 pt-3 text-xs">
          {quickStats.slice(0, 6).map((s) => (
            <div key={s.label}>
              <span className="font-bold">{s.label}:</span> {s.value}
            </div>
          ))}
        </div>
      </div>

      {/* 1. Hero */}
      <section className="border-b border-[#E5E2DC] bg-white pb-10 pt-8">
        <div className="container-site max-w-6xl">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-muted">
              <Link href="/india" className="transition-colors hover:text-coral">India</Link>
              <span>›</span>
              {itinerary.place.stateSlug ? (
                <>
                  <Link href={`/india/${itinerary.place.stateSlug}`} className="transition-colors hover:text-coral">{itinerary.place.stateName ?? itinerary.place.stateSlug}</Link>
                  <span>›</span>
                </>
              ) : null}
              <Link href="/itineraries" className="transition-colors hover:text-coral">Itineraries</Link>
            </nav>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
              <span className="size-1.5 rounded-full bg-emerald-600" />
              {plan.style ?? `${itinerary.durationDays}-day route`}
            </span>
          </div>

          <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h1 className="font-serif text-[clamp(2.2rem,4vw,3.25rem)] font-medium leading-[1.12] tracking-tight text-ink">{itinerary.title}</h1>
              <p className="mt-3 max-w-3xl text-[1.0625rem] leading-relaxed text-[#444]">{itinerary.summary}</p>
            </div>
            <div className="no-print flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isPdfGenerating}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#BA4A38] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#A33F2F] active:scale-[0.98]"
              >
                <Icon name="fileText" size={15} />
                {isPdfGenerating ? "Preparing…" : "Save as PDF"}
              </button>
              <Link
                href={routes.chatWithPrompt(`Customize this ${itinerary.title} itinerary for my trip dates, budget and group`)}
                className="inline-flex items-center gap-2 rounded-lg bg-[#1C2524] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-black"
              >
                <Icon name="sparkles" size={15} />
                Customize with AI Planner
              </Link>
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-[#E5E2DC] bg-[#FAF9F6] p-4 shadow-xs sm:p-5">
            <dl className="grid grid-cols-2 gap-y-3 sm:grid-cols-3 lg:grid-cols-6 lg:divide-x lg:divide-[#E5E2DC]">
              {quickStats.map((st) => (
                <div key={st.label} className="px-2.5 sm:px-4 lg:first:pl-0">
                  <dt className="text-[0.6875rem] font-bold uppercase tracking-wider text-muted">{st.label}</dt>
                  <dd className="mt-1 text-sm font-bold text-ink">{st.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {itinerary.hero || photos.length ? (
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-12">
              {itinerary.hero ? (
                <div className={`relative aspect-[16/10] overflow-hidden rounded-2xl bg-slate-100 ${photos.length ? "md:col-span-8 md:aspect-auto md:h-[420px]" : "md:col-span-12 md:aspect-auto md:h-[420px]"}`}>
                  <Image src={itinerary.hero.url} alt={itinerary.hero.alt} fill priority sizes="(max-width: 768px) 100vw, 66vw" className="object-cover" />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  {itinerary.hero.caption ? <p className="absolute bottom-4 left-4 font-serif text-lg font-medium text-white">{itinerary.hero.caption}</p> : null}
                  <Credit img={itinerary.hero} />
                </div>
              ) : null}
              {photos.length ? (
                <div className="grid grid-cols-2 gap-4 md:col-span-4 md:grid-cols-1">
                  {photos.map((p) => (
                    <div key={p.image.url} className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100 md:aspect-auto md:h-[202px]">
                      <Image src={p.image.url} alt={p.image.alt} fill sizes="(max-width: 768px) 50vw, 33vw" className="object-cover" />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                      <p className="absolute left-3 top-3 rounded bg-black/50 px-2 py-0.5 text-xs font-medium text-white">{p.name}</p>
                      <Credit img={p.image} />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      {/* Overview */}
      <section className="border-b border-[#E5E2DC] bg-white py-12">
        <div className="container-site max-w-6xl">
          <SectionHead eyebrow="Who it suits and the pace" title="Trip overview" />
          <p className="mt-4 max-w-4xl text-[0.9375rem] leading-relaxed text-[#374151]">{plan.overview}</p>
          {plan.transport ? (
            <p className="mt-4 flex max-w-4xl gap-2 text-sm text-[#444]">
              <Icon name="car" size={16} className="mt-0.5 shrink-0 text-coral" />
              <span><strong className="text-ink">Getting around: </strong>{plan.transport}</span>
            </p>
          ) : null}
        </div>
      </section>

      {/* 2. Altitude profile */}
      {showElevation ? (
        <section className="border-b border-[#E5E2DC] bg-white py-14">
          <div className="container-site max-w-6xl">
            <SectionHead eyebrow="Altitude profile" title="Where you sleep, night by night" intro="Overnight altitudes, plus the highest point crossed on the way. Above about 3,000 m, climb slowly and rest if you feel unwell." />
            <div className="mt-8 overflow-x-auto rounded-2xl border border-[#E5E2DC] bg-[#FAF9F6] p-6 shadow-xs">
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

      {/* 3. Day by day */}
      <section className="border-b border-[#E5E2DC] bg-white py-14">
        <div className="container-site max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E5E2DC] pb-4">
            <SectionHead eyebrow="Day-by-day itinerary" title={`The ${itinerary.durationDays}-day plan`} />
            <div className="no-print flex items-center gap-3 text-xs font-semibold text-[#555]">
              <button type="button" onClick={expandAll} className="underline underline-offset-4 transition-colors hover:text-coral">Expand all</button>
              <span>·</span>
              <button type="button" onClick={collapseAll} className="underline underline-offset-4 transition-colors hover:text-coral">Collapse all</button>
            </div>
          </div>

          <div className="mt-8 space-y-6">
            {days.map((day, idx) => {
              const isExpanded = !!expandedDays[idx];
              const prevAlt = idx > 0 ? days[idx - 1].altitude : undefined;
              const change = typeof day.altitude === "number" && typeof prevAlt === "number" ? day.altitude - prevAlt : null;
              const eyebrow = [`Day ${String(idx + 1).padStart(2, "0")}`, day.distance, day.driveTime].filter(Boolean).join(" · ");
              const cards = [
                day.overnight ? { icon: "bed" as const, label: "Overnight", text: `${day.overnight}${typeof day.altitude === "number" ? ` (${fmt(day.altitude)} m)` : ""}` } : null,
                day.transport ? { icon: "car" as const, label: "Transport", text: day.transport } : null,
                day.travel ? { icon: "route" as const, label: "Road and travel", text: day.travel } : null,
                day.meals ? { icon: "utensils" as const, label: "Meals", text: day.meals } : null,
              ].filter((c): c is { icon: "bed" | "car" | "route" | "utensils"; label: string; text: string } => !!c);

              // Gather photos for this day (from explicit day.photos, day.photo, or matching stops)
              const dayPhotos: Array<{ url: string; alt: string; caption?: string | null; attribution?: string | null; license?: string | null; href?: string | null }> = [];
              const seenUrls = new Set<string>();

              if (day.photos) {
                for (const p of day.photos) {
                  if (p?.url && !seenUrls.has(p.url)) {
                    dayPhotos.push({ url: p.url, alt: p.alt, caption: p.caption, attribution: p.attribution, license: p.license });
                    seenUrls.add(p.url);
                  }
                }
              }
              if (day.photo?.url && !seenUrls.has(day.photo.url)) {
                dayPhotos.push({ url: day.photo.url, alt: day.photo.alt, caption: day.photo.caption, attribution: day.photo.attribution, license: day.photo.license });
                seenUrls.add(day.photo.url);
              }

              for (const stop of day.stops) {
                if (stop.photo?.url && !seenUrls.has(stop.photo.url)) {
                  const href = stop.placeSlug ? stopLinks[stop.placeSlug] ?? null : null;
                  dayPhotos.push({ url: stop.photo.url, alt: stop.photo.alt, caption: stop.photo.caption ?? stop.name, attribution: stop.photo.attribution, license: stop.photo.license, href });
                  seenUrls.add(stop.photo.url);
                }
                const slugPart = stop.placeSlug ? stop.placeSlug.split("/").pop()! : null;
                const found = (slugPart ? photosByRef[slugPart] : null) ?? (stop.placeSlug ? photosByRef[stop.placeSlug] : null) ?? photosByRef[stop.name.toLowerCase()];
                if (found?.image && !seenUrls.has(found.image.url)) {
                  const href = stop.placeSlug ? stopLinks[stop.placeSlug] ?? null : null;
                  dayPhotos.push({
                    url: found.image.url,
                    alt: found.image.alt || found.name,
                    caption: found.name,
                    attribution: found.image.attribution,
                    license: found.image.license,
                    href,
                  });
                  seenUrls.add(found.image.url);
                }
              }

              return (
                <div key={idx} className="overflow-hidden rounded-2xl border border-[#E5E2DC] bg-white shadow-xs transition hover:border-[#D1CDC7]">
                  <button
                    type="button"
                    onClick={() => toggleDay(idx)}
                    aria-expanded={isExpanded}
                    className="flex w-full cursor-pointer flex-wrap items-center justify-between gap-3 border-b border-[#E5E2DC] bg-[#FAF9F6] p-4 text-left transition hover:bg-[#F5F3EF] sm:px-6"
                  >
                    <div>
                      <p className="font-mono text-xs font-bold uppercase tracking-wider text-muted">{eyebrow}</p>
                      <h3 className="mt-1 font-serif text-xl font-medium text-ink">{cleanTitle(day.title)}</h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {day.highPoint ? <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-800">High point: {day.highPoint.name} {fmt(day.highPoint.altitude)} m</span> : null}
                      {change != null && change !== 0 ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{change > 0 ? "Sleep +" : "Sleep −"}{fmt(Math.abs(change))} m</span> : null}
                      {day.access ? <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">{day.access}</span> : null}
                      {day.permits ? <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">{day.permits}</span> : null}
                      <Icon name="chevronDown" size={16} className={`ml-1 text-muted transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </div>
                  </button>

                  {isExpanded ? (
                    <div className="space-y-6 p-5 sm:p-6">
                      {day.summary ? <p className="text-[0.9375rem] leading-relaxed text-[#374151]">{day.summary}</p> : null}

                      {dayPhotos.length > 0 ? (
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold uppercase tracking-wider text-[#BA4A38]">What you&apos;ll see on Day {idx + 1}</p>
                            <span className="text-[0.6875rem] font-medium text-muted">{dayPhotos.length} {dayPhotos.length === 1 ? "sight" : "sights"}</span>
                          </div>
                          <div className={`grid gap-3.5 ${dayPhotos.length === 1 ? "grid-cols-1 sm:max-w-md" : dayPhotos.length === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}>
                            {dayPhotos.map((p, pIdx) => {
                              const Card = (
                                <div className="group relative overflow-hidden rounded-xl border border-[#E5E2DC] bg-[#F7F5F0] transition hover:border-coral/60 hover:shadow-sm">
                                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                                    <Image
                                      src={p.url}
                                      alt={p.alt}
                                      fill
                                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                                    <div className="absolute bottom-2 left-2.5 right-2.5 flex items-end justify-between gap-1">
                                      <span className="truncate text-xs font-semibold text-white drop-shadow-sm">{p.caption || p.alt}</span>
                                      {p.attribution ? (
                                        <span className="shrink-0 rounded bg-black/60 px-1.5 py-0.5 text-[0.5625rem] text-white/90">
                                          {p.attribution}
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              );
                              return p.href ? (
                                <Link key={pIdx} href={p.href} className="block transition-opacity hover:opacity-95">
                                  {Card}
                                </Link>
                              ) : (
                                <div key={pIdx}>{Card}</div>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}

                      <div className="rounded-xl border border-[#E5E2DC] bg-[#FAF9F6]/50 p-4">
                        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">Stops</p>
                        <ol className="space-y-3">
                          {day.stops.map((stop, sIdx) => {
                            const href = stop.placeSlug ? (stopLinks[stop.placeSlug] ?? null) : null;
                            return (
                              <li key={sIdx} className="flex flex-col gap-1 text-sm sm:flex-row sm:items-start sm:gap-4">
                                <span className="w-28 shrink-0 font-mono text-xs font-bold uppercase text-coral">{stop.time || `Stop ${sIdx + 1}`}</span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-baseline gap-2">
                                    {href ? <Link href={href} className="font-semibold text-ink underline-offset-2 hover:text-coral hover:underline">{stop.name}</Link> : <span className="font-semibold text-ink">{stop.name}</span>}
                                    {stop.duration ? <span className="text-xs text-muted">· {stop.duration}</span> : null}
                                  </div>
                                  {stop.note ? <p className="mt-0.5 text-xs text-[#555]">{stop.note}</p> : null}
                                </div>
                              </li>
                            );
                          })}
                        </ol>
                      </div>

                      {cards.length || day.logistics ? (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          {cards.map((c) => (
                            <div key={c.label} className="rounded-xl border border-[#E5E2DC] bg-[#FAF9F6] p-3.5">
                              <p className="flex items-center gap-1.5 text-[0.6875rem] font-bold uppercase tracking-wider text-muted"><Icon name={c.icon} size={13} className="text-coral" /> {c.label}</p>
                              <p className="mt-1 text-xs font-medium leading-snug text-ink">{c.text}</p>
                            </div>
                          ))}
                          {day.logistics ? (
                            <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-3.5">
                              <p className="flex items-center gap-1.5 text-[0.6875rem] font-bold uppercase tracking-wider text-amber-900"><Icon name="shield" size={13} className="text-amber-700" /> Good to know</p>
                              <p className="mt-1 text-xs font-medium leading-snug text-amber-950">{day.logistics}</p>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. Route table */}
      {hasRouteTable ? (
        <section className="border-b border-[#E5E2DC] bg-white py-14">
          <div className="container-site max-w-6xl">
            <SectionHead eyebrow="Route at a glance" title="Distances and travel times" intro={routeKm ? `About ${fmt(Math.round(routeKm / 10) * 10)} km in all, from ${plan.start ?? "the start"} to ${plan.end ?? "the finish"}.` : undefined} />
            <div className="mt-8 overflow-x-auto rounded-2xl border border-[#E5E2DC] bg-white">
              <table className="w-full min-w-[600px] text-left text-xs sm:text-sm">
                <thead className="border-b border-[#E5E2DC] bg-[#FAF9F6] text-[0.6875rem] font-bold uppercase tracking-wider text-muted">
                  <tr>
                    <th className="px-4 py-3">Day</th>
                    <th className="px-4 py-3">Leg</th>
                    <th className="px-4 py-3">Distance</th>
                    <th className="px-4 py-3">Travel time</th>
                    <th className="px-4 py-3">Overnight</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E2DC]">
                  {days.map((d, i) => (
                    <tr key={i} className="hover:bg-[#FAF9F6]/50">
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono font-bold text-coral">Day {i + 1}</td>
                      <td className="px-4 py-2.5 font-semibold text-ink">{cleanTitle(d.title)}</td>
                      <td className="px-4 py-2.5 text-muted">{d.distance ?? "—"}</td>
                      <td className="px-4 py-2.5 text-muted">{d.driveTime ?? "—"}</td>
                      <td className="px-4 py-2.5 text-muted">{d.overnight ?? "—"}{typeof d.altitude === "number" ? ` · ${fmt(d.altitude)} m` : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      {/* 5. Preparation and booking */}
      {plan.prep?.length || plan.booking.length ? (
        <section className="border-b border-[#E5E2DC] bg-white py-14">
          <div className="container-site max-w-6xl">
            <SectionHead eyebrow="Before you go" title="Permits, bookings and preparation" />
            {plan.prep?.length ? (
              <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {plan.prep.map((card) => (
                  <div key={card.title} className="rounded-2xl border border-[#E5E2DC] border-l-4 border-l-[#BA4A38] bg-[#FAF9F6] p-5 sm:p-6">
                    <h3 className="font-serif text-lg font-medium text-ink">{card.title}</h3>
                    <p className="mt-2.5 text-xs leading-relaxed text-[#555]">{card.body}</p>
                  </div>
                ))}
              </div>
            ) : null}
            {plan.booking.length ? (
              <div className="mt-8 rounded-2xl border border-[#E5E2DC] bg-white p-5 sm:p-6">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">Book ahead</p>
                <ul className="mt-3 space-y-2.5 text-sm text-[#444]">
                  {plan.booking.map((b) => (
                    <li key={b.item} className="flex gap-2"><Icon name="checkCircle" size={16} className="mt-0.5 shrink-0 text-coral" /><span><strong className="text-ink">{b.item}: </strong>{b.detail}</span></li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* 6. Budget */}
      <section className="border-b border-[#E5E2DC] bg-white py-14">
        <div className="container-site max-w-6xl">
          <SectionHead eyebrow="Costs" title="Budget" intro={plan.budget.assumptions} />
          {plan.budget.lines.length ? (
            <div className="mt-8 overflow-x-auto rounded-2xl border border-[#E5E2DC] bg-white">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b border-[#E5E2DC] bg-[#FAF9F6] text-[0.6875rem] font-bold uppercase tracking-wider text-muted">
                  <tr><th className="px-4 py-3">Item</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Basis</th></tr>
                </thead>
                <tbody className="divide-y divide-[#E5E2DC]">
                  {plan.budget.lines.map((l) => (
                    <tr key={l.label}>
                      <td className="px-4 py-2.5 font-semibold text-ink">{l.label}</td>
                      <td className="px-4 py-2.5 text-ink">{l.amount}</td>
                      <td className="px-4 py-2.5 text-xs text-muted">{l.basis}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <Link href={routes.chatWithPrompt(`Estimate a budget for ${itinerary.title} for my group and travel style`)} className="no-print mt-6 inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-black">
            <Icon name="sparkles" size={14} /> Work out my budget with AI
          </Link>
        </div>
      </section>

      {/* 7. Alternatives and tips */}
      {plan.alternatives.length || plan.tips?.length ? (
        <section className="border-b border-[#E5E2DC] bg-white py-14">
          <div className="container-site max-w-6xl">
            <SectionHead eyebrow="Plan B" title="If the weather or roads change" />
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {plan.alternatives.length ? (
                <div className="rounded-2xl border border-[#E5E2DC] bg-[#FAF9F6] p-5 sm:p-6">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">Alternatives</p>
                  <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-[#444]">{plan.alternatives.map((a) => <li key={a} className="flex gap-2"><Icon name="route" size={15} className="mt-0.5 shrink-0 text-coral" />{a}</li>)}</ul>
                </div>
              ) : null}
              {plan.tips?.length ? (
                <div className="rounded-2xl border border-[#E5E2DC] bg-[#FAF9F6] p-5 sm:p-6">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">Practical tips</p>
                  <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-[#444]">{plan.tips.map((t) => <li key={t} className="flex gap-2"><Icon name="bulb" size={15} className="mt-0.5 shrink-0 text-coral" />{t}</li>)}</ul>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {/* 8. FAQs */}
      {plan.faqs?.length ? (
        <section className="border-b border-[#E5E2DC] bg-white py-14">
          <div className="container-site max-w-6xl">
            <SectionHead eyebrow="Travel questions" title="Frequently asked questions" />
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {plan.faqs.map((f) => (
                <div key={f.q} className="rounded-2xl border border-[#E5E2DC] bg-[#FAF9F6] p-5 sm:p-6">
                  <h3 className="font-serif text-base font-semibold text-ink">{f.q}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#555]">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Sources */}
      {sources.length ? (
        <section className="bg-white py-10">
          <div className="container-site max-w-6xl">
            <details className="rounded-2xl border border-[#E5E2DC] bg-white px-5 py-4 text-sm">
              <summary className="cursor-pointer font-semibold text-ink">Sources for this itinerary ({sources.length})</summary>
              <ul className="mt-3 grid gap-1.5 text-xs text-[#666] sm:grid-cols-2">
                {sources.map((s) => (
                  <li key={s.url} className="truncate"><a href={s.url} {...ext} className="hover:text-coral hover:underline">{s.title || s.site}</a> <span className="text-[#999]">· {s.site}</span></li>
                ))}
              </ul>
            </details>
          </div>
        </section>
      ) : null}

      {/* 9. Related */}
      {relatedItineraries.length > 0 ? (
        <section className="border-b border-[#E5E2DC] bg-white py-14">
          <div className="container-site max-w-6xl">
            <div className="flex items-end justify-between">
              <SectionHead eyebrow="More routes" title="Related itineraries" />
              <Link href="/itineraries" className="text-xs font-semibold text-coral hover:underline">View all itineraries →</Link>
            </div>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {relatedItineraries.slice(0, 4).map((rel) => (
                <Link key={rel.slug} href={`/itineraries/${rel.slug}`} className="group flex flex-col overflow-hidden rounded-2xl border border-[#E5E2DC] bg-white transition hover:border-coral hover:shadow-card">
                  <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                    {rel.heroUrl ? <Image src={rel.heroUrl} alt={rel.title} fill sizes="(max-width: 640px) 100vw, 25vw" className="object-cover transition-transform duration-500 group-hover:scale-105" /> : null}
                    <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2.5 py-0.5 text-[0.6875rem] font-semibold text-white backdrop-blur-sm">{rel.durationDays} days</span>
                  </div>
                  <div className="flex flex-1 flex-col justify-between p-4">
                    <div>
                      <h3 className="line-clamp-2 font-serif text-sm font-semibold text-ink transition-colors group-hover:text-coral">{rel.title}</h3>
                      <p className="mt-1 line-clamp-2 text-xs text-muted">{rel.summary}</p>
                    </div>
                    <p className="mt-3 flex items-center gap-1 text-xs font-semibold text-coral">View itinerary <Icon name="arrowRight" size={12} /></p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </article>
  );
}
