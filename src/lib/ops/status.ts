import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { appErrors, auditLog, authFailures, chatRequests, emailTokens, publishJobs, researchRuns, usageCounters, users } from "@/lib/db/schema";
import { budgetStatus } from "@/lib/research/service";
import { chatBudget } from "@/lib/chat/quota";
import { sendEmail, escapeHtml } from "@/lib/email";

/** Which integrations are configured — names only, never values. */
export function configChecks() {
  const has = (k: string) => Boolean(process.env[k]);
  return [
    { name: "Database (DATABASE_URL)", ok: has("DATABASE_URL"), required: true },
    { name: "Sign-in secret (AUTH_SECRET)", ok: has("AUTH_SECRET"), required: true },
    { name: "Site URL (NEXT_PUBLIC_SITE_URL)", ok: has("NEXT_PUBLIC_SITE_URL"), required: true },
    { name: "Image storage (BLOB_STORE_ID or BLOB_READ_WRITE_TOKEN)", ok: has("BLOB_STORE_ID") || has("BLOB_READ_WRITE_TOKEN"), required: true },
    { name: "Scheduled jobs (CRON_SECRET)", ok: has("CRON_SECRET"), required: true },
    { name: "OpenAI (OPENAI_API_KEY)", ok: has("OPENAI_API_KEY"), required: true },
    { name: "Email (RESEND_API_KEY + EMAIL_FROM)", ok: has("RESEND_API_KEY") && has("EMAIL_FROM"), required: true },
    { name: "Google sign-in (AUTH_GOOGLE_ID/SECRET)", ok: has("AUTH_GOOGLE_ID") && has("AUTH_GOOGLE_SECRET"), required: false },
    { name: "Upstash Redis (rate limits)", ok: has("UPSTASH_REDIS_REST_URL") && has("UPSTASH_REDIS_REST_TOKEN"), required: false },
    { name: "Booking affiliate IDs", ok: has("BOOKING_AFFILIATE_ID") || has("GETYOURGUIDE_PARTNER_ID"), required: false },
  ];
}

/** Compares migrations in ./drizzle with those applied to this database. */
export async function migrationStatus() {
  try {
    const journal = JSON.parse(await readFile(path.join(process.cwd(), "drizzle", "meta", "_journal.json"), "utf8")) as { entries: unknown[] };
    const rows = await getDb().execute(sql`select count(*)::int as n from drizzle.__drizzle_migrations`);
    const applied = Number((rows.rows[0] as { n: number }).n);
    return { expected: journal.entries.length, applied };
  } catch {
    return null;
  }
}

export async function systemSummary() {
  const db = getDb();
  const day = sql`now() - interval '1 day'`;
  const week = sql`now() - interval '7 days'`;
  const [[errors24h], [chatErrors24h], [failedJobs], [failedRuns7d], recentErrors, research, chat] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(appErrors).where(gte(appErrors.at, day)),
    db.select({ n: sql<number>`count(*)::int` }).from(chatRequests).where(and(gte(chatRequests.at, day), eq(chatRequests.outcome, "error"))),
    db.select({ n: sql<number>`count(*)::int` }).from(publishJobs).where(sql`${publishJobs.status} <> 'done'`),
    db.select({ n: sql<number>`count(*)::int` }).from(researchRuns).where(and(gte(researchRuns.createdAt, week), eq(researchRuns.status, "failed"))),
    db.select().from(appErrors).orderBy(desc(appErrors.at)).limit(50),
    budgetStatus(),
    chatBudget(),
  ]);
  return {
    errors24h: errors24h.n,
    chatErrors24h: chatErrors24h.n,
    failedJobs: failedJobs.n,
    failedRuns7d: failedRuns7d.n,
    recentErrors,
    researchUse: research.budgetMicro ? (research.spent + research.reserved) / research.budgetMicro : 0,
    chatUse: chat.budgetMicro ? chat.spent / chat.budgetMicro : 0,
  };
}

/** Daily housekeeping: deletes data that has no further use. */
export async function cleanup() {
  const db = getDb();
  const now = new Date();
  await db.delete(usageCounters).where(lt(usageCounters.expiresAt, now));
  await db.delete(emailTokens).where(lt(emailTokens.expiresAt, new Date(now.getTime() - 7 * 86_400_000)));
  await db.delete(authFailures).where(lt(authFailures.at, new Date(now.getTime() - 86_400_000)));
  await db.delete(appErrors).where(lt(appErrors.at, new Date(now.getTime() - 30 * 86_400_000)));
}

/** Emails active admins only when something needs attention, and at most once a day (driven by the daily cron). */
export async function sendDigestIfNeeded() {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return { sent: false, reason: "email not configured" };
  const s = await systemSummary();
  const problems = [
    s.errors24h ? `${s.errors24h} server error(s) in the last 24 hours` : null,
    s.chatErrors24h ? `${s.chatErrors24h} chat answer(s) failed in the last 24 hours` : null,
    s.failedJobs ? `${s.failedJobs} page refresh(es) still pending or failed` : null,
    s.failedRuns7d ? `${s.failedRuns7d} research run(s) failed this week` : null,
    s.researchUse >= 0.8 ? `Research budget ${Math.round(s.researchUse * 100)}% used this month` : null,
    s.chatUse >= 0.8 ? `Chat budget ${Math.round(s.chatUse * 100)}% used this month` : null,
  ].filter((p): p is string => Boolean(p));
  if (!problems.length) return { sent: false, reason: "nothing to report" };
  const admins = await getDb().select({ email: users.email }).from(users).where(and(eq(users.role, "admin"), eq(users.active, true)));
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  for (const a of admins) {
    await sendEmail({
      to: a.email,
      subject: `VacayOut: ${problems.length} thing(s) need attention`,
      text: `${problems.map((p) => `- ${p}`).join("\n")}\n\nDetails: ${site}/admin/system`,
      html: `<ul>${problems.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul><p><a href="${escapeHtml(site)}/admin/system">Open the System page</a></p>`,
    });
  }
  await getDb().insert(auditLog).values({ action: "ops.digest", entityType: "settings", details: { problems } });
  return { sent: true, problems };
}
