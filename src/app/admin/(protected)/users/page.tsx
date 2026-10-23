import Link from "next/link";
import { asc } from "drizzle-orm";
import { CreateUserForm } from "@/components/admin/create-user-form";
import { requireAdmin } from "@/lib/auth/guard";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { setUserActiveAction } from "./actions";

export default async function UsersPage() {
  const me = await requireAdmin();
  const rows = await getDb()
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, active: users.active, lastLoginAt: users.lastLoginAt })
    .from(users)
    .orderBy(asc(users.name));
  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/admin/settings" className="text-sm text-muted hover:underline">← Settings</Link>
      <h1 className="font-serif text-2xl font-medium">Team</h1>
      <table className="w-full overflow-hidden rounded-xl border border-line bg-white text-sm">
        <thead className="bg-sand text-left"><tr><th className="p-3">Name</th><th className="p-3">Role</th><th className="p-3">Last sign-in</th><th className="p-3" /></tr></thead>
        <tbody>
          {rows.map((u) => (
            <tr key={u.id} className="border-t border-line">
              <td className="p-3"><span className="font-medium">{u.name}</span><br /><span className="text-muted">{u.email}</span></td>
              <td className="p-3">{u.role}{u.active ? "" : " (deactivated)"}</td>
              <td className="p-3 text-muted">{u.lastLoginAt ? u.lastLoginAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Never"}</td>
              <td className="p-3 text-right">
                {u.id !== me.id ? (
                  <form action={setUserActiveAction.bind(null, u.id, !u.active)}>
                    <button type="submit" className="text-sm font-semibold underline underline-offset-4">{u.active ? "Deactivate" : "Reactivate"}</button>
                  </form>
                ) : <span className="text-xs text-muted">You</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div>
        <h2 className="font-semibold">Add a user</h2>
        <div className="mt-3"><CreateUserForm /></div>
      </div>
    </div>
  );
}
