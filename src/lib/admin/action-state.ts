/** `fields` echoes non-secret inputs back so a failed submit doesn't wipe the form (React resets forms after an action). */
export type ActionState = { ok: boolean; message?: string; problems?: string[]; fields?: Record<string, string> };
export const idle: ActionState = { ok: false };

/** Postgres unique-violation, whether raw or wrapped by Drizzle. */
export function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } } | null;
  return e?.code === "23505" || e?.cause?.code === "23505";
}
