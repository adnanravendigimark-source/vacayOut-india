import "server-only";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { chatAnswerCache } from "@/lib/db/schema";
import type { Block, TripMemory } from "@/lib/chat/schema";

/** Finished answers reused for 7 days (see answer-cache-core.ts for the key). Best effort: never breaks a reply. */
const TTL_MS = 7 * 86_400_000;

export type CachedAnswer = { blocks: Block[]; summary: string; memory: TripMemory | null };

export async function getCachedAnswer(key: string): Promise<CachedAnswer | null> {
  try {
    const [row] = await getDb()
      .update(chatAnswerCache)
      .set({ hits: sql`${chatAnswerCache.hits} + 1` })
      .where(and(eq(chatAnswerCache.key, key), gt(chatAnswerCache.expiresAt, new Date())))
      .returning({ blocks: chatAnswerCache.blocks, summary: chatAnswerCache.summary, memory: chatAnswerCache.memory });
    return row ? { blocks: row.blocks as Block[], summary: row.summary, memory: (row.memory as TripMemory | null) ?? null } : null;
  } catch (err) {
    console.error("[chat] answer cache read failed", err instanceof Error ? err.message : err);
    return null;
  }
}

export async function putCachedAnswer(key: string, a: CachedAnswer): Promise<void> {
  try {
    const db = getDb();
    const expiresAt = new Date(Date.now() + TTL_MS);
    await db
      .insert(chatAnswerCache)
      .values({ key, blocks: a.blocks, summary: a.summary, memory: a.memory, expiresAt })
      .onConflictDoUpdate({ target: chatAnswerCache.key, set: { blocks: a.blocks, summary: a.summary, memory: a.memory, expiresAt, createdAt: new Date() } });
    if (Math.random() < 0.02) await db.delete(chatAnswerCache).where(lt(chatAnswerCache.expiresAt, new Date()));
  } catch (err) {
    console.error("[chat] answer cache write failed", err instanceof Error ? err.message : err);
  }
}
