import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { audit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { media, places, researchRuns } from "@/lib/db/schema";
import { locationOf, finish, imageCostMicroUsd, imageModel, startRun } from "@/lib/research/service";
import { logError } from "@/lib/ops/log";
import { EXT, sniffImage } from "./sniff";
import { storeImage } from "./storage";

/**
 * Optional AI illustration, made only when an admin asks (normally when no
 * free photo exists). Always stored as kind "ai_generated" and labelled as an
 * illustration wherever it appears; never passed off as a photograph.
 * Charged to the AI budget: the estimated cost is reserved first.
 */
export async function generateIllustration(placeId: string, userId: string) {
  const db = getDb();
  const [place] = await db.select().from(places).where(eq(places.id, placeId)).limit(1);
  if (!place) return { ok: false as const, message: "Unknown place." };
  const started = await startRun({ kind: "image", placeId, focus: [], userId });
  if (!started.ok) return started;
  const where = await locationOf(db, place);
  const prompt = `A painterly travel-poster illustration (clearly an illustration, not a photograph) of ${place.name}, ${where}. Natural light, calm composition, no people in the foreground, no text, no logos.`;
  try {
    const key = process.env.OPENAI_API_KEY!;
    const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
    const res = await fetch(`${base}/images/generations`, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ model: imageModel(), prompt, size: "1536x1024", quality: "medium", output_format: "jpeg", n: 1 }),
      signal: AbortSignal.timeout(180_000),
    });
    if (!res.ok) throw new Error(`Image request failed (${res.status})`);
    const json = (await res.json()) as { data?: { b64_json?: string }[] };
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) throw new Error("The image service returned no image.");
    const bytes = new Uint8Array(Buffer.from(b64, "base64"));
    const type = sniffImage(bytes);
    if (!type) throw new Error("The image service returned an unsupported file.");
    const stored = await storeImage(`places/${place.slug}/ai-${crypto.randomUUID()}.${EXT[type]}`, bytes, type);
    const mediaId = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(media)
        .values({
          placeId,
          url: stored.url,
          storageKey: stored.storageKey,
          contentType: type,
          bytes: bytes.length,
          alt: `Illustration of ${place.name} (AI-generated)`.slice(0, 200),
          caption: null,
          kind: "ai_generated",
          license: "AI-generated image",
          attribution: "AI-generated illustration",
          sourceUrl: null,
          createdBy: userId,
        })
        .returning({ id: media.id });
      await tx.update(places).set({ heroMediaId: row.id, updatedAt: new Date() }).where(and(eq(places.id, placeId), sql`${places.heroMediaId} is null`));
      await tx.update(researchRuns).set({ costMicroUsd: imageCostMicroUsd() }).where(eq(researchRuns.id, started.runId));
      await finish(tx, started.runId, { costMicroUsd: imageCostMicroUsd(), inputTokens: 0, outputTokens: 0, searchCalls: 0 }, "AI illustration created.");
      return row.id;
    });
    await audit({ actorId: userId, action: "media.ai_illustration", entityType: "place", entityId: placeId, details: { mediaId, model: imageModel() } });
    return { ok: true as const, mediaId };
  } catch (err) {
    await logError("media:ai_illustration", err);
    // Assume the request may have been billed if it got as far as a response.
    await db.update(researchRuns).set({ status: "failed", error: err instanceof Error ? err.message.slice(0, 500) : "failed", reservedMicroUsd: 0, finishedAt: new Date() }).where(eq(researchRuns.id, started.runId));
    return { ok: false as const, message: "Couldn’t create the illustration. Try again later." };
  }
}
