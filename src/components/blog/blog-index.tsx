"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/components/icons/icon";
import { formatPostDate, type BlogCard } from "@/lib/blog/post";
import { PostImage } from "./post-image";
import "@/components/explore/explore.css";

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

/** The heading with its last word in coral italics. */
function Heading({ text }: { text: string }) {
  const i = text.trim().lastIndexOf(" ");
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i + 1)}<em className="italic text-coral">{text.slice(i + 1)}</em></>;
}

/** One soft colour per category, so posts are easy to tell apart at a glance. */
const TONES = ["bg-[#FDF0EB] text-[#B9442B]", "bg-[#E8F1EB] text-[#2D5A3F]", "bg-[#E6EDF7] text-[#234A7A]", "bg-[#FBF0DC] text-[#7A4A0B]", "bg-[#F1ECF6] text-[#5B3A7A]"];
const meta = (p: BlogCard) => [formatPostDate(p.publishDate), p.readTime].filter(Boolean).join(" · ");

/** Photo with small viewfinder corners; a "+" appears on hover. */
function Frame({ post, sizes, preload = false, className = "" }: { post: BlogCard; sizes: string; preload?: boolean; className?: string }) {
  const corner = "pointer-events-none absolute size-4 border-white/85";
  return (
    <span className={`relative block overflow-hidden bg-[#EFECE6] ${className}`}>
      <PostImage src={post.image} alt={post.imageAlt || post.title} sizes={sizes} preload={preload} className="object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
      <span aria-hidden className={`${corner} left-3 top-3 border-l-2 border-t-2`} />
      <span aria-hidden className={`${corner} right-3 top-3 border-r-2 border-t-2`} />
      <span aria-hidden className={`${corner} bottom-3 left-3 border-b-2 border-l-2`} />
      <span aria-hidden className={`${corner} bottom-3 right-3 border-b-2 border-r-2`} />
      <span aria-hidden className="absolute left-1/2 top-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 scale-75 items-center justify-center rounded-full bg-white/25 text-xl font-light text-white opacity-0 backdrop-blur-md transition-all duration-300 group-hover:scale-100 group-hover:opacity-100">+</span>
    </span>
  );
}

/**
 * Blog listing, kept simple: a plain header with search, category tabs, one featured
 * story, then a three-column grid with "Show more". Filtering runs in the browser
 * (the list is small and cached). Copy comes from the admin's blog settings.
 */
export function BlogIndex({ posts, copy, initialQuery = "" }: { posts: BlogCard[]; copy: BlogIndexCopy; initialQuery?: string }) {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState(initialQuery);
  const [shown, setShown] = useState(PAGE_SIZE);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of posts) counts.set(p.category || "General", (counts.get(p.category || "General") ?? 0) + 1);
    return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [posts]);
  const toneOf = (c: string) => TONES[Math.max(0, categories.findIndex((x) => x.name === (c || "General"))) % TONES.length];

  const list = useMemo(
    () => posts.filter((p) => (category === "All" || (p.category || "General").toLowerCase() === category.toLowerCase()) && matches(p, query)),
    [posts, category, query],
  );
  const filtersOn = category !== "All" || !!query.trim();
  const featured = !filtersOn && list.length > 1 ? list[0] : null;
  const rest = featured ? list.slice(1) : list;
  const items = rest.slice(0, shown);

  const pick = (c: string) => {
    setCategory(c);
    setShown(PAGE_SIZE);
  };

  return (
    <div className="container-site py-10 sm:py-14">
      {/* 1. Header: title on the left, search on the right */}
      <header className="flex flex-col gap-6 border-b border-[#EFECE6] pb-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-coral">{copy.eyebrow}</p>
          <h1 className="mt-2 font-serif text-[clamp(2.2rem,4.4vw,3.2rem)] font-normal leading-[1.04] tracking-[-0.02em] text-ink">
            <Heading text={copy.heading} />
          </h1>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-[#666666]">{copy.subheading}</p>
        </div>
        <label className="flex w-full items-center gap-2 rounded-full border border-[#E5E2DC] bg-white px-4 transition-colors focus-within:border-ink md:w-72">
          <Icon name="search" size={16} className="shrink-0 text-[#999999]" />
          <span className="sr-only">Search articles</span>
          <input
            id="blog-search"
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShown(PAGE_SIZE);
            }}
            placeholder="Search articles"
            maxLength={100}
            className="h-11 min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-[#999999]"
          />
        </label>
      </header>

      {/* 2. Category tabs */}
      {posts.length ? (
        <div className="-mx-4 mt-5 flex gap-1.5 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0" role="group" aria-label="Categories">
          {[{ name: "All", count: posts.length }, ...categories].map((c) => {
            const on = category.toLowerCase() === c.name.toLowerCase();
            return (
              <button
                key={c.name}
                type="button"
                aria-pressed={on}
                onClick={() => pick(c.name)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${on ? "bg-ink text-white" : "text-[#666666] hover:bg-[#F5F3EE] hover:text-ink"}`}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      ) : null}

      <div id="articles-section" className="mt-8 scroll-mt-24">
        {posts.length === 0 ? (
          <p className="rounded-2xl bg-[#FAF9F5] px-6 py-16 text-center text-sm text-[#777777]">{copy.emptyStateText}</p>
        ) : list.length === 0 ? (
          <div className="rounded-2xl bg-[#FAF9F5] px-6 py-14 text-center">
            <p className="font-semibold text-ink">No articles matched.</p>
            <button type="button" onClick={() => { pick("All"); setQuery(""); }} className="mt-3 text-sm font-semibold text-coral hover:underline">Show all articles</button>
          </div>
        ) : (
          <>
            {/* 3. Featured story */}
            {featured ? (
              <Link href={`/blog/${featured.slug}`} className="explore-card group grid overflow-hidden rounded-3xl bg-[#FBF8F3] md:grid-cols-2" style={{ ["--i" as string]: 0 }}>
                <Frame post={featured} sizes="(min-width: 768px) 50vw, 100vw" preload className="aspect-[16/10] md:aspect-auto md:min-h-[24rem]" />
                <span className="flex flex-col justify-center p-6 sm:p-10">
                  <span className="self-start rounded-full bg-ink px-3 py-1 text-[0.6875rem] font-semibold text-white">Must read</span>
                  <span className="mt-4 block font-serif text-[clamp(1.6rem,3vw,2.4rem)] leading-[1.1] text-ink [text-wrap:balance] transition-colors group-hover:text-coral">{featured.title}</span>
                  <span className="mt-3 line-clamp-3 block text-[0.9375rem] leading-relaxed text-[#666666]">{featured.excerpt}</span>
                  <span className="mt-6 flex items-center justify-between gap-3 text-xs text-[#888888]">
                    <span>{meta(featured)}</span>
                    <span className={`rounded-full px-2.5 py-1 font-semibold ${toneOf(featured.category)}`}>{featured.category || "General"}</span>
                  </span>
                </span>
              </Link>
            ) : null}

            {/* 4. Grid */}
            {items.length ? (
              <ul key={`${category}|${query.trim()}`} className={`grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 ${featured ? "mt-10" : ""}`}>
                {items.map((post, i) => (
                  <li key={post.slug} className="explore-card" style={{ ["--i" as string]: Math.min(i, 12) }}>
                    <Link href={`/blog/${post.slug}`} className="group block">
                      <Frame post={post} sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 95vw" className="aspect-[4/3] rounded-2xl" />
                      <span className="mt-3.5 flex items-start justify-between gap-3">
                        <span className="line-clamp-2 font-semibold leading-snug text-ink transition-colors group-hover:text-coral">{post.title}</span>
                        <span className={`mt-0.5 shrink-0 rounded-full px-2.5 py-0.5 text-[0.6875rem] font-semibold ${toneOf(post.category)}`}>{post.category || "General"}</span>
                      </span>
                      <span className="mt-1.5 block text-xs text-[#888888]">{meta(post)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}

            {rest.length > shown ? (
              <div className="mt-12 text-center">
                <button type="button" onClick={() => setShown((n) => n + PAGE_SIZE)} className="rounded-full border border-ink px-6 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-white">
                  Show more articles
                </button>
              </div>
            ) : null}
          </>
        )}

        {/* 5. One quiet next step (copy from the blog settings) */}
        {copy.cta.heading && copy.cta.buttonHref ? (
          <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-[#EFECE6] pt-8 sm:flex-row sm:items-center">
            <div>
              <p className="font-serif text-xl text-ink">{copy.cta.heading}</p>
              {copy.cta.body ? <p className="mt-1 text-sm text-[#666666]">{copy.cta.body}</p> : null}
            </div>
            <Link href={copy.cta.buttonHref} className="inline-flex shrink-0 items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-black">
              <Icon name="sparkles" size={15} className="text-coral" />
              {copy.cta.buttonText || "Plan with AI"}
            </Link>
          </div>
        ) : null}
      </div>
    </div>
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
