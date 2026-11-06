/**
 * Refreshes cached pages on the live site right after publishing from a script
 * (Next can't revalidate from outside the app). Processes pending publish jobs too.
 *
 *   CRON_SECRET=… npx tsx --env-file-if-exists=.env.local scripts/refresh-cache.mts https://vacayout-india.vercel.app /india/kerala /india/kerala/varkala
 */
const [origin, ...paths] = process.argv.slice(2);
const secret = process.env.CRON_SECRET;
if (!origin || !/^https?:\/\//.test(origin) || !secret) {
  console.error("Usage: CRON_SECRET=… tsx scripts/refresh-cache.mts <origin> [/path …]");
  process.exit(1);
}
const res = await fetch(`${origin.replace(/\/$/, "")}/api/cache/refresh`, {
  method: "POST",
  headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
  body: JSON.stringify({ paths, warm: true }),
});
console.log(res.status, await res.text());
if (!res.ok) process.exit(1);
