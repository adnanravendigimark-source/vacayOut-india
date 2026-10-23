/** Public paths affected when a place is published/unpublished (pages to refresh). */
export function pathsToRefresh(p: {
  kind: string;
  slug: string;
  displayMode: "page" | "parent_section";
  stateSlug: string | null;
  parentPath: string | null;
}): string[] {
  const out = new Set<string>();
  const own = p.kind === "state" ? `/india/${p.slug}` : p.stateSlug ? `/india/${p.stateSlug}/${p.slug}` : null;
  if (own) out.add(own);
  if (p.parentPath) out.add(p.parentPath);
  if (p.stateSlug) out.add(`/india/${p.stateSlug}`);
  return [...out];
}

/** Where the place is shown publicly: its own page, or an anchor inside its parent's page. */
export function publicLocation(p: { kind: string; slug: string; displayMode: "page" | "parent_section"; stateSlug: string | null; parentPath: string | null }) {
  if (p.displayMode === "parent_section" && p.parentPath) return `${p.parentPath}#${p.slug}`;
  if (p.kind === "state") return `/india/${p.slug}`;
  return p.stateSlug ? `/india/${p.stateSlug}/${p.slug}` : null;
}
