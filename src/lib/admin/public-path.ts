/** Public URL of a place, given its kind/slug and its state's slug. */
export function publicPath(p: { kind: string; slug: string }, stateSlug: string | null) {
  if (p.kind === "state") return `/india/${p.slug}`;
  return stateSlug ? `/india/${stateSlug}/${p.slug}` : null;
}
