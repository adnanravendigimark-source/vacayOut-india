/**
 * Cost estimate for research calls, in micro-dollars (1e-6 USD).
 * Prices are list prices per 1M tokens at the time of writing; override with
 * RESEARCH_PRICES='{"model":{"in":5,"cached":0.5,"out":30}}' and
 * RESEARCH_SEARCH_CALL_USD. Figures are estimates — OpenAI's bill is final.
 */
import type { ResponseUsage } from "./openai";

type Price = { in: number; cached: number; out: number };

const DEFAULT_PRICES: Record<string, Price> = {
  "gpt-5.5": { in: 5, cached: 0.5, out: 30 },
  "gpt-5.4-mini": { in: 0.75, cached: 0.075, out: 4.5 },
};
/** Unknown models are costed at this (deliberately high) rate so the budget errs on the safe side. */
const FALLBACK: Price = { in: 10, cached: 1, out: 50 };

function prices(): Record<string, Price> {
  try {
    const extra = process.env.RESEARCH_PRICES ? (JSON.parse(process.env.RESEARCH_PRICES) as Record<string, Price>) : {};
    return { ...DEFAULT_PRICES, ...extra };
  } catch {
    return DEFAULT_PRICES;
  }
}

export function priceFor(model: string): Price {
  const table = prices();
  if (table[model]) return table[model];
  // dated snapshots, e.g. "gpt-5.5-2026-04-23"
  const base = Object.keys(table).find((k) => model.startsWith(`${k}-`));
  return base ? table[base] : FALLBACK;
}

export function searchCallMicroUsd(): number {
  const usd = Number(process.env.RESEARCH_SEARCH_CALL_USD ?? "0.01");
  return Math.round((Number.isFinite(usd) && usd >= 0 ? usd : 0.01) * 1e6);
}

export function costMicroUsd(model: string, usage: ResponseUsage | undefined, searchCalls = 0): number {
  const p = priceFor(model);
  const input = usage?.input_tokens ?? 0;
  const cached = Math.min(input, usage?.input_tokens_details?.cached_tokens ?? 0);
  const output = usage?.output_tokens ?? 0;
  // price per 1M tokens → micro-dollars per token is exactly `price`
  return Math.ceil((input - cached) * p.in + cached * p.cached + output * p.out) + searchCalls * searchCallMicroUsd();
}

export const usd = (micro: number) => `$${(micro / 1e6).toFixed(micro < 10_000 ? 4 : 2)}`;
