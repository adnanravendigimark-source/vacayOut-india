import assert from "node:assert/strict";
import { test } from "node:test";
import { SAMPLE_PLACES, SAMPLE_STATES, samplePlacePage, sampleStatePage } from "./sample-pages";
import { INDIA_REGIONS, matchRegion } from "../places/states";
import { validateSectionBody } from "../places/sections";

test("there is a sample page for every state and union territory", () => {
  const covered = new Set(SAMPLE_STATES.map((s) => matchRegion(s.name)));
  for (const r of INDIA_REGIONS) assert.ok(covered.has(r.name), `missing sample state: ${r.name}`);
  for (const s of SAMPLE_STATES) assert.ok(sampleStatePage(s.slug), s.slug);
});

test("every sample destination belongs to a sample state and has valid sections", () => {
  for (const p of SAMPLE_PLACES) {
    const page = samplePlacePage(p.stateSlug, p.slug);
    assert.ok(page, `${p.stateSlug}/${p.slug}`);
    for (const s of page.snapshot.sections) assert.equal(validateSectionBody(s.key, s.body).ok, true, `${p.slug}: ${s.key}`);
    assert.ok(sampleStatePage(p.stateSlug)!.items.some((c) => c.slug === p.slug), `${p.slug} listed on its state page`);
  }
  assert.equal(samplePlacePage("kerala", "nowhere"), null);
  assert.equal(sampleStatePage("atlantis"), null);
});
