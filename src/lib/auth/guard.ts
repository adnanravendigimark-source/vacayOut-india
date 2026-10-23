import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { auth, STAFF_SESSION_SECONDS } from "./index";

export type AdminUser = { id: string; name: string; email: string; role: "admin" | "editor" };

/** The signed-in, still-active user — re-read from the database on every request. */
export const currentUser = cache(async (): Promise<AdminUser | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id || session.user.kind !== "staff") return null;
  // Staff sessions end 8 hours after sign-in even though the cookie lives longer.
  if (session.user.loginAt && Date.now() / 1000 - session.user.loginAt > STAFF_SESSION_SECONDS) return null;
  const [u] = await getDb()
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, active: users.active })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  if (!u || !u.active) return null;
  return { id: u.id, name: u.name, email: u.email, role: u.role };
});

/** Use at the top of every admin page AND every admin server action. */
export async function requireUser(): Promise<AdminUser> {
  const u = await currentUser();
  if (!u) redirect("/admin/login");
  return u;
}

export async function requireAdmin(): Promise<AdminUser> {
  const u = await requireUser();
  if (u.role !== "admin") redirect("/admin?error=forbidden");
  return u;
}
