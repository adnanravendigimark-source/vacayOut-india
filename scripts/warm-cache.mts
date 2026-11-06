/**
 * Warms the CDN after a deploy (or any time): requests every URL in the live sitemap,
 * plus the optimised hero images those pages preload.
 *
 *   npx tsx scripts/warm-cache.mts https://vacayout-india.vercel.app [--concurrency=4] [--no-images]
 *
 * Needs no database or secrets — it only reads public pages.
 */
const { summarise, warmPaths } = await import("@/lib/cache/warm");

const origin = (process.argv[2] ?? process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
if (!/^https?:\/\//.test(origin)) {
  console.error("Usage: tsx scripts/warm-cache.mts <origin>");
  process.exit(1);
}
const concurrency = Number(process.argv.find((a) => a.startsWith("--concurrency="))?.split("=")[1] ?? 4);
const images = !process.argv.includes("--no-images");

const xml = await (await fetch(`${origin}/sitemap.xml`)).text();
const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1].trim()).pathname);
console.log(`Warming ${paths.length} pages on ${origin}…`);
const t = Date.now();
const results = await warmPaths(origin, paths, { concurrency, images });
console.log(JSON.stringify({ seconds: Math.round((Date.now() - t) / 1000), ...summarise(results) }, null, 2));
