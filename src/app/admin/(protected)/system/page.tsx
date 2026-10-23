import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guard";
import { configChecks, migrationStatus, systemSummary } from "@/lib/ops/status";

export const metadata = { title: "System" };

export default async function SystemPage() {
  await requireAdmin();
  const [checks, migrations, s] = await Promise.all([configChecks(), migrationStatus(), systemSummary()]);
  const fmt = (d: Date) => d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const tiles: [string, string, boolean][] = [
    ["Server errors (24 h)", String(s.errors24h), s.errors24h > 0],
    ["Failed chat answers (24 h)", String(s.chatErrors24h), s.chatErrors24h > 0],
    ["Page refreshes pending", String(s.failedJobs), s.failedJobs > 0],
    ["Failed research runs (7 days)", String(s.failedRuns7d), s.failedRuns7d > 0],
    ["Research budget used", pct(s.researchUse), s.researchUse >= 0.8],
    ["Chat budget used", pct(s.chatUse), s.chatUse >= 0.8],
  ];
  return (
    <div className="max-w-5xl space-y-6">
      <Link href="/admin/settings" className="text-sm text-muted hover:underline">← Settings</Link>
      <h1 className="font-serif text-2xl font-medium">System</h1>
      <section className="grid gap-3 sm:grid-cols-3">
        {tiles.map(([k, v, warn]) => (
          <div key={k} className={`rounded-xl border p-4 ${warn ? "border-amber-300 bg-amber-50" : "border-line bg-white"}`}>
            <p className="text-xs text-muted">{k}</p>
            <p className="mt-1 text-xl font-semibold">{v}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-line bg-white p-5 text-sm">
        <h2 className="font-semibold">Setup</h2>
        <ul className="mt-3 space-y-1">
          {checks.map((c) => (
            <li key={c.name} className="flex items-center gap-2">
              <span aria-hidden className={c.ok ? "text-emerald-700" : c.required ? "text-red-700" : "text-muted"}>{c.ok ? "✓" : c.required ? "✕" : "–"}</span>
              <span>{c.name}</span>
              {!c.ok ? <span className="text-xs text-muted">{c.required ? "missing" : "optional, not set"}</span> : null}
            </li>
          ))}
          <li className="flex items-center gap-2">
            <span aria-hidden className={migrations && migrations.applied >= migrations.expected ? "text-emerald-700" : "text-red-700"}>{migrations && migrations.applied >= migrations.expected ? "✓" : "✕"}</span>
            <span>Database migrations</span>
            <span className="text-xs text-muted">{migrations ? `${migrations.applied} of ${migrations.expected} applied${migrations.applied < migrations.expected ? " — run npm run db:migrate" : ""}` : "couldn’t check"}</span>
          </li>
        </ul>
        <p className="mt-3 text-xs text-muted">
          Uptime monitors can watch <code>/api/health</code> (returns 200 when the database is reachable). A daily job retries page refreshes, clears expired data and emails admins when something above needs attention.
        </p>
      </section>

      <section className="rounded-xl border border-line bg-white p-5">
        <h2 className="font-semibold">Recent server errors</h2>
        {s.recentErrors.length ? (
          <ul className="mt-3 space-y-2 text-sm">
            {s.recentErrors.map((e) => (
              <li key={e.id} className="rounded-lg bg-canvas px-3 py-2">
                <p className="text-xs text-muted">{fmt(e.at)} · {e.source}{e.path ? ` · ${e.path}` : ""}{e.digest ? ` · digest ${e.digest}` : ""}</p>
                <p className="mt-0.5 break-words font-mono text-xs">{e.message}</p>
              </li>
            ))}
          </ul>
        ) : <p className="mt-2 text-sm text-muted">No errors recorded in the last 30 days.</p>}
      </section>
    </div>
  );
}
