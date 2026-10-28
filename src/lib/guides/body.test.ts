import { test } from "node:test";
import assert from "node:assert/strict";
import { guideText, validateGuide } from "./body";
import { bodyFromForm, validateSectionBody } from "@/lib/places/sections";

const good = {
  slug: "rohtang-permits",
  title: "Rohtang Pass permits, step by step",
  summary: "How to get the online vehicle permit for Rohtang Pass, and what to do if you can't.",
  tripTypes: ["mountains"],
  seoTitle: "Rohtang Pass Permit Guide: How to Apply Online",
  seoDescription: "How the Rohtang Pass vehicle permit works: the daily quota, when to apply, which vehicles qualify and what to do when the road is closed.",
  body: {
    intro: "Every tourist vehicle going up to Rohtang Pass needs an online permit. Here is how the system works and how to plan around it.",
    sections: [
      { heading: "Who needs a permit", text: "Tourist vehicles going beyond Gulaba." },
      { heading: "When to apply", items: [{ title: "Window", body: "Up to two days ahead.", status: "verified" }] },
    ],
    checklist: ["Vehicle registration", "Driver's licence"],
  },
};

test("a well-formed guide validates", () => {
  const v = validateGuide(good);
  assert.equal(v.ok, true);
});

test("guides need at least two sections and a real intro", () => {
  assert.equal(validateGuide({ ...good, body: { ...good.body, sections: [good.body.sections[0]] } }).ok, false);
  assert.equal(validateGuide({ ...good, body: { ...good.body, intro: "Too short." } }).ok, false);
});

test("guide sections need text or items, and statuses come from the fixed list", () => {
  assert.equal(validateGuide({ ...good, body: { ...good.body, sections: [{ heading: "Empty" }, good.body.sections[1]] } }).ok, false);
  assert.equal(validateGuide({ ...good, body: { ...good.body, sections: [good.body.sections[0], { heading: "X", items: [{ body: "y", status: "certain" }] }] } }).ok, false);
});

test("guideText includes headings, items and checklist", () => {
  const t = guideText(good.title, good.body as never);
  for (const s of ["Who needs a permit", "Up to two days ahead.", "Driver's licence"]) assert.ok(t.includes(s), s);
});

test("section items keep a known status and reject an unknown one", () => {
  assert.equal(validateSectionBody("key_facts", { items: [{ title: "Altitude", body: "About 2,050 m", status: "verified" }] }).ok, true);
  assert.equal(validateSectionBody("travel_tips", { items: [{ body: "Carry layers", status: "maybe" }] }).ok, false);
});

test("list form lines can carry a [status] tag", () => {
  const f = new FormData();
  f.set("items", "[seasonal] Snow from December\nPlain line");
  assert.deepEqual(bodyFromForm("travel_tips", f), { items: [{ body: "Snow from December", status: "seasonal" }, { body: "Plain line" }] });
});

test("pairs form rows keep the chosen badge", () => {
  const f = new FormData();
  f.append("q", "Altitude"); f.append("a", "About 2,050 m"); f.append("st", "verified");
  f.append("q", "Note"); f.append("a", "Advice"); f.append("st", "");
  assert.deepEqual(bodyFromForm("key_facts", f), { items: [{ title: "Altitude", body: "About 2,050 m", status: "verified" }, { title: "Note", body: "Advice" }] });
});
