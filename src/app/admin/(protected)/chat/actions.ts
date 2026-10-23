"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireAdmin, requireUser } from "@/lib/auth/guard";
import { getDb } from "@/lib/db";
import { webResearch } from "@/lib/db/schema";
import type { ActionState } from "@/lib/admin/action-state";
import { setChatBudgetUsd } from "@/lib/chat/quota";

export async function updateChatBudgetAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  const v = z.coerce.number().min(0).max(10_000).safeParse(form.get("budget"));
  if (!v.success) return { ok: false, message: "Enter a monthly budget between $0 and $10,000." };
  await setChatBudgetUsd(Math.round(v.data * 100) / 100, user.id);
  await audit({ actorId: user.id, action: "chat.budget", entityType: "settings", details: { monthlyBudgetUsd: v.data } });
  revalidatePath("/admin/chat");
  return { ok: true, message: "Budget saved." };
}

/** Marks chat web research as reviewed or dismissed. This never changes guides; it's a to-do list. */
export async function reviewWebResearchAction(id: string, decision: "reviewed" | "dismissed" | "new") {
  const user = await requireUser();
  if (!z.string().uuid().safeParse(id).success || !["reviewed", "dismissed", "new"].includes(decision)) return;
  await getDb()
    .update(webResearch)
    .set({ review: decision, reviewedBy: decision === "new" ? null : user.id, reviewedAt: decision === "new" ? null : new Date() })
    .where(eq(webResearch.id, id));
  revalidatePath("/admin/chat");
}
