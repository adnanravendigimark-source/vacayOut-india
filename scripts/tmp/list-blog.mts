// Read-only: existing blog posts (titles, slugs, status, length, images).
import "server-only";
import { getDb } from "../../src/lib/db/index.js";
import { blogPosts } from "../../src/lib/db/schema.js";
const rows = await getDb().select().from(blogPosts);
for (const r of rows) console.log(`${r.status.padEnd(9)} ${r.publishDate} | ${r.slug} | ${r.title} | cat=${r.category} | words≈${r.content.replace(/<[^>]+>/g, " ").split(/\s+/).length} | cover=${r.image ? (r.image.startsWith("http") ? new URL(r.image).host : r.image) : "-"} | imgs=${(r.content.match(/<img/g) ?? []).length} | author=${r.author}`);
console.log("TOTAL", rows.length);
const sample = rows.find((r) => r.status === "published");
if (sample) console.log("\nSAMPLE HTML START:\n", sample.content.slice(0, 1500));
process.exit(0);
