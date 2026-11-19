/**
 * Chat eval: asks the 15 fixed questions (./questions.mts) through the real
 * answer engine and reports, per question, time to first text, total time,
 * tokens, cost and whether the answer has the right format.
 *
 *   npx tsx --env-file-if-exists=.env.local --conditions=react-server scripts/eval/chat-eval.mts [--tier=priority|default] [--cache]
 *
 * Without --cache the answer cache is bypassed (measures the model). Costs real
 * OpenAI money (well under $0.05 a run with gpt-6-luna on the default tier).
 */
import { quickAnswer } from "@/lib/chat/live/agent";
import type { Block } from "@/lib/chat/schema";
import { QUESTIONS, type Expect } from "./questions.mts";

const args = new Map(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=") as [string, string]));
process.env.OPENAI_CHAT_TIER = args.get("tier") === "priority" ? "priority" : "default";
const useCache = args.has("cache");

function formatOk(expect: Expect, outcome: string, blocks: Block[], reply: string): boolean {
  const has = (t: Block["type"]) => blocks.some((b) => b.type === t);
  switch (expect) {
    case "compare": {
      const c = blocks.find((b) => b.type === "compare");
      return !!c && c.type === "compare" && c.rows.length >= 5 && /\bpick\b/i.test(reply.split("\n")[0]);
    }
    case "itinerary": {
      const it = blocks.find((b) => b.type === "itinerary");
      // Every day has a part of the day filled; every night but the last has a base.
      return !!it && it.type === "itinerary" && it.days.every((d, i) => (d.base || i === it.days.length - 1) && (d.morning?.length || d.afternoon?.length || d.evening?.length));
    }
    case "best_time":
      return has("bestTime");
    case "reach":
      return has("reach");
    case "budget":
      return has("budget");
    case "out_of_scope":
      return outcome === "out_of_scope";
    case "greeting":
      return outcome === "greeting";
  }
}

const rows: Record<string, unknown>[] = [];
for (const { q, expect } of QUESTIONS) {
  const t0 = performance.now();
  let ttft: number | null = null;
  const blocks: Block[] = [];
  let outcome = "error";
  let meta: Awaited<ReturnType<typeof quickAnswer>>["meta"] | null = null;
  try {
    const res = await quickAnswer(
      { turns: [{ role: "user", content: q }], memory: null },
      (e) => {
        if (ttft === null && (e.type === "delta" || (e.type === "block" && e.block.type === "text"))) ttft = performance.now() - t0;
        if (e.type === "block") blocks.push(e.block);
      },
      {
        allowResearch: async () => true,
        ...(useCache ? {} : { getCachedAnswer: async () => null, putCachedAnswer: async () => {} }),
      },
    );
    outcome = res.meta.outcome;
    meta = res.meta;
  } catch (e) {
    outcome = `error: ${(e as Error).message.slice(0, 80)}`;
  }
  const reply = blocks.find((b) => b.type === "text")?.type === "text" ? (blocks.find((b) => b.type === "text") as { text: string }).text : "";
  const row = {
    expect,
    ttft: Math.round(ttft ?? 0),
    total: Math.round(performance.now() - t0),
    in: meta?.usage?.in ?? 0,
    cached: meta?.usage?.cached ?? 0,
    out: meta?.usage?.out ?? 0,
    cost: meta?.costMicroUsd ?? 0,
    cacheHit: meta?.cacheHit ?? false,
    web: meta?.researched ?? false,
    outcome,
    ok: formatOk(expect, outcome, blocks, reply),
    q,
  };
  rows.push(row);
  console.log(JSON.stringify(row));
}
const scored = rows.filter((r) => r.outcome !== "greeting");
const avg = (k: string) => Math.round(scored.reduce((a, r) => a + Number(r[k] ?? 0), 0) / scored.length);
console.log(
  "AVG",
  JSON.stringify({ tier: process.env.OPENAI_CHAT_TIER, cache: useCache, ttft: avg("ttft"), total: avg("total"), in: avg("in"), cached: avg("cached"), out: avg("out"), costMicro: avg("cost"), formatOk: `${rows.filter((r) => r.ok).length}/${rows.length}` }),
);
process.exit(0);
