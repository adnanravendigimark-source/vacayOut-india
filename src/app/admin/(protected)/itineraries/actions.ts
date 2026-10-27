"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/admin/action-state";
import { isUniqueViolation } from "@/lib/admin/action-state";
import { requireUser } from "@/lib/auth/guard";
import { validateItinerary } from "@/lib/itineraries/plan";
import { publishItinerary, saveItinerary, unpublishItinerary } from "@/lib/itineraries/service";

const UUID = /^[0-9a-f-]{36}$/;

export async function saveItineraryAction(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!UUID.test(id)) return { ok: false, message: "Unknown itinerary." };
  let plan: unknown;
  try {
    plan = JSON.parse(String(form.get("plan") ?? ""));
  } catch {
    return { ok: false, message: "The plan isn’t valid JSON." };
  }
  const v = validateItinerary({
    slug: String(form.get("slug") ?? "").trim(),
    title: String(form.get("title") ?? ""),
    summary: String(form.get("summary") ?? ""),
    durationDays: Number(form.get("durationDays")),
    tripTypes: form.getAll("tripTypes").map(String),
    seoTitle: String(form.get("seoTitle") ?? ""),
    seoDescription: String(form.get("seoDescription") ?? ""),
    plan,
  });
  if (!v.ok) return { ok: false, message: v.error };
  try {
    const r = await saveItinerary(id, v.value, user.id);
    revalidatePath(`/admin/itineraries/${id}`);
    return r.ok ? { ok: true, message: "Saved. Publish again to update the live itinerary." } : r;
  } catch (err) {
    if (isUniqueViolation(err)) return { ok: false, message: "Another itinerary already uses that URL slug." };
    throw err;
  }
}

export async function publishItineraryAction(id: string): Promise<ActionState> {
  const user = await requireUser();
  if (!UUID.test(id)) return { ok: false, message: "Unknown itinerary." };
  const r = await publishItinerary(id, user.id);
  revalidatePath(`/admin/itineraries/${id}`);
  revalidatePath("/admin/itineraries");
  return r.ok ? { ok: true, message: "Published." } : r;
}

export async function unpublishItineraryAction(id: string): Promise<ActionState> {
  const user = await requireUser();
  if (!UUID.test(id)) return { ok: false, message: "Unknown itinerary." };
  const r = await unpublishItinerary(id, user.id);
  revalidatePath(`/admin/itineraries/${id}`);
  revalidatePath("/admin/itineraries");
  return r.ok ? { ok: true, message: "Unpublished — it’s a draft again." } : r;
}
