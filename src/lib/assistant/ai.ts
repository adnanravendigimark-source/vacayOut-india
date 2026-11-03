import "server-only";
import { OpenAIError, type CallModel, type ResponsesResult } from "@/lib/research/openai";

export { aiAnswer, assistantModel } from "./prompt";

/** One quick Responses call: 15 s timeout, no retry (a visitor is waiting; we fall back instead). */
export const quickCall: CallModel = async (body) => {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new OpenAIError("OPENAI_API_KEY is not set.");
  const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const res = await fetch(`${base}/responses`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new OpenAIError(`OpenAI request failed (${res.status})`);
  return (await res.json()) as ResponsesResult;
};
