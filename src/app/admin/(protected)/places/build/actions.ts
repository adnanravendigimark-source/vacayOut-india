"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/guard";
import type { ActionState } from "@/lib/admin/action-state";
import { hit } from "@/lib/limiter";
import { resumeBuild, startBuild } from "@/lib/builder/start";

const Input = z.object({
  kind: z.enum(["state", "more", "destination"]),
  state: z.string().trim().min(2).max(80),
  target: z.string().trim().max(120).optional(),
});

/**
 * Starts a one-click build. Admin only: a build publishes what passes its
 * checks. Limited to a few starts per hour per admin (each build has its own
 * spending cap on top of that).
 */
export async function startBuildAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  const parsed = Input.safeParse({ kind: form.get("kind"), state: form.get("state"), target: form.get("target") || undefined });
  if (!parsed.success) return { ok: false, message: "Choose a state (and a destination name)." };
  const limit = await hit(`build:${user.id}`, 6, 3600);
  if (!limit.ok) return { ok: false, message: `Too many builds started — try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minutes.` };
  const res = await startBuild({ kind: parsed.data.kind, stateName: parsed.data.state, target: parsed.data.target, userId: user.id });
  if (!res.ok) return { ok: false, message: res.message };
  await audit({ actorId: user.id, action: "build.start", entityType: "build", entityId: res.id, details: parsed.data });
  redirect(`/admin/places/build/${res.id}`);
}

export async function resumeBuildAction(id: string): Promise<ActionState> {
  const user = await requireAdmin();
  if (!z.string().uuid().safeParse(id).success) return { ok: false, message: "Unknown build." };
  const res = await resumeBuild(id);
  if (!res.ok) return { ok: false, message: res.message };
  await audit({ actorId: user.id, action: "build.resume", entityType: "build", entityId: id, details: {} });
  return { ok: true, message: "Build restarted." };
}
