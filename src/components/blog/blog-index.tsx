"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/components/icons/icon";
import { formatPostDate, type BlogCard } from "@/lib/blog/post";
import { PostImage } from "./post-image";
import "@/components/explore/explore.css";
import "@/components/ai-planner/ai-banner.css";

const PAGE_SIZE = 9;

export type BlogIndexCopy = {
  eyebrow: string;
  heading: string;
  subheading: string;
  listHeading: string;
  listSubheading: string;
  emptyStateText: string;
  cta: { heading: string; body: string; buttonText: string; buttonHref: string };
};

function matches(p: BlogCard, q: string) {
  const s = q.trim().toLowerCase();
  return !s || p.title.toLowerCase().includes(s) || p.excerpt.toLowerCase().includes(s) || p.category.toLowerCase().includes(s);
}

/** Reads ?q= (from the article sidebar's search box). Must sit inside <Suspense>. */
export function BlogIndexWithQuery(props: { posts: BlogCard[]; copy: BlogIndexCopy }) {
  const q = useSearchParams().get("q") ?? "";
  return <BlogIndex key={q} {...props} initialQuery={q.slice(0, 100)} />;
}

/** The heading with its last word in coral italics, like the other hub pages. */
function Heading({ text }: { text: string }) {
  const i = text.trim().lastIndexOf(" ");
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i + 1)}<em className="italic text-coral">{text.slice(i + 1)}</em></>;
}

const meta = (p: BlogCard) => [formatPostDate(p.publishDate), p.readTime].filter(Boolean).join(" · ");

/**
 * Blog listing: a white header with live search, sticky category pills, a lead story with two
 * more beside it, then a grid. Filtering, sorting and paging run in the browser (the list is small
 * and cached). Copy comes from the admin's blog settings.
 */
export function BlogIndex({ posts, copy, initialQuery = "" }: { posts: BlogCard[]; copy: BlogIndexCopy; initialQuery?: string }) {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);
  const [focused, setFocused] = useState(false);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of posts) counts.set(p.category || "General", (counts.get(p.category || "General") ?? 0) + 1);
    return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [posts]);

  const list = useMemo(() => {
    const out = posts.filter((p) => (category === "All" || (p.category || "General").toLowerCase() === category.toLowerCase()) && matches(p, query));
    return sort === "oldest" ? [...out].reverse() : out;
  }, [posts, category, query, sort]);

  const filtersOn = category !== "All" || !!query.trim() || sort !== "newest";
  // Lead story + two beside it, only on the unfiltered first page.
  const showLead = !filtersOn && list.length >= 4;
  const lead = showLead ? list[0] : null;
  const side = showLead ? list.slice(1, 3) : [];
  const rest = showLead ? list.slice(3) : list;

  const totalPages = Math.max(1, Math.ceil(rest.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const start = (current - 1) * PAGE_SIZE;
  const items = rest.slice(start, start + PAGE_SIZE);
  const suggestions = query.trim() ? posts.filter((p) => matches(p, query)).slice(0, 5) : [];

  const goTo = (p: number) => {
    setPage(Math.min(Math.max(1, p), totalPages));
    document.getElementById("articles-section")?.scrollIntoView({ behavior: "smooth" });
  };
  const pickCategory = (c: string) => {
    setCategory(c);
    setPage(1);
  };
  const clearAll = () => {
    setCategory("All");
    setQuery("");
    setSort("newest");
    setPage(1);
  };
  const listKey = `${category}|${query.trim()}|${sort}|${current}`;

  return (
    <>
      {/* 1. Header: white, gently moving, live search */}
      <section className="ex-hero relative isolate z-30 bg-white">
        <div aria-hidden className="ex-hero__bg">
          <span className="ex-hero__blob ex-hero__blob--a" />
          <span className="ex-hero__blob ex-hero__blob--b" />
          <span className="ex-hero__blob ex-hero__blob--c" />
          <span className="ex-hero__grid" />
        </div>
        <div className="container-site relative flex flex-col items-center justify-center pb-8 pt-10 text-center sm:pb-10 sm:pt-12">
          <p className="explore-in inline-flex items-center gap-2 rounded-full border border-[#EEE7E0] bg-white/80 px-3.5 py-1 text-xs font-semibold text-[#666666] backdrop-blur-sm" style={{ ["--d" as string]: "0ms" }}>
            <span className="size-1.5 rounded-full bg-coral" /> {copy.eyebrow} · {posts.length} {posts.length === 1 ? "article" : "articles"}
          </p>
          <h1 className="explore-in mt-3 font-serif text-[clamp(2.2rem,4.6vw,3.4rem)] font-normal leading-[1.02] tracking-[-0.03em] text-ink" style={{ ["--d" as string]: "80ms" }}>
            <Heading text={copy.heading} />
          </h1>
          <p className="explore-in mt-2 max-w-xl text-sm text-[#555555] sm:text-base" style={{ ["--d" as string]: "160ms" }}>{copy.subheading}</p>

          <div className="explore-in relative z-30 mt-5 w-full max-w-xl" style={{ ["--d" as string]: "240ms" }} data-focus={focused} data-typing={query.length > 0}>
            <form
              className="ex-search"
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                document.getElementById("articles-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              <span aria-hidden className="ex-search__ring" />
              <Icon name="search" size={20} className="ex-search__icon shrink-0 text-coral" />
              <label htmlFor="blog-search" className="sr-only">Search articles</label>
              <input
                id="blog-search"
                type="text"
                enterKeyHint="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => window.setTimeout(() => setFocused(false), 150)}
                placeholder="Search articles, places or topics"
                autoComplete="off"
                maxLength={100}
                className="min-w-0 flex-1 bg-transparent py-3 text-left text-base font-medium text-ink outline-none placeholder:text-[#999999]"
              />
              {query ? (
                <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="grid size-10 shrink-0 place-items-center rounded-full text-[#888888] hover:bg-black/5">
                  <Icon name="x" size={16} />
                </button>
              ) : null}
              <button type="submit" className="ex-search__go">Search</button>
            </form>
            {focused && suggestions.length ? (
              <ul className="ex-search__list" aria-label="Matching articles">
                {suggestions.map((p, i) => (
                  <li key={p.slug} style={{ ["--i" as string]: i }}>
                    <Link href={`/blog/${p.slug}`} className="flex items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-[#FFF4EF]">
                      <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-[#EFECE6]">
                        <PostImage src={p.image} alt="" sizes="40px" className="object-cover" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink">{p.title}</span>
                        <span className="block truncate text-xs text-[#888888]">{p.category || "General"}</span>
                      </span>
                      <Icon name="arrowRight" size={14} className="text-[#BBBBBB]" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </section>

      {/* 2. Categories + sort (sticky under the site header) */}
      {posts.length ? (
        <div className="sticky top-[4.5rem] z-20 border-b border-[#EFECE6] bg-white/95 backdrop-blur-md lg:top-20">
          <div className="container-site flex items-center gap-3 py-3">
            <div className="-mx-4 flex min-w-0 flex-1 items-center gap-2 overflow-x-auto px-4 scrollbar-none lg:mx-0 lg:px-0" role="group" aria-label="Categories">
              {[{ name: "All", count: posts.length }, ...categories].map((c) => {
                const on = category.toLowerCase() === c.name.toLowerCase();
                return (
                  <button
                    key={c.name}
                    type="button"
                    aria-pressed={on}
                    onClick={() => pickCategory(c.name)}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 ${on ? "bg-ink text-white shadow-sm" : "bg-[#F5F3EE] text-ink/75 hover:bg-[#ECE8E0] hover:text-ink"}`}
                  >
                    {c.name} <span className={on ? "text-white/60" : "text-[#999999]"}>{c.count}</span>
                  </button>
                );
              })}
            </div>
            <label htmlFor="sort-select" className="sr-only">Sort articles</label>
            <select id="sort-select" value={sort} onChange={(e) => { setSort(e.target.value as "newest" | "oldest"); setPage(1); }} className="h-9 shrink-0 rounded-full border border-[#E5E2DC] bg-white px-3.5 text-[0.8125rem] font-medium text-ink focus:border-ink focus:outline-none">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
        </div>
      ) : null}

      <div id="articles-section" className="container-site scroll-mt-32 py-8 sm:py-10">
        {posts.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#E5E2DC] bg-[#FAF9F5] px-6 py-16 text-center text-sm text-[#777777]">{copy.emptyStateText}</p>
        ) : list.length === 0 ? (
          <div className="rounded-2xl bg-[#FAF9F5] px-6 py-14 text-center">
            <p className="text-base font-semibold text-ink">No articles matched.</p>
            <p className="mt-1 text-sm text-[#777777]">Try another word or category.</p>
            <button type="button" onClick={clearAll} className="mt-4 rounded-full border border-[#E5E2DC] px-4 py-2 text-xs font-semibold text-ink">Show all articles</button>
          </div>
        ) : (
          <div key={listKey}>
            {/* Lead story and two more beside it */}
            {lead ? (
              <section className="mb-14 grid gap-6 lg:grid-cols-12 lg:gap-8">
                <Link href={`/blog/${lead.slug}`} className="explore-card group relative block aspect-[16/11] overflow-hidden rounded-3xl bg-[#1a1714] text-white lg:col-span-7 lg:aspect-auto lg:min-h-[26rem]" style={{ ["--i" as string]: 0 }}>
                  <PostImage src={lead.image} alt={lead.imageAlt || lead.title} sizes="(min-width: 1024px) 55vw, 95vw" preload className="object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
                  <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                  <span className="absolute left-4 top-4 rounded-full bg-white/15 px-3 py-1 text-[0.6875rem] font-semibold uppercase tracking-wider backdrop-blur-md">Latest · {lead.category || "General"}</span>
                  <span className="absolute inset-x-5 bottom-5 block sm:inset-x-7 sm:bottom-7">
                    <span className="block max-w-xl font-serif text-2xl leading-tight [text-wrap:balance] sm:text-[2rem]">{lead.title}</span>
                    <span className="mt-2 line-clamp-2 block max-w-xl text-sm leading-relaxed text-white/85">{lead.excerpt}</span>
                    <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-md transition-colors group-hover:bg-white group-hover:text-ink">
                      {meta(lead)} <Icon name="arrowRight" size={12} className="transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </span>
                </Link>
                <ul className="flex flex-col gap-4 lg:col-span-5">
                  {side.map((p, i) => (
                    <li key={p.slug} className="explore-card flex-1" style={{ ["--i" as string]: i + 1 }}>
                      <Link href={`/blog/${p.slug}`} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#ECE9E2] bg-white transition-all duration-300 hover:-translate-y-1 hover:border-transparent hover:shadow-[0_18px_40px_-20px_rgba(25,25,25,0.35)] sm:flex-row">
                        <span className="relative block aspect-[16/10] shrink-0 overflow-hidden bg-[#EFECE6] sm:aspect-auto sm:w-[42%]">
                          <PostImage src={p.image} alt={p.imageAlt || p.title} sizes="(min-width: 1024px) 18vw, (min-width: 640px) 40vw, 95vw" className="object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
                        </span>
                        <span className="flex flex-1 flex-col justify-center p-4">
                          <span className="text-[0.6875rem] font-semibold uppercase tracking-wider text-coral">{p.category || "General"}</span>
                          <span className="mt-1 line-clamp-2 block font-serif text-lg leading-snug text-ink transition-colors group-hover:text-coral">{p.title}</span>
                          <span className="mt-1.5 block text-xs text-[#888888]">{meta(p)}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {rest.length ? (
              <section>
                <div className="mb-5 flex items-baseline justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-ink sm:text-xl">{query.trim() ? `Results for “${query.trim()}”` : category !== "All" ? category : lead ? "More articles" : copy.listHeading}</h2>
                    {!filtersOn && !lead ? <p className="mt-0.5 text-sm text-[#777777]">{copy.listSubheading}</p> : null}
                  </div>
                  <p className="shrink-0 text-xs text-[#888888]" aria-live="polite">
                    {list.length} {list.length === 1 ? "article" : "articles"}
                    {filtersOn ? <button type="button" onClick={clearAll} className="ml-3 font-semibold text-coral hover:underline">Clear filters</button> : null}
                  </p>
                </div>
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
                  {items.map((post, i) => (
                    <li key={post.slug} className="explore-card" style={{ ["--i" as string]: Math.min(i, 12) }}>
                      <Link href={`/blog/${post.slug}`} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#ECE9E2] bg-white transition-all duration-300 hover:-translate-y-1 hover:border-transparent hover:shadow-[0_18px_40px_-20px_rgba(25,25,25,0.35)]">
                        <span className="relative block aspect-[16/10] overflow-hidden bg-[#EFECE6]">
                          <PostImage src={post.image} alt={post.imageAlt || post.title} sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 95vw" className="object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
                          {post.category ? <span className="absolute left-2.5 top-2.5 rounded-full bg-white/92 px-2.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-ink backdrop-blur-sm">{post.category}</span> : null}
                        </span>
                        <span className="flex flex-1 flex-col p-4">
                          <span className="line-clamp-2 block font-serif text-lg leading-snug text-ink transition-colors group-hover:text-coral">{post.title}</span>
                          <span className="mt-1.5 line-clamp-2 block text-[0.8125rem] leading-relaxed text-[#666666]">{post.excerpt}</span>
                          <span className="mt-auto flex items-center gap-1 pt-3 text-xs text-[#888888]">
                            <Icon name="calendar" size={12} className="shrink-0 text-coral" />
                            <span className="truncate">{meta(post)}</span>
                            <Icon name="arrowRight" size={12} className="ml-auto shrink-0 text-[#BBBBBB] transition-all group-hover:translate-x-0.5 group-hover:text-coral" />
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {totalPages > 1 ? (
              <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-2">
                <button type="button" onClick={() => goTo(current - 1)} disabled={current === 1} aria-label="Previous page" className="flex size-9 items-center justify-center rounded-full border border-[#E5E2DC] bg-white text-ink transition hover:border-ink disabled:opacity-30"><Icon name="arrowLeft" size={14} /></button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                  if (totalPages > 6 && p !== 1 && p !== totalPages && Math.abs(p - current) > 1) {
                    return p === 2 || p === totalPages - 1 ? <span key={p} className="px-1 text-xs text-[#888888]">…</span> : null;
                  }
                  return (
                    <button key={p} type="button" onClick={() => goTo(p)} aria-current={p === current ? "page" : undefined} className={`flex size-9 items-center justify-center rounded-full text-xs font-bold transition ${p === current ? "bg-ink text-white shadow-sm" : "border border-[#E5E2DC] bg-white text-ink hover:border-ink"}`}>
                      {p}
                    </button>
                  );
                })}
                <button type="button" onClick={() => goTo(current + 1)} disabled={current === totalPages} aria-label="Next page" className="flex size-9 items-center justify-center rounded-full border border-[#E5E2DC] bg-white text-ink transition hover:border-ink disabled:opacity-30"><Icon name="arrowRight" size={14} /></button>
              </nav>
            ) : null}
          </div>
        )}

        {/* 3. One clear next step (copy from the blog settings) */}
        {copy.cta.heading && copy.cta.buttonHref ? (
          <section className="aip relative isolate mt-16 overflow-hidden rounded-3xl border border-[#F3DED4] p-6 sm:p-8 lg:p-10">
            <span aria-hidden className="aip__blob aip__blob--a" />
            <span aria-hidden className="aip__blob aip__blob--b" />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-xl">
                <p className="inline-flex items-center gap-2 rounded-full border border-[#F0DDD3] bg-white/80 px-3 py-1 text-xs font-semibold text-[#666666]">
                  <span className="aip__live size-1.5 rounded-full bg-coral" /> AI trip planner
                </p>
                <h2 className="mt-3 font-serif text-[clamp(1.6rem,2.6vw,2.2rem)] font-normal leading-tight text-ink">{copy.cta.heading}</h2>
                {copy.cta.body ? <p className="mt-2 text-sm leading-relaxed text-[#555555] sm:text-[0.9375rem]">{copy.cta.body}</p> : null}
              </div>
              <Link href={copy.cta.buttonHref} className="aip-go inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-black lg:self-center">
                <Icon name="sparkles" size={16} className="text-coral" />
                {copy.cta.buttonText || "Plan with AI"}
                <Icon name="arrowRight" size={15} className="aip-go__arrow" />
              </Link>
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}

export function PopularPosts({ posts, heading }: { posts: BlogCard[]; heading: string }) {
  if (!posts.length) return null;
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
      <p className="font-serif text-base font-semibold text-ink">{heading}</p>
      <div className="mt-4 space-y-3.5">
        {posts.map((p) => (
          <Link key={p.slug} href={`/blog/${p.slug}`} className="group flex items-center gap-3">
            <div className="relative h-13 w-16 shrink-0 overflow-hidden rounded-xl bg-sand">
              <PostImage src={p.image} alt={p.imageAlt || p.title} sizes="80px" className="object-cover transition duration-300 group-hover:scale-105" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-xs font-bold leading-snug text-ink transition-colors group-hover:text-coral">{p.title}</p>
              <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-muted"><Icon name="calendar" size={12} className="text-coral" />{formatPostDate(p.publishDate)}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
