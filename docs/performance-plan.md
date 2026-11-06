# Performance plan — "encode once, serve from the edge, warm before the visitor"

Status: Phase 1 implemented (this change). Phases 2–4 are the roadmap.

## 1. What we measured (live site, Nov 2026)

| Thing | Measured | Verdict |
|---|---|---|
| HTML, warm (CDN `x-vercel-cache: HIT`) | TTFB 0.1–0.25 s | Fine |
| HTML, cold (first visit after deploy) | 0.3–0.8 s, home 2.2 s | Slow, and every deploy makes the whole site cold |
| Client page switch | 450–600 ms | Mostly waiting on cold RSC + images |
| Photo originals in Blob | 600 KB – 2.8 MB, one 39 MB | **Main cause** |
| `/_next/image` on a cache miss | ~0.7 s+ per image (download original, resize) | `/itineraries` showed 26 misses on one load |
| Hero preload images | 249–477 KB | Too big for the LCP image |
| State page HTML | ~550 KB (RSC payload 330 KB, assistant pack ~34 KB) | Phase 3 |
| JS | ~1 MB decoded, 334 KB transferred on home | Phase 3 |
| Home hero video | 3.2 MB, already gated (wide screen, no data-saver, no reduced motion) | OK |

## 2. Root causes

1. **Images are resized on demand, from huge originals.** Each new width of each photo makes the optimiser fetch a multi-MB file and resize it while the visitor waits. Optimiser caches are per-deploy-region and get evicted, so this repeats.
2. **The page cache starts empty after every deploy.** `generateStaticParams` returns `[]`, so every page is rendered by its first visitor. Adding a state adds N more cold pages.
3. **Script publishing can't refresh pages.** `revalidatePath` only works inside Next. Pages published by seed scripts stayed stale until the 1 h timer or the 03:00 retry cron.

## 3. Target architecture (how Netflix-style delivery maps onto this app)

Netflix encodes every title once into a ladder of bitrates at ingest, pushes files to edge caches before people press play, and the player just picks a rung. Same three ideas here:

```
upload / import / AI image / seed script
        │
        ▼
storeImage()  ── sharp, once ──►  img/<place>/<id>/w384 · w640 · w828 · w1200 · w1920 .webp   (Blob, 1-year immutable cache)
        │                          URL saved in DB = largest rung → URL alone says which rungs exist
        ▼
<Image> (src/components/media/image.tsx)
        │  rendition URL? → custom loader picks the nearest rung: plain CDN file, no optimiser
        │  anything else? → default next/image optimiser (unchanged behaviour)
        ▼
ISR HTML on Vercel CDN  ◄── warmer (daily cron + after deploy + after script publish) requests every sitemap page
                             and its preloaded hero image, so the first real visitor gets a HIT
```

### Module boundaries (single responsibility, dependencies point inward)

| Module | Responsibility | I/O? |
|---|---|---|
| `lib/media/renditions.ts` | The ladder: widths, URL format, parse, pick width, folder naming | Pure — runs in browser, server, scripts; unit-tested |
| `lib/media/encode.ts` | Decode once, auto-rotate, strip metadata, write WebP ladder, never upscale, bomb guard | CPU only |
| `lib/media/storage.ts` | `storeImage` / `removeImage`: the single choke point for every image write | Blob / local disk |
| `components/media/image.tsx` | Drop-in `next/image` replacement; chooses loader per URL | Client |
| `lib/cache/paths.ts` | Which public URLs exist (shared by sitemap and warmer — one source of truth) | Pure |
| `lib/cache/warm.ts` | Bounded-concurrency warmer with deadline; fetch injected | Pure + injected fetch |
| `lib/cache/targets.ts` | Reads the published list from the DB, picks the origin | DB |
| `lib/ops/bearer.ts` | Timing-safe `Authorization: Bearer` check | Pure |
| `api/cron/warm`, `api/cache/refresh` | Thin HTTP adapters over the above | — |

Open/closed: a new state needs **no code** — its pages appear in the sitemap, its photos go through `storeImage`, and the warmer picks it up. Adding AVIF later = a new rung format in `renditions.ts` + `encode.ts`; callers don't change.

## 4. Phase 1 — shipped in this change

- **Ingest-time renditions** in `storeImage` (admin uploads, Commons import, AI images and the seed scripts all go through it). Falls back to storing the original if sharp can't decode.
- **`<Image>` wrapper** swapped into all 24 `next/image` imports. A global `loaderFile` was rejected: it disables `/_next/image` for every image, which would break old uploads and `/public` files.
- **Backfill** `scripts/backfill-renditions.mts`: dry run by default; `--apply`, `--limit=N`, `--delete-old`; resumable; converts each file once even if several media rows share it; rewrites the URL inside jsonb snapshots/sections/plans/guides in one transaction per image.
- **Cache warmer**: `/api/cron/warm` (daily 03:30 UTC, 240 s budget) and `scripts/warm-cache.mts <origin>` (run after each deploy; reads `/sitemap.xml`).
- **On-demand refresh for scripts**: `POST /api/cache/refresh` (`CRON_SECRET`) revalidates the given paths + hubs, runs pending publish jobs, then warms them. Wrapper: `scripts/refresh-cache.mts`.
- `sharp` pinned as a direct dependency (was only transitive via Next).
- **Bug fix found by the warmer:** 6 itineraries and 4 guides had snapshots without a `slug`, so the live sitemap, `/itineraries` (18 links) and `/travel-guides` (12 links) pointed at `/…/undefined` (404). Lists now take the slug from the row, which is the key the detail page looks up.

## 5. Roadmap

**Phase 2 — no cold pages, ever**
- GitHub Action on `deployment_status: success` → `node scripts/warm-cache.mts $URL`. Removes the manual step.
- Seed scripts end with `refresh-cache` so new states are live and warm the moment they're published.
- `generateStaticParams` returns the top ~50 pages (hubs + states) so they're built at deploy, not on visit. Keep the rest ISR (build time stays flat as states grow).

**Phase 3 — smaller pages**
- Load the assistant pack (~34 KB per page) on first open of the assistant instead of inlining it in the RSC payload.
- Audit client components on state pages; move static parts to server components.
- Font subsets: drop Inter latin-ext unless needed; `display: swap`, preload only the body font.
- AVIF rung via `<picture>` once Blob storage cost is acceptable (~30 % smaller than WebP).

**Phase 4 — keep it fast (budgets in CI)**
- Playwright check on PRs: LCP < 1.5 s on a warm page, HTML < 300 KB, no image > 250 KB, no `/_next/image` request for rendition URLs.
- Daily warm-cron summary (`p50ms`, `failed`) to the error log; alert when failed > 0 or p50 > 1 s.

## 6. Risks

| Risk | Mitigation |
|---|---|
| Upload slower (encode ~0.5–2 s per photo) and memory spikes | Sequential encode; `limitInputPixels` 120 MP; server action body limit already raised |
| Blob storage grows (up to 5 WebP files per photo, plus the old original) | WebP rungs are far smaller than the JPG originals; originals can be deleted with `--delete-old` once the new images are checked |
| jsonb text replace hits the wrong text | Exact full-URL match; URLs contain a UUID; one transaction per image; dry run first |
| Warmer load on the DB | Concurrency 4, deadline, runs off-peak; pages served from cache after first hit |
| Refresh endpoint abuse | Bearer secret, timing-safe compare, path allowlist regex, max 200 paths |

## 7. Deploy steps

1. Make sure `CRON_SECRET` is set in Vercel (Production). Commit + push; Vercel deploys and registers the new cron.
2. Warm: `npx tsx scripts/warm-cache.mts https://vacayout-india.vercel.app`
3. Backfill dry run (with production `DATABASE_URL` + Blob token in `.env.local`):
   `npx tsx --env-file-if-exists=.env.local --conditions=react-server scripts/backfill-renditions.mts`
4. Trial: same with `--apply --limit=5`; open the pages and check images. Then `--apply` for the rest.
5. Refresh pages: `CRON_SECRET=… npx tsx scripts/refresh-cache.mts https://vacayout-india.vercel.app /india`
6. Originals are kept by default as a rollback. To drop them, pass `--delete-old` together with `--apply` (it deletes each original right after its URL is switched).
