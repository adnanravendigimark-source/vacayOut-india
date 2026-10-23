"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/guard";
import { hashPassword, passwordProblem } from "@/lib/auth/password";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { isUniqueViolation, type ActionState } from "@/lib/admin/action-state";

const createSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(254),
  role: z.enum(["admin", "editor"]),
  password: z.string(),
});

export async function createUserAction(_: ActionState, form: FormData): Promise<ActionState> {
  const me = await requireAdmin();
  const parsed = createSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." };
  const problem = passwordProblem(parsed.data.password);
  if (problem) return { ok: false, message: problem };
  try {
    const [row] = await getDb()
      .insert(users)
      .values({ name: parsed.data.name, email: parsed.data.email, role: parsed.data.role, passwordHash: await hashPassword(parsed.data.password) })
      .returning({ id: users.id });
    await audit({ actorId: me.id, action: "user.create", entityType: "user", entityId: row.id, details: { email: parsed.data.email, role: parsed.data.role } });
  } catch (err) {
    if (isUniqueViolation(err)) return { ok: false, message: "A user with that email already exists." };
    throw err;
  }
  revalidatePath("/admin/users");
  return { ok: true, message: "User created. Share the password with them privately." };
}

export async function setUserActiveAction(userId: string, active: boolean): Promise<void> {
  const me = await requireAdmin();
  if (!z.string().uuid().safeParse(userId).success || userId === me.id) return; // can't lock yourself out
  await getDb().update(users).set({ active, updatedAt: new Date() }).where(eq(users.id, userId));
  await audit({ actorId: me.id, action: active ? "user.activate" : "user.deactivate", entityType: "user", entityId: userId });
  revalidatePath("/admin/users");
}
