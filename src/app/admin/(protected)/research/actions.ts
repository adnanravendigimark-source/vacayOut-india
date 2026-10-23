"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireAdmin, requireUser } from "@/lib/auth/guard";
import { getDb } from "@/lib/db";
import { placeCandidates, places, researchFindings, sections } from "@/lib/db/schema";
import { isUniqueViolation, type ActionState } from "@/lib/admin/action-state";
import { SECTION_KEYS, type SectionKey } from "@/lib/places/sections";
import { slugify, SLUG_RE } from "@/lib/places/slug";
import { CANDIDATE_KINDS } from "@/lib/research/engine";
import { reopenSectionsCiting } from "@/lib/places/review";
import { applySuggestion, discardSuggestion, executeRun, setBudgetUsd, startRun } from "@/lib/research/service";

const uuid = z.string().uuid();
const placePath = (id: string) => `/admin/places/${id}`;

// ---------------- start runs ----------------

export async function startResearchAction(placeId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!uuid.safeParse(placeId).success) return { ok: false, message: "Unknown place." };
  const focus = form.getAll("focus").map(String).filter((k): k is SectionKey => SECTION_KEYS.includes(k as SectionKey));
  const res = await startRun({ kind: "place_facts", placeId, focus, userId: user.id });
  if (!res.ok) return { ok: false, message: res.message };
  after(() => executeRun(res.runId));
  revalidatePath(placePath(placeId));
  return { ok: true, message: "Research started. Results appear here in a minute or two." };
}

export async function startDiscoveryAction(placeId: string): Promise<ActionState> {
  const user = await requireUser();
  if (!uuid.safeParse(placeId).success) return { ok: false, message: "Unknown place." };
  const res = await startRun({ kind: "discover_places", placeId, focus: [], userId: user.id });
  if (!res.ok) return { ok: false, message: res.message };
  after(() => executeRun(res.runId));
  revalidatePath(placePath(placeId));
  return { ok: true, message: "Looking for places. Suggestions appear here in a minute or two." };
}

// ---------------- review findings (admins only: this decides what VacayOut trusts) ----------------

const reviewSchema = z.object({
  decision: z.enum(["approve", "reject", "reopen"]),
  claim: z.string().trim().max(600).optional(),
  note: z.string().trim().max(500).optional(),
});

export async function reviewFindingAction(findingId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  if (!uuid.safeParse(findingId).success) return { ok: false, message: "Unknown finding." };
  const parsed = reviewSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." };
  const { decision, claim, note } = parsed.data;

  const db = getDb();
  const [f] = await db.select().from(researchFindings).where(eq(researchFindings.id, findingId)).limit(1);
  if (!f) return { ok: false, message: "Unknown finding." };

  if (decision === "reopen" || decision === "reject") {
    // One status per fact: every approved section that cites it goes back to draft in the same transaction.
    await db.transaction(async (tx) => {
      await tx
        .update(researchFindings)
        .set(decision === "reopen" ? { status: "pending", reviewedBy: null, reviewedAt: null, reviewNote: null } : { status: "rejected", reviewedBy: user.id, reviewedAt: new Date(), reviewNote: note || null })
        .where(eq(researchFindings.id, f.id));
      await reopenSectionsCiting(tx, f.id);
    });
  } else {
    if (!claim) return { ok: false, message: "The claim can’t be empty." };
    if ((f.verification === "unsupported" || f.verification === "conflicting") && !note) {
      return { ok: false, message: `This finding is ${f.verification}. Add a note saying why you’re approving it (e.g. which source you checked).` };
    }
    const edited = claim !== f.claim;
    await db
      .update(researchFindings)
      .set({
        status: "approved",
        claim,
        originalClaim: edited ? (f.originalClaim ?? f.claim) : f.originalClaim,
        reviewedBy: user.id,
        reviewedAt: new Date(),
        reviewNote: note || null,
      })
      .where(eq(researchFindings.id, f.id));
  }
  await audit({ actorId: user.id, action: `finding.${decision}`, entityType: "place", entityId: f.placeId, details: { findingId: f.id, topic: f.topic } });
  revalidatePath(placePath(f.placeId));
  return { ok: true };
}

// ---------------- discovery candidates ----------------

const acceptSchema = z.object({
  name: z.string().trim().min(2).max(120),
  kind: z.enum(CANDIDATE_KINDS),
});

export async function acceptCandidateAction(candidateId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!uuid.safeParse(candidateId).success) return { ok: false, message: "Unknown suggestion." };
  const parsed = acceptSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." };
  const db = getDb();
  const [c] = await db.select().from(placeCandidates).where(eq(placeCandidates.id, candidateId)).limit(1);
  if (!c || c.status !== "pending") return { ok: false, message: "This suggestion was already handled." };
  const [parent] = await db.select().from(places).where(eq(places.id, c.parentId)).limit(1);
  if (!parent) return { ok: false, message: "The parent place no longer exists." };
  const slug = slugify(parsed.data.name);
  if (!SLUG_RE.test(slug)) return { ok: false, message: "That name can’t make a valid URL." };
  const stateId = parent.kind === "state" ? parent.id : parent.stateId;

  try {
    const createdId = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(places)
        .values({ kind: parsed.data.kind, name: parsed.data.name, slug, parentId: parent.id, stateId, createdBy: user.id })
        .returning({ id: places.id });
      const updated = await tx
        .update(placeCandidates)
        .set({ status: "accepted", createdPlaceId: row.id, reviewedBy: user.id, reviewedAt: new Date() })
        .where(and(eq(placeCandidates.id, c.id), eq(placeCandidates.status, "pending")))
        .returning({ id: placeCandidates.id });
      if (!updated.length) throw new Error("already-handled");
      await audit({ actorId: user.id, action: "place.create", entityType: "place", entityId: row.id, details: { kind: parsed.data.kind, name: parsed.data.name, slug, fromCandidate: c.id } }, tx);
      return row.id;
    });
    revalidatePath(placePath(parent.id));
    return { ok: true, message: `Created draft “${parsed.data.name}”.`, fields: { createdId } };
  } catch (err) {
    if (isUniqueViolation(err)) return { ok: false, message: `“${slug}” already exists in this state.` };
    if (err instanceof Error && err.message === "already-handled") return { ok: false, message: "This suggestion was already handled." };
    throw err;
  }
}

export async function rejectCandidateAction(candidateId: string) {
  const user = await requireUser();
  if (!uuid.safeParse(candidateId).success) return;
  const db = getDb();
  const [c] = await db
    .update(placeCandidates)
    .set({ status: "rejected", reviewedBy: user.id, reviewedAt: new Date() })
    .where(and(eq(placeCandidates.id, candidateId), eq(placeCandidates.status, "pending")))
    .returning({ parentId: placeCandidates.parentId });
  if (c) revalidatePath(placePath(c.parentId));
}

// ---------------- settings ----------------

export async function updateBudgetAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  const v = z.coerce.number().min(0).max(10_000).safeParse(form.get("budget"));
  if (!v.success) return { ok: false, message: "Enter a monthly budget between $0 and $10,000." };
  await setBudgetUsd(Math.round(v.data * 100) / 100, user.id);
  revalidatePath("/admin/research");
  return { ok: true, message: "Budget saved." };
}

// ---------------- drafting from approved facts (Phase 3) ----------------

export async function applySuggestionAction(suggestionId: string): Promise<ActionState> {
  const user = await requireUser();
  if (!uuid.safeParse(suggestionId).success) return { ok: false, message: "Unknown suggestion." };
  const res = await applySuggestion(suggestionId, user.id);
  if (!res.ok) return { ok: false, message: res.message };
  revalidatePath(placePath(res.placeId));
  return { ok: true, message: res.section ? "Copied into the section as a draft. Review it, then approve." : "Summary and SEO fields filled in." };
}

export async function discardSuggestionAction(suggestionId: string): Promise<ActionState> {
  const user = await requireUser();
  if (!uuid.safeParse(suggestionId).success) return { ok: false, message: "Unknown suggestion." };
  const placeId = await discardSuggestion(suggestionId, user.id);
  if (placeId) revalidatePath(placePath(placeId));
  return { ok: true };
}

/** For when an admin has rewritten a section and the drafted sources no longer apply. */
export async function clearSectionSourcesAction(placeId: string, key: string): Promise<void> {
  const user = await requireUser();
  if (!uuid.safeParse(placeId).success || !SECTION_KEYS.includes(key as SectionKey)) return;
  await getDb()
    .update(sections)
    .set({ sources: [], findingIds: [], updatedAt: new Date(), updatedBy: user.id })
    .where(and(eq(sections.placeId, placeId), eq(sections.key, key as SectionKey)));
  await getDb().update(places).set({ updatedAt: new Date() }).where(eq(places.id, placeId));
  await audit({ actorId: user.id, action: "section.clear_sources", entityType: "place", entityId: placeId, details: { key } });
  revalidatePath(placePath(placeId));
}
