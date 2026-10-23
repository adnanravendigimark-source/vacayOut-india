import "server-only";
import type { Db } from "@/lib/db";
import { getDb } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** Records who did what. Pass the transaction when the change itself is transactional. */
export async function audit(
  entry: { actorId: string; action: string; entityType: string; entityId?: string; details?: Record<string, unknown> },
  tx?: Tx,
) {
  await (tx ?? getDb()).insert(auditLog).values(entry);
}
