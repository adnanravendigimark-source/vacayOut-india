import bcrypt from "bcryptjs";

export const MIN_PASSWORD_LENGTH = 12;
const COST = 12;

export function passwordProblem(password: string, min = MIN_PASSWORD_LENGTH): string | null {
  if (password.length < min) return `Use at least ${min} characters.`;
  if (password.length > 200) return "Password is too long.";
  return null;
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, COST);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

let dummy: Promise<string> | null = null;

/**
 * A real bcrypt hash of a random value (same cost), compared against when the
 * email is unknown so response time doesn't reveal which accounts exist.
 */
export function dummyHash() {
  dummy ??= bcrypt.hash(crypto.randomUUID(), COST);
  return dummy;
}
