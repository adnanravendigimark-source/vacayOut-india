/**
 * Loads the researched content in content/travel/ into the database as DRAFTS
 * (places, sections, facts with evidence, images, itineraries). Safe to run
 * again: nothing is duplicated, edited content is never overwritten, and
 * nothing is approved or published — editors do that in the admin.
 *
 *   npm run seed:content                 # all files
 *   npm run seed:content -- --only=agra  # one cluster (states.json is always applied first;
 *                                        # places it links to in other clusters must already be seeded)
 *   npm run seed:content -- --no-images  # skip image import
 *   npm run seed:content -- --only=agra --skip-states  # states.json already seeded: don't re-apply it
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const { checkContentFile, checksSchema } = await import("@/lib/seed/content-file");
const { listContentFiles, allPlaceKeys } = await import("@/lib/seed/files");
const { applyContentFile } = await import("@/lib/seed/apply");
const { getDb } = await import("@/lib/db");

const args = process.argv.slice(2);
const only = args.find((a) => a.startsWith("--only="))?.slice(7);
const images = !args.includes("--no-images");
const skipStates = Boolean(only) && args.includes("--skip-states");
const all = listContentFiles(path.join(process.cwd(), "content", "travel"));
// Any file may reference places defined in another; those must already be seeded (or seeded in this run).
const known = allPlaceKeys(all);
const files = all.filter((f) => !only || (f.name === "states.json" && !skipStates) || f.cluster === only);
if (only && files.length < (skipStates ? 1 : 2) && only !== "states") {
  console.error(`No content file for --only=${only}`);
  process.exit(1);
}

const parsed = [];
for (const f of files) {
  const r = checkContentFile(f.raw, known);
  if (!r.ok) {
    console.error(`✗ ${f.name} is invalid — run npm run content:check. First problems:\n  ${r.problems.slice(0, 5).join("\n  ")}`);
    process.exit(1);
  }
  parsed.push({ name: f.name, file: r.file, checks: existsSync(f.checksPath) ? checksSchema.parse(JSON.parse(readFileSync(f.checksPath, "utf8"))) : {} });
}

try {
  for (const { name, file, checks } of parsed) {
    const report = await applyContentFile(file, checks, { images, log: (m) => console.log(`  ${m}`) });
    console.log(`✓ ${name}`, JSON.stringify(report));
  }
  console.log("Done. Everything is in draft — review and publish in the admin.");
} catch (err) {
  console.error("Seed failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await (getDb() as unknown as { $client: { end: () => Promise<void> } }).$client.end();
}
