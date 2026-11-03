import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { answerLocally, intentTopics, normalize, notesForAi, search } from "./search";
import type { Pack } from "./types";

// A real Manali pack built from the seeded content (see scripts in the PR notes).
const pack = JSON.parse(readFileSync(new URL("./__fixtures__/manali-pack.json", import.meta.url), "utf8")) as Pack;

const top = (q: string) => answerLocally(pack, q);

test("clear questions are answered from the page without AI", () => {
  const cases: [string, string][] = [
    ["When is the best time to visit Manali?", "best_time"],
    ["how to reach manali from delhi", "how_to_reach"],
    ["is there a train to manali", "how_to_reach"],
    ["what food should i try", "food"],
    ["where to stay", "where_to_stay"],
    ["paragliding in august?", "faqs"],
    ["is rohtang open in winter", "faqs"],
    ["things to do with kids", "who_its_for"],
  ];
  for (const [q, topic] of cases) {
    const a = top(q);
    assert.equal(a.confidence, "high", q);
    assert.equal(a.notes[0].topic, topic, q);
  }
});

test("typos and Hinglish still find the right notes", () => {
  assert.match(top("rohtng permt cost").notes[0].text, /₹500/);
  assert.equal(top("snow kab milegi").notes[0].topic, "key_facts");
  assert.match(top("rohtang permit kaise milega").notes[0].title ?? "", /permit/i);
});

test("unclear or off-topic questions are not answered locally (they go to the AI, which may decline)", () => {
  for (const q of ["who is the prime minister", "hot springs timing", "where can i rent a bike"]) assert.notEqual(top(q).confidence, "high", q);
  assert.equal(top("zzzz qqqq").confidence, "none");
});

test("answers keep verification badges and links", () => {
  const a = top("nearest airport");
  assert.equal(a.notes[0].status, "verified");
  assert.equal(a.notes[0].href, "#overview");
  const fee = top("how much is green tax");
  assert.ok(fee.notes.every((n) => n.href));
});

test("helpers", () => {
  assert.equal(normalize("  Kab   jaaye?? "), "kab jaaye");
  assert.ok(intentTopics("kitna kharcha hoga").has("budget"));
  assert.ok(search(pack, "manali").length >= 0); // the place's own name alone matches nothing specific
  assert.ok(notesForAi(pack, "hot springs timing", 6).length <= 6);
  assert.ok(pack.suggestions.length >= 4 && pack.suggestions.length <= 6);
});
