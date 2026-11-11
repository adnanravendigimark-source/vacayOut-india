import "server-only";
import { costMicroUsd } from "@/lib/research/cost";
import { createResponse, outputText, type CallModel } from "@/lib/research/openai";
import { effortFor } from "@/lib/chat/live/classify";
import { DESTINATION_SCHEMA, TRIPS_SCHEMA, destinationPrompt, tripsPrompt } from "./prompts";
import { sentenceList } from "./sentences";
import type { Research } from "./gather";

/** The cheap writing model (override with OPENAI_BUILDER_MODEL). */
export const builderModel = () => process.env.OPENAI_BUILDER_MODEL || "gpt-6-luna";

export type Written = { raw: unknown; costMicroUsd: number };

async function ask(call: CallModel, input: string, name: string, schema: object, maxTokens: number): Promise<Written> {
  const model = builderModel();
  const r = await call({
    model,
    input,
    max_output_tokens: maxTokens,
    reasoning: { effort: effortFor(model) },
    text: { format: { type: "json_schema", name, strict: true, schema } },
  });
  const cost = costMicroUsd(model, r.usage);
  if (r.status === "incomplete") return { raw: null, costMicroUsd: cost };
  try {
    return { raw: JSON.parse(outputText(r)), costMicroUsd: cost };
  } catch {
    return { raw: null, costMicroUsd: cost };
  }
}

export function writePages(research: Research, input: { name: string; location: string; isState: boolean }, call: CallModel = createResponse): Promise<Written> {
  const places = research.drafts.map((d) => `${d.ref} — ${d.name}${d.ref === "D" ? ` (the ${input.isState ? "state" : "destination"})` : ""}`).join("\n");
  return ask(call, destinationPrompt({ ...input, places, sentences: sentenceList(research.sentences) }), "vacayout_pages", DESTINATION_SCHEMA, 16_000);
}

export function writeTrips(input: { area: string; places: string; facts: string; itineraries: string; guides: string }, call: CallModel = createResponse): Promise<Written> {
  return ask(call, tripsPrompt(input), "vacayout_trips", TRIPS_SCHEMA, 16_000);
}
