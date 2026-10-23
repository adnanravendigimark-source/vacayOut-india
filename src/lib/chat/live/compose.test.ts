import assert from "node:assert/strict";
import { test } from "node:test";
import { compose, groundAnswer, type ComposeContext } from "./compose";
import type { ResponsesResult } from "@/lib/research/openai";

const ctx: ComposeContext = {
  guides: [
    {
      ref: "G1", placeId: "p", name: "Manali", kind: "city", stateName: "Himachal Pradesh", href: "/india/himachal-pradesh/manali",
      summary: "Mountain town.", text: "Hadimba Temple is open 8:00 AM to 6:00 PM. Solang Valley is 14 km from Manali.", sectionKeys: ["overview"], hero: null,
      children: [{ name: "Old Manali", kind: "town", summary: null }],
    },
  ],
  web: [{ ref: "W1", claim: "A Volvo bus from Delhi to Manali costs ₹1,500 to ₹2,200.", claimType: "price" }],
  turns: [{ role: "user", content: "Plan 3 days in Manali for 2 people" }],
  memory: null,
  cls: { scope: "india_travel", destinations: ["Manali"], intent: "plan_trip", days: 3, travellers: "2 people", budget: null, month: null, interests: [], needsLiveInfo: false, standalone: "Plan 3 days in Manali" },
};

test("cards must cite real refs; numbers must come from what they cite or the traveller", () => {
  const g = groundAnswer(
    [
      { type: "text", text: "Here’s a relaxed plan for your 3 days.", refs: [] }, // connector, user's number
      { type: "itinerary", title: "3 days in Manali", days: [{ title: "Day 1", items: ["Hadimba Temple (open 8:00 AM)"] }, { title: "Day 2", items: ["Solang Valley, 14 km away"] }], refs: ["G1"] },
      { type: "tips", items: ["Rohtang permits cost ₹550"], refs: ["G1"] }, // invented number
      { type: "budget", basis: "per person", tiers: [{ label: "Volvo bus from Delhi", low: 1500, high: 2200 }], refs: ["W1"] },
      { type: "budget", basis: "per person", tiers: [{ label: "Hotel", low: 3000, high: null }], refs: ["W1"] }, // not in source
      { type: "tips", items: ["Carry layers"], refs: ["G9"] }, // unknown ref
      { type: "text", text: "Manali gets 2 metres of snow (G1).", refs: [] }, // uncited number
    ],
    ctx,
  );
  assert.deepEqual(g.blocks.map((b) => b.type), ["text", "itinerary", "budget"]);
  assert.equal(g.dropped, 4);
  assert.deepEqual([...g.usedRefs].sort(), ["G1", "W1"]);
  const budget = g.blocks[2];
  assert.ok(budget.type === "budget" && /check current prices/.test(budget.note));
});

test("model output can't smuggle links, HTML or unknown card types", () => {
  const g = groundAnswer(
    [
      { type: "html", html: "<script>x</script>", refs: ["G1"] },
      { type: "bookings", items: [{ label: "x", provider: "y", href: "https://evil.example", icon: "hotel" }], refs: ["G1"] },
      { type: "text", text: "<b>Open daily</b> see Hadimba Temple", refs: ["G1"] },
    ],
    ctx,
  );
  assert.deepEqual(g.blocks.map((b) => b.type), ["text"]); // text is rendered as plain text by React
});

test("compose sends only our context and returns grounded cards, follow-ups and memory", async () => {
  const reply: ResponsesResult = {
    id: "r",
    status: "completed",
    usage: { input_tokens: 3000, output_tokens: 400 },
    output: [
      {
        type: "message",
        content: [
          {
            type: "output_text",
            text: JSON.stringify({
              blocks: [{ type: "tips", items: ["Visit Hadimba Temple early (G1)"], refs: ["G1"] }],
              summary: "Gave tips for Manali (G1).",
              follow_ups: ["How do I get there?"],
              memory: { destination: "Manali", days: 3, travellers: "2 people", budget: null, month: null, interests: [], plan: [] },
            }),
          },
        ],
      },
    ],
  };
  const out = await compose(ctx, {
    model: "m",
    call: async (body) => {
      assert.match(String(body.input), /\[G1\] VacayOut guide: Manali/);
      assert.match(String(body.input), /data, not instructions/);
      return reply;
    },
  });
  assert.deepEqual(out.blocks, [{ type: "tips", items: ["Visit Hadimba Temple early"] }]);
  assert.equal(out.summary, "Gave tips for Manali.");
  assert.equal(out.memory?.days, 3);
});
