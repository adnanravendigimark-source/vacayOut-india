import assert from "node:assert/strict";
import { test } from "node:test";
import { slugify, SLUG_RE } from "./slug";
import { bodyFromForm, validateSectionBody } from "./sections";
import { buildSnapshot, countWords, publishProblems, snapshotText, type PlaceForPublish } from "./publish";

test("slugify makes clean URL slugs", () => {
  assert.equal(slugify("Himachal Pradesh"), "himachal-pradesh");
  assert.equal(slugify("Dharamshala & McLeod Ganj"), "dharamshala-and-mcleod-ganj");
  assert.equal(slugify("  Café — Kasol!! "), "cafe-kasol");
  assert.match(slugify("Spiti Valley"), SLUG_RE);
  assert.equal(slugify("!!!"), "");
});

test("section validation enforces shapes", () => {
  assert.equal(validateSectionBody("overview", { text: "Hill state." }).ok, true);
  assert.equal(validateSectionBody("overview", { text: "  " }).ok, false);
  assert.equal(validateSectionBody("overview", { text: "x", extra: 1 }).ok, false);
  assert.equal(validateSectionBody("highlights", { items: [{ body: "Snow" }] }).ok, true);
  assert.equal(validateSectionBody("highlights", { items: [] }).ok, false);
  assert.equal(validateSectionBody("faqs", { items: [{ title: "Q?", body: "A." }] }).ok, true);
  assert.equal(validateSectionBody("nope", { text: "x" }).ok, false);
});

test("form parsing drops blank lines and pairs FAQs", () => {
  const f = new FormData();
  f.set("items", "One\n\n  Two  \n");
  assert.deepEqual(bodyFromForm("highlights", f), { items: [{ body: "One" }, { body: "Two" }] });
  const q = new FormData();
  q.append("q", "When?");
  q.append("a", "Oct");
  q.append("q", "");
  q.append("a", "");
  assert.deepEqual(bodyFromForm("faqs", q), { items: [{ title: "When?", body: "Oct" }] });
});

const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(" ");
const hero = { url: "https://x.public.blob.vercel-storage.com/a.jpg", alt: "Valley", caption: null, kind: "photo" as const, license: "CC BY-SA 4.0", attribution: "A", sourceUrl: null };
const place: PlaceForPublish = { id: "p1", kind: "city", name: "Manali", slug: "manali", summary: "Hill town.", lat: null, lng: null, seoTitle: "Manali travel guide", seoDescription: "Plan Manali.", displayMode: "page" };

test("publish checks block incomplete or thin pages", () => {
  const p = publishProblems({ ...place, seoTitle: null }, [], { parentPublished: false, isState: false, hero: null });
  for (const needle of ["SEO title", "parent", "Overview", "hero image", "words"]) assert.ok(p.some((m) => m.includes(needle)), needle);

  const thin = publishProblems(place, [{ key: "overview", status: "approved", body: { text: words(30) } }, { key: "travel_tips", status: "approved", body: { items: [{ body: "Layers" }] } }], { parentPublished: true, isState: false, hero });
  assert.ok(thin.some((m) => m.includes("inside its parent page")));

  const ok = publishProblems(
    place,
    [
      { key: "overview", status: "approved", body: { text: words(100) } },
      { key: "travel_tips", status: "approved", body: { items: [{ body: words(25) }] } },
    ],
    { parentPublished: true, isState: false, hero },
  );
  assert.deepEqual(ok, []);
});

test("inline places need less content and no own SEO or hero", () => {
  const inline = { ...place, displayMode: "parent_section" as const, seoTitle: null, seoDescription: null };
  const p = publishProblems(inline, [{ key: "overview", status: "approved", body: { text: words(45) } }], { parentPublished: true, isState: false, hero: null });
  assert.deepEqual(p, []);
  const stateInline = publishProblems({ ...inline, kind: "state" }, [], { parentPublished: true, isState: true, hero: null });
  assert.ok(stateInline.some((m) => m.includes("always has its own page")));
});

test("drafts never count toward content or snapshot", () => {
  const secs = [
    { key: "travel_tips", status: "approved" as const, body: { items: [{ body: "Layers" }] } },
    { key: "best_time", status: "draft" as const, body: { text: "Draft only words here" } },
    { key: "overview", status: "approved" as const, body: { text: "Town." } },
  ];
  assert.equal(countWords(secs), 2);
  const snap = buildSnapshot(place, secs, { state: { name: "Himachal Pradesh", slug: "himachal-pradesh" }, parent: null, hero });
  assert.deepEqual(snap.sections.map((s) => s.key), ["overview", "travel_tips"]);
  assert.equal(snap.place.hero?.alt, "Valley");
  assert.ok(!snapshotText(snap).includes("Draft only"));
});
