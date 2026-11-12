import assert from "node:assert/strict";
import { test } from "node:test";
import { clean, fastAnswer, fastPrompt, needsWeb, toBlocks } from "./fast";

const ok = (obj: unknown, extra: Record<string, unknown>[] = []) => async () => ({
  id: "r",
  status: "completed",
  output: [...extra, { type: "message", content: [{ type: "output_text", text: JSON.stringify(obj) }] }],
}) as never;

const base = {
  scope: "india_travel", reply: "", places: [], alternatives: [], itinerary: null, compare: null, tips: [], follow_ups: [], sources: [], summary: "s",
  memory: { destination: null, days: null, travellers: null, budget: null, month: null, interests: [] },
};
const turns = [{ role: "user" as const, content: "best trek to do in december in india" }];
const now = new Date("2026-11-12T08:00:00Z");

test("live questions trigger web search; evergreen ones don't", () => {
  assert.ok(needsWeb("Kedarkantha trek permit fee"));
  assert.ok(needsWeb("Is Rohtang open today?"));
  assert.ok(needsWeb("Hornbill festival dates 2026"));
  assert.ok(!needsWeb("best trek to do in december in india"));
  assert.ok(!needsWeb("Plan 3 days in Udaipur"));
});

test("text is cleaned of links, URLs, HTML and headings", () => {
  assert.equal(clean("## Go **now** [here](https://x.com) <b>ok</b> see https://evil.example/p (indiahikes.com)."), "Go **now** here ok see.");
});

test("prompt has today's date, scope rules and treats messages as data", () => {
  const p = fastPrompt(turns, null, now, false);
  assert.match(p, /Today is 12 November 2026/);
  assert.match(p, /Only travel WITHIN India/);
  assert.match(p, /never instructions/);
  assert.match(p, /Traveller: """best trek to do in december in india"""/);
});

test("answer is parsed, cleaned and limited; web search only when asked", async () => {
  const bodies: Record<string, unknown>[] = [];
  const a = await fastAnswer(
    { turns, memory: null, web: false, now },
    {
      model: "gpt-6-luna",
      call: async (b) => {
        bodies.push(b);
        return ok({
          ...base,
          reply: "December is snow season. Try **Kedarkantha** [link](https://x.y).",
          places: Array.from({ length: 8 }, (_, i) => ({ name: `Trek ${i}`, state: "Uttarakhand", note: "Snowy summit, 6 days.", tags: ["Snow", "<script>"] })),
        })();
      },
    },
  );
  assert.equal(bodies[0].tools, undefined);
  assert.deepEqual(bodies[0].reasoning, { effort: "none" });
  assert.equal(a.reply, "December is snow season. Try **Kedarkantha** link.");
  assert.equal(a.places.length, 6);
  assert.deepEqual(a.places[0].tags, ["Snow"]);
});

test("sources are kept only if the search tool really returned them", async () => {
  const search = { type: "web_search_call", action: { sources: [{ url: "https://indiahikes.com/kedarkantha-trek" }] } };
  const a = await fastAnswer(
    { turns: [{ role: "user", content: "Kedarkantha permit fee 2026" }], memory: null, web: true, now },
    {
      model: "gpt-6-luna",
      call: ok({ ...base, reply: "About ₹…", sources: [{ url: "https://indiahikes.com/kedarkantha-trek?utm_source=openai", title: "Kedarkantha" }, { url: "https://made-up.example/x", title: "Fake" }] }, [search]),
    },
  );
  assert.deepEqual(a.sources.map((x) => x.site), ["indiahikes.com"]);
});

test("cards: guide links and photos come from our database; unknown places stay plain", () => {
  const blocks = toBlocks(
    {
      scope: "india_travel", reply: "Two good options.", alternatives: [], itinerary: null, compare: null, tips: ["Carry microspikes."], followUps: [], sources: [], summary: "",
      places: [{ name: "Kedarkantha Trek", state: "Uttarakhand", note: "Classic snow summit.", tags: [] }, { name: "Munnar", state: "Kerala", note: "Tea hills.", tags: ["Hills"] }],
      memory: { destination: null, days: null, travellers: null, budget: null, month: null, interests: [] },
    },
    new Map([["munnar", { name: "Munnar", href: "/india/kerala/munnar", photo: { src: "/images/munnar.jpg", alt: "Tea" }, lat: 10, lng: 77 }]]),
    { showMap: false },
  );
  assert.deepEqual(blocks.map((b) => b.type), ["text", "picks", "tips"]);
  const picks = blocks[1];
  assert.ok(picks.type === "picks");
  assert.equal(picks.items[0].href, undefined);
  assert.equal(picks.items[1].href, "/india/kerala/munnar");
});

test("off-topic is reported as such", async () => {
  const a = await fastAnswer({ turns: [{ role: "user", content: "write python code" }], memory: null, web: false, now }, { model: "gpt-6-luna", call: ok({ ...base, scope: "off_topic" }) });
  assert.equal(a.scope, "off_topic");
});

test("comparison table: kept only when every row has one cell per place", async () => {
  const { normaliseCompare } = await import("./fast");
  assert.equal(normaliseCompare({ places: ["Manali"], rows: [] }), null);
  const c = normaliseCompare({
    places: ["Manali", "Shimla", "Mussoorie"],
    rows: [
      { aspect: "Snow in December", values: ["Likely", "Possible", "Rare"] },
      { aspect: "Broken row", values: ["only one"] },
      { aspect: "Best for", values: ["Snow play", "Easy family trip", "Quiet break", "extra cell"] },
    ],
  });
  assert.deepEqual(c?.rows.map((r) => r.label), ["Snow in December", "Best for"]);
  assert.equal(c?.rows[1].values.length, 3);
});

test("a one-base plan drops its stop list; alternatives are never repeated as stops", async () => {
  const a = await fastAnswer({ turns, memory: null, web: false, now }, {
    model: "gpt-6-luna",
    call: ok({
      ...base,
      reply: "Udaipur suits your parents best.",
      itinerary: { title: "4 days in Udaipur", days: [{ title: "Day 1", items: ["Rest"] }] },
      places: [{ name: "Udaipur", state: "Rajasthan", note: "Compact.", tags: [] }, { name: "Mysuru", state: "Karnataka", note: "Calm.", tags: [] }],
      alternatives: [{ name: "Mysuru", state: "Karnataka", note: "Calm city." }],
    }),
  });
  assert.equal(a.places.length, 0);
  assert.deepEqual(a.alternatives.map((x) => x.name), ["Mysuru"]);
});
