import assert from "node:assert/strict";
import { test } from "node:test";
import { candidateList, discover, groundPicks, type Candidate } from "./discover";
import type { Classification } from "./classify";

const cands: Candidate[] = [
  { ref: "G1", name: "Goa", kind: "state", stateName: "Goa", href: "/india/goa", summary: "Beaches from Calangute to Palolem.", bestTime: "November to March is the peak season (28°C–32°C).", hero: { url: "/images/goa.jpg", alt: "Goa beach", credit: null } },
  { ref: "G2", name: "Kerala", kind: "state", stateName: "Kerala", href: "/india/kerala", summary: "Backwaters and tea hills.", bestTime: "November–February: the peak season.", hero: null },
  { ref: "G3", name: "Varkala", kind: "town", stateName: "Kerala", href: "/india/kerala/varkala", summary: "Red cliffs over the sea.", bestTime: "", hero: { url: "https://evil.example/x.jpg", alt: "x", credit: null } },
];
const turns = [{ role: "user" as const, content: "best places in India to visit in November" }];

test("picks keep real refs, drop unknown refs, duplicates and invented numbers; names and links come from the server", () => {
  const g = groundPicks(
    {
      intro: "November is dry season across much of the south.",
      picks: [
        { ref: "G1", why: "Peak beach season, 28°C–32°C days.", tags: ["Beaches", "<b>x</b>"] },
        { ref: "g2", why: "Backwaters in the peak season (G2).", tags: [] },
        { ref: "G1", why: "Duplicate.", tags: [] },
        { ref: "G9", why: "Made up place.", tags: [] },
        { ref: "G3", why: "Cliffs at 45 m above the sea.", tags: [] },
      ],
      summary: "Suggested November picks.",
      follow_ups: ["Plan 5 days in Goa"],
    },
    cands,
    turns,
    "Good picks for November",
  );
  assert.equal(g.dropped, 3);
  assert.deepEqual(g.blocks.map((b) => b.type), ["text", "picks"]);
  const picks = g.blocks[1];
  assert.ok(picks.type === "picks");
  assert.deepEqual(picks.items.map((p) => [p.name, p.href]), [["Goa", "/india/goa"], ["Kerala", "/india/kerala"]]);
  assert.deepEqual(picks.items[0].tags, ["Beaches"]);
  assert.equal(picks.items[1].why, "Backwaters in the peak season.");
  assert.equal(picks.items[1].photo, undefined);
});

test("no valid picks → no cards", () => {
  const g = groundPicks({ intro: "x", picks: [{ ref: "G9", why: "nope", tags: [] }], summary: "", follow_ups: [] }, cands, turns, "t");
  assert.equal(g.blocks.length, 0);
});

test("candidate list goes first in the prompt and the call uses luna with no reasoning", async () => {
  const bodies: Record<string, unknown>[] = [];
  const cls: Classification = { scope: "india_travel", destinations: [], origin: null, intent: "discover", days: null, travellers: null, budget: null, month: "November", interests: [], needsLiveInfo: false, standalone: "Best places in India in November" };
  const out = await discover({ cands, cls, turns }, {
    model: "gpt-6-luna",
    call: async (body) => {
      bodies.push(body);
      return { id: "r", status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({ intro: "Two good fits.", picks: [{ ref: "G1", why: "Peak beach season.", tags: ["Beaches"] }], summary: "s", follow_ups: [] }) }] }] };
    },
  });
  assert.ok(String(bodies[0].input).startsWith(`VacayOut GUIDES (reviewed):\n${candidateList(cands)}`));
  assert.deepEqual(bodies[0].reasoning, { effort: "none" });
  const p = out.blocks.find((b) => b.type === "picks");
  assert.ok(p && p.type === "picks" && p.title === "Good picks for November");
});
