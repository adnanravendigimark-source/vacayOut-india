// Baseline eval against the CURRENT engine (before the rewrite). Usage: tsx ... eval-baseline.mts [priority|default]
import { quickAnswer } from "@/lib/chat/live/agent";
import { createResponse, type CallModel } from "@/lib/research/openai";
import { QUESTIONS } from "../eval/questions.mts";
import type { Block } from "@/lib/chat/schema";

process.env.OPENAI_CHAT_TIER = process.argv[2] === "default" ? "default" : "priority";
const rows = [];
for (const { q, expect } of QUESTIONS) {
  const t0 = performance.now();
  let first: number | null = null;
  const blocks: Block[] = [];
  const usage = { in: 0, cached: 0, out: 0 };
  const call: CallModel = async (body) => {
    const r = await createResponse(body);
    usage.in += r.usage?.input_tokens ?? 0;
    usage.cached += r.usage?.input_tokens_details?.cached_tokens ?? 0;
    usage.out += r.usage?.output_tokens ?? 0;
    return r;
  };
  let cost = 0;
  let outcome = "error";
  try {
    const res = await quickAnswer({ turns: [{ role: "user", content: q }], memory: null }, (e) => {
      if (e.type === "block") {
        if (first === null && e.block.type === "text") first = performance.now() - t0;
        blocks.push(e.block);
      }
    }, { call, allowResearch: async () => true, onCost: (c) => (cost += c) });
    outcome = res.meta.outcome;
  } catch (e) {
    outcome = `error: ${(e as Error).message.slice(0, 80)}`;
  }
  const total = performance.now() - t0;
  const types = blocks.map((b) => b.type);
  const ok =
    expect === "compare" ? types.includes("compare") :
    expect === "itinerary" ? types.includes("itinerary") :
    expect === "out_of_scope" ? outcome === "out_of_scope" :
    expect === "greeting" ? outcome === "greeting" :
    expect === "budget" ? blocks.some((b) => (b.type === "text" && /₹/.test(b.text)) || b.type === "budget") :
    types.includes("text");
  rows.push({ q, expect, ttft: first, total, ...usage, cost, outcome, ok, types: types.join(",") });
  console.log(JSON.stringify(rows[rows.length - 1]));
}
const avg = (k: "ttft" | "total" | "in" | "cached" | "out" | "cost") => {
  const v = rows.filter((r) => r.outcome !== "greeting").map((r) => Number(r[k] ?? 0));
  return Math.round(v.reduce((a, b) => a + b, 0) / v.length);
};
console.log("AVG", JSON.stringify({ tier: process.env.OPENAI_CHAT_TIER, ttft: avg("ttft"), total: avg("total"), in: avg("in"), cached: avg("cached"), out: avg("out"), costMicro: avg("cost"), formatOk: `${rows.filter((r) => r.ok).length}/${rows.length}` }));
