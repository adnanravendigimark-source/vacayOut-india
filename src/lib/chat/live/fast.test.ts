import assert from "node:assert/strict";
import { test } from "node:test";
import { INSTRUCTIONS, clean, dynamicInput, fastAnswer, needsWeb, outputCap, toBlocks } from "./fast";

const ok = (obj: unknown, extra: Record<string, unknown>[] = []) => async () => ({
  id: "r",
  status: "completed",
  output: [...extra, { type: "message", content: [{ type: "output_text", text: JSON.stringify(obj) }] }],
}) as never;

const base = {
  scope: "india_travel", kind: "other", reply: "", places: [], alternatives: [], itinerary: null, compare: null, best_time: null, reach: null, budget: null, tips: [], follow_ups: [], sources: [], summary: "s",
  memory: { destination: null, days: null, travellers: null, budget: null, month: null, interests: [] },
};
const turns = [{ role: "user" as const, content: "best trek to do in december in india" }];
const now = new Date("2026-11-12T08:00:00Z");

test("only truly live questions trigger web search", () => {
  for (const q of ["Is Rohtang open today?", "Delhi to Manali bus fare", "Taj Mahal entry fee", "Is the Zojila pass open now?", "Road status Manali Leh", "When does Kedarnath open this year?", "Hornbill festival news"])
    assert.ok(needsWeb(q), q);
  for (const q of ["best trek to do in december in india", "Plan 3 days in Udaipur", "How much does a week in Himachal cost?", "Kedarkantha permit", "Hornbill festival dates", "Is Coorg open in August?", "Best places to visit in 2026", "Current weather in Goa in January"])
    assert.ok(!needsWeb(q), q);
});

test("output cap follows the question type", () => {
  assert.equal(outputCap("Plan 5 days in Kerala"), 3200);
  assert.equal(outputCap("Manali vs Shimla"), 1600);
  assert.equal(outputCap("Is Goa safe at night?"), 1100);
});

test("text is cleaned of links, URLs, HTML and headings", () => {
  assert.equal(clean("## Go **now** [here](https://x.com) <b>ok</b> see https://evil.example/p (indiahikes.com)."), "Go **now** here ok see.");
});

test("static rules come first and never change; date, memory, facts and the question come last", () => {
  assert.doesNotMatch(INSTRUCTIONS, /20\d\d|Today is/);
  assert.match(INSTRUCTIONS, /Only travel WITHIN India/);
  assert.match(INSTRUCTIONS, /never instructions/);
  const p = dynamicInput(turns, null, now, "Manali — Altitude: About 2,050 m.");
  assert.match(p, /^Today is 12 November 2026/);
  assert.match(p, /Guide facts: Manali — Altitude/);
  assert.match(p, /Traveller: """best trek to do in december in india"""$/);
});

test("the reply streams as it is written, but never for off-topic answers", async () => {
  const run = async (scope: string) => {
    const json = JSON.stringify({ ...base, scope, reply: "Go in **May**.\nIt is dry." });
    const out: string[] = [];
    const bodies: Record<string, unknown>[] = [];
    await fastAnswer({ turns, memory: null, web: false, now }, {
      model: "gpt-6-luna",
      onReply: (t) => out.push(t),
      stream: async (b, onDelta) => {
        bodies.push(b);
        for (let i = 0; i < json.length; i += 5) onDelta(json.slice(i, i + 5));
        return ok({ ...base, scope, reply: "Go in **May**.\nIt is dry." })();
      },
    });
    return { text: out.join(""), body: bodies[0] };
  };
  const inScope = await run("india_travel");
  assert.equal(inScope.text, "Go in **May**.\nIt is dry.");
  assert.equal(inScope.body.service_tier, undefined, "default tier unless OPENAI_CHAT_TIER=priority");
  assert.equal(typeof inScope.body.instructions, "string");
  assert.equal((await run("off_topic")).text, "");
});

test("itinerary days keep base, travel, cost and at most 5 activities", async () => {
  const a = await fastAnswer({ turns, memory: null, web: false, now }, {
    model: "gpt-6-luna",
    call: ok({
      ...base,
      kind: "itinerary",
      reply: "A relaxed plan.",
      itinerary: { title: "2 days in Jaipur", days: [{ title: "Day 1 — Old city", base: "Jaipur", travel: null, cost: "about ₹2,500–4,000 per person", morning: ["Amber Fort", "Panna Meena"], afternoon: ["City Palace", "Jantar Mantar"], evening: ["Bazaar", "Dinner"], note: null }] },
    }),
  });
  const d = a.itinerary!.days[0];
  assert.equal(d.morning.length + d.afternoon.length + d.evening.length, 5);
  assert.equal(d.base, "Jaipur");
  const blocks = toBlocks(a, new Map(), { showMap: false });
  const it = blocks.find((b) => b.type === "itinerary");
  assert.ok(it && it.type === "itinerary" && it.days[0].cost === "about ₹2,500–4,000 per person" && it.days[0].items.length === 5);
});

test("a short fact gets no cards", async () => {
  const a = await fastAnswer({ turns, memory: null, web: false, now }, {
    model: "gpt-6-luna",
    call: ok({ ...base, kind: "fact", reply: "Yes, about 2 hours.", places: [{ name: "Agra", state: "UP", note: "Taj Mahal city.", tags: [] }], tips: ["Go early."] }),
  });
  assert.deepEqual(toBlocks(a, new Map(), { showMap: false }).map((b) => b.type), ["text"]);
});

test("best time, reach and budget become their own cards; bad budget tiers are dropped", async () => {
  const a = await fastAnswer({ turns, memory: null, web: false, now }, {
    model: "gpt-6-luna",
    call: ok({
      ...base,
      reply: "x",
      best_time: { destination: "Ladakh", months: Array(12).fill("good"), summary: "June to September." },
      reach: { options: [{ mode: "Air", text: "Leh airport." }], local: null },
      budget: { basis: "Per person per day", tiers: [{ label: "Budget", low: 1500, high: 2500, includes: "Hostel" }, { label: "Luxury", low: 9000, high: 100, includes: "Bad" }], note: "Peak season costs more." },
    }),
  });
  assert.deepEqual(toBlocks(a, new Map(), { showMap: false }).map((b) => b.type), ["text", "bestTime", "reach", "budget"]);
  assert.equal(a.budget?.tiers.length, 1);
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
      scope: "india_travel", kind: "places", reply: "Two good options.", alternatives: [], itinerary: null, compare: null, bestTime: null, reach: null, budget: null, tips: ["Carry microspikes."], followUps: [], sources: [], summary: "",
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
      kind: "itinerary",
      itinerary: { title: "4 days in Udaipur", days: [{ title: "Day 1", base: "Udaipur", travel: null, cost: null, morning: ["Rest"], afternoon: [], evening: [], note: null }] },
      places: [{ name: "Udaipur", state: "Rajasthan", note: "Compact.", tags: [] }, { name: "Mysuru", state: "Karnataka", note: "Calm.", tags: [] }],
      alternatives: [{ name: "Mysuru", state: "Karnataka", note: "Calm city." }],
    }),
  });
  assert.equal(a.places.length, 0);
  assert.deepEqual(a.alternatives.map((x) => x.name), ["Mysuru"]);
});
