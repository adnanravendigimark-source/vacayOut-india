import assert from "node:assert/strict";
import { test } from "node:test";
import { draftDetails, draftSection, groundUnits, numbersGrounded, numbersIn, stripRefs, type DraftContext } from "./draft";
import type { ResponsesResult } from "./openai";

const ctx: DraftContext = {
  name: "Hadimba Temple",
  kind: "temple",
  location: "Manali, Himachal Pradesh, India",
  places: [{ name: "Old Manali", kind: "town" }, { name: "Manu Temple", kind: "temple" }],
  facts: [
    { ref: "F1", findingId: "a", section: "travel_tips", topic: "Hours", claim: "Open 8:00 AM to 6:00 PM daily.", claimType: "opening_hours", sources: [{ url: "https://incredibleindia.gov.in/h", title: "Hidimba", site: "incredibleindia.gov.in" }] },
    { ref: "F2", findingId: "b", section: "budget", topic: "Entry fee", claim: "There is no entry fee.", claimType: "price", sources: [{ url: "https://x.com/fee", title: null, site: "x.com" }] },
    { ref: "F3", findingId: "c", section: "budget", topic: "Taxi", claim: "A taxi from Mall Road costs ₹300–400.", claimType: "price", sources: [{ url: "https://y.in/taxi", title: null, site: "y.in" }] },
    { ref: "F4", findingId: "d", section: "overview", topic: "Built", claim: "The temple was built in 1553.", claimType: "general", sources: [{ url: "https://incredibleindia.gov.in/h", title: "Hidimba", site: "incredibleindia.gov.in" }] },
  ],
};

const reply = (json: unknown): ResponsesResult => ({ id: "r", status: "completed", usage: { input_tokens: 1000, output_tokens: 200 }, output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(json) }] }] });

test("numbers are normalised and 'Day N' is ignored", () => {
  assert.deepEqual(numbersIn("Day 2: open 08:00 to 6 pm, ₹1,500"), [8, 0, 6, 1500]);
  assert.equal(numbersGrounded("Open 8 AM to 6 PM.", [ctx.facts[0]]), true);
  assert.equal(numbersGrounded("Open 7 AM to 6 PM.", [ctx.facts[0]]), false);
  assert.equal(numbersGrounded("No numbers here.", []), true);
});

test("groundUnits drops uncited lines, invented numbers and unknown places", () => {
  const { kept, dropped } = groundUnits(
    [
      { text: "Go early; it opens at 8 AM.", facts: ["F1"] },
      { text: "Built in 1553 by Raja Bahadur Singh.", facts: ["F4"] }, // numbers fine (name not checkable — admin reviews)
      { text: "Built around 1600.", facts: ["F4"] }, // wrong number
      { text: "Walk to Old Manali.", facts: [], places: ["Old Manali"] }, // place-only
      { text: "See Rohtang.", facts: [], places: ["Rohtang Pass"] }, // not in catalogue
      { text: "Entry costs ₹50.", facts: ["F9"] }, // unknown ref
    ],
    ctx,
    { allowPlaceOnly: true },
  );
  assert.deepEqual(kept.map((k) => k.unit.text), ["Go early; it opens at 8 AM.", "Built in 1553 by Raja Bahadur Singh.", "Walk to Old Manali."]);
  assert.equal(dropped, 3);
});

test("draftSection builds a cited list and collects sources of the facts it used", async () => {
  const r = await draftSection("travel_tips", ctx, {
    model: "gpt-5.5",
    call: async (body) => {
      assert.match(String(body.input), /Use ONLY the numbered facts/);
      assert.match(String(body.input), /F1 \[Hours, opening_hours\]: Open 8:00 AM/);
      return reply({ notes: "", items: [{ text: "Arrive soon after it opens at 8 AM to beat the queue.", facts: ["F1"], places: [] }, { text: "Carry ₹2,000 cash for the ropeway.", facts: [], places: [] }] });
    },
  });
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.deepEqual(r.body, { items: [{ body: "Arrive soon after it opens at 8 AM to beat the queue." }] });
  assert.deepEqual(r.findingIds, ["a"]);
  assert.deepEqual(r.sources.map((s) => s.site), ["incredibleindia.gov.in"]);
  assert.match(r.notes, /1 line\(s\) were dropped/);
});

test("budget needs price facts; each line must cite one and copy its amount", async () => {
  const noPrices = await draftSection("budget", { ...ctx, facts: ctx.facts.filter((f) => f.claimType !== "price") }, { model: "m", call: async () => { throw new Error("must not call"); } });
  assert.equal(noPrices.ok, false);

  const r = await draftSection("budget", ctx, {
    model: "m",
    call: async () =>
      reply({
        notes: "",
        assumptions: "One traveller, half a day.",
        lines: [
          { item: "Temple entry", amount: "Free", basis: "no ticket", facts: ["F2"] },
          { item: "Taxi from Mall Road", amount: "₹300–400", basis: "one way", facts: ["F3"] },
          { item: "Lunch", amount: "₹250", basis: "per person", facts: ["F3"] }, // invented amount
          { item: "Guide", amount: "₹500", basis: "per group", facts: ["F1"] }, // not a price fact
        ],
      }),
  });
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.body.text, "One traveller, half a day.");
  assert.deepEqual(r.body.items?.map((i) => i.title), ["Temple entry", "Taxi from Mall Road"]);
  assert.equal(r.body.items?.[1].body, "₹300–400 — one way");
});

test("itinerary days may rely on catalogue places; invented numbers are dropped", async () => {
  const r = await draftSection("itinerary", ctx, {
    model: "m",
    call: async () =>
      reply({
        notes: "",
        days: [
          { title: "Day 1: Hadimba Temple and Old Manali", plan: "Visit the temple when it opens at 8 AM, then walk to Old Manali.", facts: ["F1"], places: ["Old Manali"] },
          { title: "Day 2: Manu Temple", plan: "Walk up to Manu Temple.", facts: [], places: ["Manu Temple"] },
          { title: "Day 3: Rohtang", plan: "Drive 51 km to Rohtang Pass.", facts: [], places: [] },
        ],
      }),
  });
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.deepEqual(r.body.items?.map((i) => i.title), ["Day 1: Hadimba Temple and Old Manali", "Day 2: Manu Temple"]);
});

test("no approved facts → no model call", async () => {
  const r = await draftSection("overview", { ...ctx, facts: [] }, { model: "m", call: async () => { throw new Error("must not call"); } });
  assert.equal(r.ok, false);
});

test("details suggestion is trimmed to SEO limits and must be grounded", async () => {
  const ok = await draftDetails(ctx, {
    model: "m",
    call: async () => reply({ summary: "A 1553 wooden temple in a cedar forest above Manali.", seo_title: "Hadimba Temple, Manali: timings and tips", seo_description: "Plan your visit: open 8 AM to 6 PM, no entry fee.", facts: ["F1", "F2", "F4"], notes: "" }),
  });
  assert.ok(ok.ok);
  const partial = await draftDetails(ctx, {
    model: "m",
    call: async () => reply({ summary: "Built in 1420.", seo_title: "Hadimba Temple guide", seo_description: "Visit the 2026 festival.", facts: ["F4"], notes: "" }),
  });
  assert.ok(partial.ok);
  if (partial.ok) {
    assert.deepEqual(partial.body, { summary: "", seoTitle: "Hadimba Temple guide", seoDescription: "" });
    assert.match(partial.notes, /summary, meta description/);
  }
  const bad = await draftDetails(ctx, {
    model: "m",
    call: async () => reply({ summary: "Built in 1420.", seo_title: "Since 1420", seo_description: "1420", facts: ["F4"], notes: "" }),
  });
  assert.equal(bad.ok, false);
});

test("fact refs written into the prose are removed before checks", () => {
  assert.equal(stripRefs("Entry is free (F2, F3). Go early [F1]."), "Entry is free. Go early.");
  assert.equal(stripRefs("Timings and tips (F1 and F3)"), "Timings and tips");
  assert.equal(stripRefs("Open 8 AM F1"), "Open 8 AM");
});
