/**
 * Cache warming: request pages (and the optimised images they preload) before a visitor does,
 * so the first visitor after a deploy or a publish gets a CDN hit instead of a fresh render.
 *
 * Pure apart from the injected fetch, so it is unit-tested without a network and reused by the
 * cron route (server) and the CLI script (after a deploy).
 */

export type WarmResult = { url: string; status: number; ms: number; cache: string | null; images: number; error?: string };
export type WarmOptions = {
  fetchImpl?: typeof fetch;
  concurrency?: number;
  /** Stop starting new requests after this epoch-ms time (keeps a serverless function under its limit). */
  deadline?: number;
  timeoutMs?: number;
  /** Also request the optimised images each page preloads (its hero). */
  images?: boolean;
  now?: () => number;
};

/** Runs `fn` over `items` with at most `limit` in flight; stops picking new items once `shouldStop()` is true. */
export async function mapLimit<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>, shouldStop: () => boolean = () => false): Promise<R[]> {
  const out: R[] = [];
  let next = 0;
  const worker = async () => {
    while (next < items.length && !shouldStop()) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker));
  return out.filter((x) => x !== undefined);
}

const decode = (s: string) => s.replace(/&amp;/g, "&");

/**
 * Same-origin optimiser URLs a page preloads (`<link rel="preload" as="image" imageSrcSet=…>`),
 * i.e. the hero that decides the page's LCP. Only /_next/image URLs: rendition files are static.
 */
export function preloadedImageUrls(html: string, origin: string): string[] {
  const urls = new Set<string>();
  for (const tag of html.match(/<link\b[^>]*rel="preload"[^>]*>/gi) ?? []) {
    if (!/\bas="image"/i.test(tag)) continue;
    const set = /imagesrcset="([^"]+)"/i.exec(tag)?.[1];
    const href = /\bhref="([^"]+)"/i.exec(tag)?.[1];
    const candidates = set ? decode(set).split(",").map((c) => c.trim().split(/\s+/)[0]) : href ? [decode(href)] : [];
    for (const c of candidates) if (c.startsWith("/_next/image?")) urls.add(origin + c);
  }
  return [...urls];
}

/** One GET with a timeout; the body is read fully so the CDN stores the response. */
async function hit(url: string, fetchImpl: typeof fetch, timeoutMs: number, now: () => number) {
  const t = now();
  try {
    const res = await fetchImpl(url, { headers: { "user-agent": "VacayOutCacheWarmer/1.0" }, signal: AbortSignal.timeout(timeoutMs) });
    const body = await res.text();
    return { status: res.status, ms: now() - t, cache: res.headers.get("x-vercel-cache"), body };
  } catch (err) {
    return { status: 0, ms: now() - t, cache: null, body: "", error: err instanceof Error ? err.message : String(err) };
  }
}

/** Warms `paths` on `origin`. Never throws; per-URL failures are reported in the results. */
export async function warmPaths(origin: string, paths: readonly string[], opts: WarmOptions = {}): Promise<WarmResult[]> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const now = opts.now ?? Date.now;
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const base = origin.replace(/\/$/, "");
  const stop = () => opts.deadline !== undefined && now() >= opts.deadline;
  return mapLimit(paths, opts.concurrency ?? 4, async (p) => {
    const url = base + p;
    const page = await hit(url, fetchImpl, timeoutMs, now);
    let images = 0;
    if (opts.images !== false && page.status === 200) {
      for (const img of preloadedImageUrls(page.body, base)) {
        if (stop()) break;
        await hit(img, fetchImpl, timeoutMs, now);
        images++;
      }
    }
    return { url, status: page.status, ms: page.ms, cache: page.cache, images, ...(page.error ? { error: page.error } : {}) };
  }, stop);
}

/** Short summary for logs and API responses. */
export function summarise(results: WarmResult[]) {
  const failed = results.filter((r) => r.status !== 200);
  const ms = results.map((r) => r.ms).sort((a, b) => a - b);
  return {
    pages: results.length,
    ok: results.length - failed.length,
    images: results.reduce((s, r) => s + r.images, 0),
    p50ms: ms[Math.floor(ms.length / 2)] ?? 0,
    maxMs: ms[ms.length - 1] ?? 0,
    failed: failed.slice(0, 20).map((r) => ({ url: r.url, status: r.status, error: r.error })),
  };
}
