import { timingSafeEqual } from "node:crypto";

/**
 * True when the request carries `Authorization: Bearer <secret>` for a configured secret.
 * Constant-time comparison; an unset or empty secret never authorises anything.
 */
export function hasBearer(req: Request, secret: string | undefined): boolean {
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
