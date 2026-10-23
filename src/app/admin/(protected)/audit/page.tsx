import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { auditLog, users } from "@/lib/db/schema";

export default async function AuditPage() {
  const rows = await getDb()
    .select({ id: auditLog.id, action: auditLog.action, entityType: auditLog.entityType, entityId: auditLog.entityId, details: auditLog.details, at: auditLog.at, who: users.name })
    .from(auditLog)
    .leftJoin(users, eq(users.id, auditLog.actorId))
    .orderBy(desc(auditLog.at))
    .limit(200);
  return (
    <div className="max-w-4xl">
      <Link href="/admin/settings" className="text-sm text-muted hover:underline">← Settings</Link>
      <h1 className="font-serif text-2xl font-medium">Activity</h1>
      <ul className="mt-5 divide-y divide-line rounded-xl border border-line bg-white text-sm">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap gap-x-3 px-4 py-2.5">
            <span className="text-muted">{r.at.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
            <span className="font-medium">{r.who ?? "System"}</span>
            <span>{r.action}</span>
            {r.details ? <span className="truncate text-muted">{JSON.stringify(r.details)}</span> : null}
          </li>
        ))}
        {rows.length === 0 ? <li className="px-4 py-6 text-center text-muted">No activity yet.</li> : null}
      </ul>
    </div>
  );
}
