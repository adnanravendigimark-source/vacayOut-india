import { createHash } from "node:crypto";
import type { ChatTurn, TripMemory } from "@/lib/chat/schema";

/**
 * Key for reusing a finished answer: same rules version and model, same
 * question (normalised), same trip memory and same earlier conversation.
 */
export const normaliseQuestion = (q: string) =>
  q
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[“”"'’`]/g, "")
    .replace(/[?!.,;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function answerCacheKey(p: { version: string; model: string; turns: ChatTurn[]; memory: TripMemory | null }): string {
  const latest = p.turns[p.turns.length - 1]?.content ?? "";
  const history = p.turns.slice(0, -1).map((t) => `${t.role}:${normaliseQuestion(t.content)}`);
  const payload = JSON.stringify([p.version, p.model, normaliseQuestion(latest), p.memory ?? null, history]);
  return createHash("sha256").update(payload).digest("base64url");
}
