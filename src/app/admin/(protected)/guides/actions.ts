"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/admin/action-state";
import { isUniqueViolation } from "@/lib/admin/action-state";
import { requireUser } from "@/lib/auth/guard";
import { validateGuide } from "@/lib/guides/body";
import { publishGuide, saveGuide, unpublishGuide } from "@/lib/guides/service";

const UUID = /^[0-9a-f-]{36}$/;

export async function saveGuideAction(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!UUID.test(id)) return { ok: false, message: "Unknown guide." };
  let body: unknown;
  try {
    body = JSON.parse(String(form.get("body") ?? ""));
  } catch {
    return { ok: false, message: "The guide body isn’t valid JSON." };
  }
  const v = validateGuide({
    slug: String(form.get("slug") ?? "").trim(),
    title: String(form.get("title") ?? ""),
    summary: String(form.get("summary") ?? ""),
    tripTypes: form.getAll("tripTypes").map(String),
    seoTitle: String(form.get("seoTitle") ?? ""),
    seoDescription: String(form.get("seoDescription") ?? ""),
    body,
  });
  if (!v.ok) return { ok: false, message: v.error };
  const placeIds = form.getAll("places").map(String).filter((x) => UUID.test(x)).slice(0, 50);
  try {
    const r = await saveGuide(id, v.value, placeIds, user.id);
    revalidatePath(`/admin/guides/${id}`);
    return r.ok ? { ok: true, message: "Saved. Publish again to update the live guide." } : r;
  } catch (err) {
    if (isUniqueViolation(err)) return { ok: false, message: "Another guide already uses that URL slug." };
    throw err;
  }
}

export async function publishGuideAction(id: string): Promise<ActionState> {
  const user = await requireUser();
  if (!UUID.test(id)) return { ok: false, message: "Unknown guide." };
  const r = await publishGuide(id, user.id);
  revalidatePath(`/admin/guides/${id}`);
  revalidatePath("/admin/guides");
  return r.ok ? { ok: true, message: "Published." } : r;
}

export async function unpublishGuideAction(id: string): Promise<ActionState> {
  const user = await requireUser();
  if (!UUID.test(id)) return { ok: false, message: "Unknown guide." };
  const r = await unpublishGuide(id, user.id);
  revalidatePath(`/admin/guides/${id}`);
  revalidatePath("/admin/guides");
  return r.ok ? { ok: true, message: "Unpublished — it’s a draft again." } : r;
}
