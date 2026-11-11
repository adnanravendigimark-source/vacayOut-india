import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/icons/icon";

/**
 * Short white header for the list pages (Things to do, Travel guides,
 * Itineraries). Explore India keeps the big photo hero; these pages start
 * with their content, so each one can have its own layout below.
 */
export function HubHeader({
  crumb,
  eyebrow,
  title,
  intro,
  stats = [],
  search,
  children,
}: {
  crumb: string;
  eyebrow: string;
  title: string;
  intro: string;
  stats?: { value: number | string; label: string }[];
  search: {
    id: string;
    label: string;
    placeholder: string;
    value: string;
    onChange: (v: string) => void;
    onSubmit: (e: React.FormEvent) => void;
  };
  children?: ReactNode;
}) {
  return (
    <header className="border-b border-line-subtle bg-white">
      <div className="container-site pb-7 pt-6 sm:pb-9 sm:pt-8">
        <nav aria-label="Breadcrumb" className="text-xs text-muted">
          <ol className="flex items-center gap-1.5">
            <li><Link href="/" className="hover:text-ink">Home</Link></li>
            <li aria-hidden className="text-[#C9C4BA]">/</li>
            <li aria-current="page" className="font-medium text-ink">{crumb}</li>
          </ol>
        </nav>

        <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-coral">{eyebrow}</p>
            <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-ink sm:text-[2.6rem] sm:leading-[1.1]">{title}</h1>
            <p className="mt-3 text-sm leading-relaxed text-[#5F5F5F] sm:text-base">{intro}</p>
          </div>
          {stats.length ? (
            <dl className="flex shrink-0 gap-8">
              {stats.map((s) => (
                <div key={s.label}>
                  <dt className="sr-only">{s.label}</dt>
                  <dd className="font-serif text-2xl font-bold text-ink sm:text-3xl">{s.value}</dd>
                  <dd className="text-xs text-muted">{s.label}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>

        <form onSubmit={search.onSubmit} role="search" className="mt-6 max-w-2xl">
          <div className="relative flex items-center">
            <Icon name="search" size={18} className="pointer-events-none absolute left-4 text-muted" />
            <label htmlFor={search.id} className="sr-only">{search.label}</label>
            <input
              id={search.id}
              type="text"
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              placeholder={search.placeholder}
              className="h-12 w-full rounded-full border border-line bg-[#FBFAF8] pl-11 pr-14 text-sm text-ink placeholder:text-[#8A8A8A] transition-colors focus:border-ink focus:bg-white focus:outline-none"
            />
            <button type="submit" aria-label="Search" className="absolute right-1.5 flex size-9 items-center justify-center rounded-full bg-ink text-white transition-colors hover:bg-coral">
              <Icon name="arrowRight" size={16} />
            </button>
          </div>
        </form>

        {children}
      </div>
    </header>
  );
}
