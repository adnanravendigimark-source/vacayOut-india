/**
 * Validates the researched content in content/travel/ without touching the
 * database or network: structure, references, section shapes, SEO lengths and
 * itinerary plans, plus a summary of the quote re-check results.
 *
 *   npm run content:check
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const { checkContentFile, checksSchema } = await import("@/lib/seed/content-file");
const { listContentFiles, PREEXISTING_PLACE_KEYS } = await import("@/lib/seed/files");

const files = listContentFiles(path.join(process.cwd(), "content", "travel"));
// Checked in seed order, so a file may only reference places defined by files before it.
const known = new Set<string>(PREEXISTING_PLACE_KEYS);
let failed = 0;
const totals = { places: 0, facts: 0, itineraries: 0, guides: 0, supports: 0, notFound: 0, unreachable: 0, unchecked: 0 };

for (const { name, raw, checksPath } of files) {
  const r = checkContentFile(raw, known);
  if (!r.ok) {
    failed++;
    console.log(`✗ ${name}`);
    for (const p of r.problems) console.log(`   - ${p}`);
    continue;
  }
  for (const p of r.file.places) known.add(p.key);
  const checks = existsSync(checksPath) ? checksSchema.parse(JSON.parse(readFileSync(checksPath, "utf8"))) : {};
  let s = 0, nf = 0, un = 0, nc = 0;
  for (const [id, f] of Object.entries(r.file.facts)) {
    f.evidence.forEach((_, i) => {
      const c = checks[`${id}#${i}`];
      if (!c) nc++;
      else if (c.support === "supports") s++;
      else if (c.support === "quote_not_found") nf++;
      else un++;
    });
  }
  totals.places += r.file.places.length;
  totals.facts += Object.keys(r.file.facts).length;
  totals.itineraries += r.file.itineraries.length;
  totals.guides += r.file.guides.length;
  totals.supports += s; totals.notFound += nf; totals.unreachable += un; totals.unchecked += nc;
  console.log(`✓ ${name}: ${r.file.places.length} places, ${Object.keys(r.file.facts).length} facts, ${r.file.itineraries.length} itineraries, ${r.file.guides.length} guides · quotes: ${s} found, ${nf} not found, ${un} unreachable, ${nc} unchecked`);
}
console.log(`\n${files.length - failed}/${files.length} files valid · ${totals.places} places · ${totals.facts} facts · ${totals.itineraries} itineraries · ${totals.guides} guides`);
console.log(`Quotes: ${totals.supports} confirmed on the page, ${totals.notFound} not found, ${totals.unreachable} unreachable, ${totals.unchecked} unchecked.`);
if (failed) process.exitCode = 1;
