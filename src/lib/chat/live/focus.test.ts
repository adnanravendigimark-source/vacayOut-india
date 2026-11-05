import assert from "node:assert/strict";
import { test } from "node:test";
import type { PublishedSnapshot } from "@/lib/db/schema";
import { effortFor, quickGreeting } from "./classify";
import { focusedText, isPlanIntent } from "./focus";

const snap = {
  place: { name: "Manali", summary: "Mountain town in Kullu." },
  sections: [
    { key: "overview", body: { text: "Manali sits on the Beas." } },
    { key: "food", body: { items: [{ title: "Trout", body: "Grilled river trout." }] } },
    { key: "how_to_reach", body: { text: "Bhuntar airport is about 50 km away." } },
    { key: "best_time", body: { text: "March to June; December to February for snow." } },
  ],
} as unknown as PublishedSnapshot;

test("a focused question puts the matching section right after the summary", () => {
  const t = focusedText(snap, "how_to_reach");
  assert.ok(t.startsWith("Manali\nMountain town in Kullu.\n\nBhuntar airport"));
  const f = focusedText(snap, "food");
  assert.match(f.split("\n\n")[1], /^Trout: Grilled river trout\./);
});

test("the excerpt respects its budget and cuts at a line or word, never mid-word", () => {
  const long = { ...snap, sections: [{ key: "how_to_reach", body: { text: Array.from({ length: 80 }, (_, i) => `Line ${i} about buses and trains.`).join("\n") } }] } as unknown as PublishedSnapshot;
  const t = focusedText(long, "how_to_reach", 600);
  assert.ok(t.length <= 600);
  assert.match(t, /trains\.$/);
});

test("plans get the stronger model's wider excerpt; questions do not", () => {
  assert.equal(isPlanIntent("plan_trip"), true);
  assert.equal(isPlanIntent("modify_plan"), true);
  assert.equal(isPlanIntent("best_time"), false);
});

test("bare greetings skip the router; greetings with a request do not", () => {
  for (const g of ["hi", "Hello!", "thanks 🙏", "Thank you so much", "namaste", "ok"]) assert.equal(quickGreeting(g), true, g);
  for (const g of ["hi, plan 3 days in Goa", "thanks, now make it cheaper", "hello how to reach manali"]) assert.equal(quickGreeting(g), false, g);
});

test("the cheap tier runs without reasoning", () => {
  assert.equal(effortFor("gpt-6-luna"), "none");
  assert.equal(effortFor("gpt-5.4-mini"), "low");
});
