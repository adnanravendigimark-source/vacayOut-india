"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons/icon";
import type { BlogCard } from "@/lib/blog/post";
import type { TocItem } from "@/lib/blog/html";
import { PopularPosts } from "./blog-index";
import { SidebarPromo } from "./sidebar-promo";

/** Article sidebar: search (opens the listing filtered), table of contents, recent posts and the promo card. */
export function PostSidebar({ toc, tocLabel, recent, cta }: { toc: TocItem[]; tocLabel: string; recent: BlogCard[]; cta: { heading: string; body: string; buttonText: string; buttonHref: string } }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const sections = toc.filter((t) => t.level === 2);
  return (
    <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (search.trim()) router.push(`/blog?q=${encodeURIComponent(search.trim().slice(0, 100))}`);
        }}
        className="flex overflow-hidden rounded-xl border border-line bg-white shadow-sm focus-within:border-coral"
      >
        <label htmlFor="post-search" className="sr-only">Search articles</label>
        <input id="post-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search articles..." className="w-full bg-transparent px-3.5 py-2.5 text-xs text-ink placeholder:text-muted focus:outline-none" />
        <button type="submit" aria-label="Search" className="flex items-center justify-center bg-coral px-3.5 text-white transition hover:bg-coral-hover">
          <Icon name="search" size={16} />
        </button>
      </form>

      {sections.length >= 2 ? (
        <nav aria-label={tocLabel} className="rounded-2xl border border-coral/20 bg-coral-soft p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-coral">{tocLabel}</p>
          <ul className="mt-3.5 space-y-2.5 text-sm">
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="flex items-start gap-2 font-medium text-ink/80 transition hover:translate-x-0.5 hover:text-coral">
                  <span aria-hidden className="font-bold text-coral">›</span>
                  {s.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <PopularPosts posts={recent} heading="Recent Articles" />
      <SidebarPromo {...cta} />
    </aside>
  );
}
