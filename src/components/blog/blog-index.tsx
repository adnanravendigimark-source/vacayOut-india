"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/components/icons/icon";
import { formatPostDate, type BlogCard } from "@/lib/blog/post";
import { PostImage } from "./post-image";
import { SidebarPromo } from "./sidebar-promo";

const PAGE_SIZE = 9;

export type BlogIndexCopy = {
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

/** Listing: category filter, search, sort and pagination (all in the browser — the full list is small and cached). */
export function BlogIndex({ posts, copy, initialQuery = "" }: { posts: BlogCard[]; copy: BlogIndexCopy; initialQuery?: string }) {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of posts) counts.set(p.category || "General", (counts.get(p.category || "General") ?? 0) + 1);
    return [...counts].map(([name, count]) => ({ name, count }));
  }, [posts]);

  const list = useMemo(() => {
    const out = posts.filter((p) => (category === "All" || (p.category || "General").toLowerCase() === category.toLowerCase()) && matches(p, query));
    return sort === "oldest" ? [...out].reverse() : out;
  }, [posts, category, query, sort]);

  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const start = (current - 1) * PAGE_SIZE;
  const items = list.slice(start, start + PAGE_SIZE);

  const goTo = (p: number) => {
    setPage(Math.min(Math.max(1, p), totalPages));
    document.getElementById("articles-section")?.scrollIntoView({ behavior: "smooth" });
  };
  const pickCategory = (c: string) => {
    setCategory(c);
    setPage(1);
  };

  return (
    <div id="articles-section" className="container-site scroll-mt-24 py-12 sm:py-16 lg:grid lg:grid-cols-[1fr_300px] lg:gap-10">
      <div className="min-w-0">
        <div className="mb-6">
          <h2 className="font-serif text-2xl font-semibold text-ink sm:text-3xl">{copy.listHeading}</h2>
          <p className="mt-1.5 text-sm text-muted">{copy.listSubheading}</p>
        </div>

        {posts.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line bg-white p-12 text-center text-sm text-muted">{copy.emptyStateText}</p>
        ) : (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
              <p className="text-xs font-medium text-muted" aria-live="polite">
                Showing {list.length === 0 ? 0 : start + 1} – {Math.min(start + PAGE_SIZE, list.length)} of {list.length} articles
                {category !== "All" ? (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-md bg-coral-soft px-2 py-0.5 text-[11px] font-semibold text-coral">
                    {category}
                    <button type="button" onClick={() => pickCategory("All")} className="ml-1 hover:text-ink" aria-label="Clear category filter">×</button>
                  </span>
                ) : null}
                {query.trim() ? (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-md bg-sand px-2 py-0.5 text-[11px] font-semibold text-ink">
                    “{query.trim()}”
                    <button type="button" onClick={() => setQuery("")} className="ml-1 hover:text-coral" aria-label="Clear search">×</button>
                  </span>
                ) : null}
              </p>
              <div className="relative">
                <label htmlFor="sort-select" className="sr-only">Sort articles</label>
                <select id="sort-select" value={sort} onChange={(e) => setSort(e.target.value as "newest" | "oldest")} className="cursor-pointer appearance-none rounded-lg border border-line bg-white py-1.5 pl-3 pr-8 text-xs font-semibold text-ink shadow-sm transition hover:border-coral focus:border-coral focus:outline-none">
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
                <span aria-hidden className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted">▾</span>
              </div>
            </div>

            {list.length === 0 ? (
              <div className="mt-8 rounded-2xl border border-dashed border-line bg-white p-12 text-center text-sm text-muted">No articles found matching your search.</div>
            ) : (
              <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((post) => (
                  <Link key={post.slug} href={`/blog/${post.slug}`} className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-coral/40 hover:shadow-card-hover">
                    <div className="relative aspect-[16/10] overflow-hidden bg-sand">
                      <PostImage src={post.image} alt={post.imageAlt || post.title} sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      {post.category ? (
                        <div className="mb-2.5">
                          <span className="inline-block rounded-md bg-coral-soft px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-coral">{post.category}</span>
                        </div>
                      ) : null}
                      <div className="flex items-center gap-3 text-[11px] font-medium text-muted">
                        <span className="inline-flex items-center gap-1"><Icon name="calendar" size={14} className="text-coral" />{formatPostDate(post.publishDate)}</span>
                        {post.readTime ? <span className="inline-flex items-center gap-1"><Icon name="clock" size={14} className="text-coral" />{post.readTime}</span> : null}
                      </div>
                      <h3 className="mt-2.5 line-clamp-2 font-serif text-[1.05rem] font-semibold leading-snug text-ink transition-colors group-hover:text-coral">{post.title}</h3>
                      <p className="mt-2 line-clamp-2 flex-1 text-xs leading-relaxed text-muted">{post.excerpt}</p>
                      <div className="mt-4 pt-2">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-ink transition group-hover:text-coral">
                          Read More <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {totalPages > 1 ? (
              <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-2">
                <button type="button" onClick={() => goTo(current - 1)} disabled={current === 1} aria-label="Previous page" className="flex size-9 items-center justify-center rounded-lg border border-line bg-white text-xs font-bold text-ink transition hover:border-coral disabled:opacity-30">‹</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                  if (totalPages > 6 && p !== 1 && p !== totalPages && Math.abs(p - current) > 1) {
                    return p === 2 || p === totalPages - 1 ? <span key={p} className="px-1 text-xs text-muted">…</span> : null;
                  }
                  return (
                    <button key={p} type="button" onClick={() => goTo(p)} aria-current={p === current ? "page" : undefined} className={`flex size-9 items-center justify-center rounded-lg text-xs font-bold transition ${p === current ? "bg-coral text-white shadow-sm" : "border border-line bg-white text-ink hover:border-coral"}`}>
                      {p}
                    </button>
                  );
                })}
                <button type="button" onClick={() => goTo(current + 1)} disabled={current === totalPages} aria-label="Next page" className="flex size-9 items-center justify-center rounded-lg border border-line bg-white text-xs font-bold text-ink transition hover:border-coral disabled:opacity-30">›</button>
              </nav>
            ) : null}
          </div>
        )}
      </div>

      <aside className="mt-12 space-y-6 lg:sticky lg:top-24 lg:mt-0 lg:self-start">
        <div className="flex overflow-hidden rounded-xl border border-line bg-white shadow-sm focus-within:border-coral">
          <label htmlFor="blog-search" className="sr-only">Search articles</label>
          <input
            id="blog-search"
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search articles..."
            className="w-full bg-transparent px-3.5 py-2.5 text-xs text-ink placeholder:text-muted focus:outline-none"
          />
          <span aria-hidden className="flex items-center justify-center bg-coral px-3.5 text-white">
            <Icon name="search" size={16} />
          </span>
        </div>

        {categories.length ? (
          <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
            <p className="font-serif text-base font-semibold text-ink">Categories</p>
            <div className="mt-3.5 space-y-1">
              {categories.map((c) => {
                const on = category.toLowerCase() === c.name.toLowerCase();
                return (
                  <button key={c.name} type="button" aria-pressed={on} onClick={() => pickCategory(on ? "All" : c.name)} className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-semibold transition ${on ? "bg-coral-soft font-bold text-coral" : "text-ink/80 hover:bg-sand hover:text-coral"}`}>
                    <span>{c.name}</span>
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-sand px-1.5 text-[10px] font-bold text-ink">{c.count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <PopularPosts posts={posts.slice(0, 5)} heading="Recent Articles" />
        <SidebarPromo {...copy.cta} />
      </aside>
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
