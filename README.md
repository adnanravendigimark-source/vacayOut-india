# VacayOut (vacayout.in)

India travel discovery and planning. The database is the source of truth: admins publish
destinations, and the public pages, `/india` directory, homepage, sitemap and AI search
all read the same published data.

## Setup

1. `npm install`
2. Add to `.env` (see `.env.example`): `DATABASE_URL` (Neon, pooled), `AUTH_SECRET`,
   `BLOB_READ_WRITE_TOKEN` (Vercel Blob), `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL`, `OPENAI_API_KEY` (research).
3. `npm run db:migrate` — applies `drizzle/` migrations.
4. `npm run admin:create -- --email you@example.com --name "Your Name"` — first admin (password prompted).
5. `npm run dev`, then sign in at `/admin/login`.

## Checks

- `npm run lint`, `npm run typecheck`, `npm test` (unit), `npm run build`
- `npm run test:db` — publish and research integration tests. Needs `TEST_DATABASE_URL` pointing at a
  **local or `*_test` database** (it truncates tables; it refuses anything else).

## How publishing works

- Places form one hierarchy (state → city → attraction). Sections are drafted and approved
  per section; only approved sections are published.
- Publish (`src/lib/publish/service.ts`) runs one transaction: published snapshot, status,
  search index, refresh job, audit entry. Cached pages are refreshed after commit; failures
  are retried by the daily cron (`vercel.json`) or the admin "Retry now" button.
- Quality gates block thin pages; thin places can be shown inside their parent's page.
- Published URLs are locked; changing a slug after unpublishing adds a permanent redirect.

## How research works

- On a place's admin page, **Research** runs OpenAI web search (`OPENAI_RESEARCH_MODEL`, default
  `gpt-5.5`). Each claim must quote a page the search tool actually returned or opened; any other
  source is discarded.
- The server then opens each source itself (`src/lib/research/safe-fetch.ts`: public addresses
  only, size and time limits), confirms the quote is on the page, and a cheaper model
  (`OPENAI_CHECK_MODEL`, default `gpt-5.4-mini`) judges whether the quote supports the claim.
- Each finding is labelled unsupported / single source / corroborated (2+ independent sites) /
  conflicting, with source authority, the page's own date and the retrieval date. Prices, hours
  and schedules are flagged as time-sensitive. Nothing is "verified" automatically.
- Admins approve (optionally editing), or reject. Approving an unsupported or conflicting
  finding needs a note. Findings never change sections, published pages or AI answers by
  themselves.
- **Discover places** (states, regions, cities, towns) suggests places with sources and flags
  likely duplicates; adding one creates an empty draft.
- Spending: a monthly budget (default $20, editable on `/admin/research`), $1.50 held per run
  while it runs, at most one run per place and three at once. Costs are estimates from token
  usage and list prices (`src/lib/research/cost.ts`).

## Creating a destination (one click)

- **Overview → + Create destination.** Choose a state or union territory and type the place, or
  search by name (OpenStreetMap finds the state). Duplicates are caught while you type.
- **Generate destination** starts a server-side job (Vercel Workflows, `src/workflows/`): map
  location → research → nearby places → each section → summary/SEO → a Commons photo → done.
  The progress page can be closed; the job keeps running on the server.
- Every paid step is a row in `research_runs` (one per job and step). Before a call it holds
  money from the monthly budget under a database lock; after the call the actual cost replaces
  the hold. A retried step reuses its hold, and research reuses the same OpenAI background
  request (its id is saved before waiting), so retries don't pay twice. If the budget is used
  up the job waits (up to 48 hours) instead of overspending.
- Drafts use facts whose sources were checked (not rejected, not unsupported), and every line
  must cite them. Text you edited is never overwritten: a regeneration becomes a suggestion.
- **Review** (`/admin/places/[id]`): each section shows Approved / Ready / Needs review /
  Missing information, the facts it cites (and which other sections share them), and an
  editor. **Approve section** also approves its cited facts that a checked source supports;
  conflicting or unsupported facts must be decided in Sources first. Rejecting or reopening a
  fact sends every approved section that cites it back to draft. Publishing is still blocked
  by the existing checks plus any section citing a fact that isn't approved.
- A job that stops reporting for `GENERATION_STALL_MINUTES` (default 20) shows **Resume**;
  the daily cron also resumes stalled jobs. Finished steps are not repeated.
- **Hosting:** Vercel Workflows needs no extra setup on Vercel, but a commercial site needs the
  **Pro** plan. Workflow usage is about 40–60 events per destination (well under a cent);
  the AI calls are about $0.60–0.80 per destination.

## Images

- The job imports the first freely licensed Wikimedia Commons photo whose title or description
  names the place. Only public domain, CC0, CC BY and CC BY-SA files (≥ 800 px) are allowed; the
  licence is re-checked on the server, files come only from Wikimedia hosts, and author,
  licence (with link) and file page are shown on the page.
- If none fits, the Images tab offers an optional **AI illustration** (`OPENAI_IMAGE_MODEL`,
  charged to the same budget). It is labelled "AI-generated illustration — not a photograph of
  the place" wherever it appears, and is never used in search-engine or social-preview data.

## How the chat works

- `/api/chat` (`src/app/api/chat/route.ts`): same-origin only; checks the visitor's allowance
  (`src/lib/chat/quota.ts`) before any AI call. Visitors get 5 free messages (httpOnly cookie plus a
  per-network backstop), then the sign-up panel opens; signed-in travellers get a daily allowance.
- Each message (`src/lib/chat/live/agent.ts`): a cheap routing call decides if it's about travel in
  India (anything else is declined) and resolves follow-ups using the trip memory → published guides
  are looked up (live versions only) → live web research runs in parallel when the guide doesn't
  cover the question, cached 3–14 days (`web_research`) → the answer is written as cards citing
  G/W refs; uncited cards and unsupported numbers are dropped (`compose.ts`).
- Server-written cards: coverage notices, the destination card (photo + credit + guide link) and
  the sources list. Web research is labelled unreviewed and listed on `/admin/chat` for review.
- Spending: chat has its own monthly budget (default $30, `/admin/chat`). Live research has a daily
  per-visitor quota; cached answers don't count.
- Travellers (`travellers` table) sign up with email + password (verified by an emailed link via
  Resend; printed to the terminal in `npm run dev` without a key) or Google. Traveller sessions
  can't open the admin; staff sessions end after 8 hours.

## Maps, booking links and monitoring

- Maps: OpenStreetMap tiles via Leaflet (`src/components/map/place-map.tsx`), loaded only in the
  browser. Destination pages show the place, its published sub-places and related places that have
  coordinates; chat plans show the same as a map card. Admins fill coordinates with **Find
  coordinates** (OpenStreetMap Nominatim, max 1 request/second).
- Booking: links open the provider's own search (Booking.com, GetYourGuide, IRCTC, redBus) —
  we never show prices or availability. Optional affiliate IDs add a disclosure. Hosts are
  allow-listed in `src/lib/chat/constants.ts`.
- Monitoring: server errors are logged as JSON and stored (`app_errors`) via `src/instrumentation.ts`;
  `/admin/system` shows errors, failed jobs and runs, budget use, setup checks and migration status.
  `/api/health` returns 200 when the database is reachable (point an uptime monitor at it). The daily
  cron also clears expired data and emails admins when something needs attention.

## Where things are

- `src/lib/db/schema.ts`, `drizzle/` — schema and migrations (never `drizzle-kit push` in production)
- `src/app/admin/` — admin (login, places, images, related places, users, activity)
- `src/app/india/` — directory and destination pages; `src/components/place/place-page.tsx`
- `src/lib/places/` — sections, publish checks, queries
- `src/lib/research/` — research engine, source checks, costs; `src/components/admin/research/` — review UI
- `src/lib/media/` — image type checks and storage (Vercel Blob; `public/uploads` in `next dev` only)
- `src/app/api/chat`, `src/lib/chat/` — chat; `src/app/account/` — traveller sign-up, email verification

## Not built yet

See the gap list in the latest handover: deployment, legal pages, password reset, account deletion.
# vacayOut-india
