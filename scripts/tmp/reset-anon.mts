// Testing only: give the anonymous visitor tied to one chat their free questions back.
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
const chatId = process.argv[2];
const db = getDb();
const t = await db.execute(sql`select visitor from chat_anon_threads where chat_id = ${chatId}`);
const v = (t.rows[0] as { visitor?: string } | undefined)?.visitor;
if (!v) { console.log("no thread"); process.exit(0); }
const q = await db.execute(sql`delete from usage_counters where key = ${`chat:q:${v}`} or key like ${`chat:min:${v}%`} returning key, count`);
await db.execute(sql`delete from chat_anon_threads where visitor = ${v}`);
console.log("reset", q.rows.length, "counter rows");
process.exit(0);
