// Finds landscape, freely licensed Commons candidates for weak hero images. Writes JSON; never touches the DB.
import { writeFileSync, readFileSync, existsSync } from "node:fs";
const FILE = process.env.HOME + "/heroes/candidates.json";
const { searchCommons } = await import("@/lib/media/commons");
const TARGETS: Record<string, string[]> = JSON.parse(process.argv[2]);
const out: Record<string, { pageId: number; title: string; thumb: string; w: number; h: number; license: string }[]> = existsSync(FILE) ? JSON.parse(readFileSync(FILE, "utf8")) : {};
for (const [slug, queries] of Object.entries(TARGETS)) {
  if (out[slug]?.length) continue;
  const seen = new Set<number>(); out[slug] = [];
  for (const q of queries) {
    try {
      for (const f of await searchCommons(q)) {
        if (!f.allowed || seen.has(f.pageId) || f.width < 1600 || f.width / f.height < 1.3 || f.width / f.height > 2.2) continue;
        seen.add(f.pageId); out[slug].push({ pageId: f.pageId, title: f.title, thumb: f.thumbUrl, w: f.width, h: f.height, license: f.license });
      }
    } catch (e) { console.error(slug, q, String(e)); }
    await new Promise((r) => setTimeout(r, 400));
  }
  out[slug] = out[slug].slice(0, 12);
  console.log(slug, out[slug].length);
  writeFileSync(FILE, JSON.stringify(out));
}
