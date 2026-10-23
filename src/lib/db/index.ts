import "server-only";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * One pooled connection per server instance (reused across hot reloads in dev).
 * node-postgres (not Neon's HTTP driver) because publishing runs in a real
 * transaction. Use Neon's pooled ("-pooler") connection string.
 * Created on first use so builds and pages that never touch the DB don't need DATABASE_URL.
 */
type Db = NodePgDatabase<typeof schema>;
const globalForDb = globalThis as unknown as { __vacayoutDb?: Db };

export function getDb(): Db {
  if (!globalForDb.__vacayoutDb) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not set");
    const pool = new Pool({ connectionString, max: 5, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 10_000 });
    globalForDb.__vacayoutDb = drizzle({ client: pool, schema });
  }
  return globalForDb.__vacayoutDb;
}

export type { Db };
export { schema };
