/**
 * Pure verification rules. A quote appearing on a page proves only that the
 * page says it — so we also judge whether it supports the claim, and count
 * only independent sites. "Verified" is never produced here: admin approval
 * is the only path to a trusted fact.
 */

export type Support = "not_checked" | "supports" | "partial" | "does_not_support" | "contradicts" | "quote_not_found" | "unreachable";
export type Verification = "unsupported" | "single_source" | "corroborated" | "conflicting";

const VOLATILE = new Set(["price", "schedule", "opening_hours", "rule", "contact"]);
export const isVolatile = (claimType: string) => VOLATILE.has(claimType);

/** Lowercase, unify quotes/dashes, drop punctuation and collapse whitespace. */
export function normalizeForMatch(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[‐-―−]/g, "-")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * Finds the quote in page text. Exact (normalised) match first; otherwise we
 * accept it if a long run of its words appears in order — models often trim
 * or rejoin text across line breaks. Returns surrounding context or null.
 */
export function findQuote(quote: string, pageText: string, contextChars = 700): string | null {
  const q = normalizeForMatch(quote);
  const page = normalizeForMatch(pageText);
  if (q.length < 8 || !page) return null;
  let at = page.indexOf(q);
  if (at < 0) {
    const words = q.split(" ");
    const n = Math.min(words.length, Math.max(6, Math.ceil(words.length * 0.6)));
    if (words.length < 6) return null;
    for (let i = 0; i + n <= words.length && at < 0; i++) {
      at = page.indexOf(words.slice(i, i + n).join(" "));
    }
    if (at < 0) return null;
  }
  return page.slice(Math.max(0, at - contextChars), at + q.length + contextChars);
}

export function computeVerification(
  evidence: { support: Support; site: string }[],
  conflictNote: string | null,
): Verification {
  if (conflictNote?.trim() || evidence.some((e) => e.support === "contradicts")) return "conflicting";
  const sites = new Set(evidence.filter((e) => e.support === "supports").map((e) => e.site));
  if (sites.size >= 2) return "corroborated";
  if (sites.size === 1) return "single_source";
  return "unsupported";
}

/** Time-sensitive facts need a dated source no older than a year. */
export function needsDateCheck(claimType: string, sourceDates: (string | null)[], now = new Date()): boolean {
  if (!isVolatile(claimType)) return false;
  const times = sourceDates.map(parseLooseDate).filter((t): t is number => t !== null);
  if (!times.length) return true;
  const newest = Math.max(...times);
  return now.getTime() - newest > 365 * 24 * 3600 * 1000;
}

/** Parses "2025-03-14", "2025-03" or "2025"; anything else → null. */
export function parseLooseDate(s: string | null): number | null {
  if (!s) return null;
  const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/.exec(s.trim());
  if (!m) return null;
  const y = Number(m[1]);
  if (y < 1990 || y > 2100) return null;
  return Date.UTC(y, m[2] ? Number(m[2]) - 1 : 0, m[3] ? Number(m[3]) : 1);
}

export const VERIFICATION_LABEL: Record<Verification, string> = {
  unsupported: "Unsupported",
  single_source: "Single source",
  corroborated: "Corroborated",
  conflicting: "Conflicting",
};

export const SUPPORT_LABEL: Record<Support, string> = {
  not_checked: "Not checked",
  supports: "Supports the claim",
  partial: "Partly supports",
  does_not_support: "Doesn’t support the claim",
  contradicts: "Contradicts the claim",
  quote_not_found: "Quote not found on page",
  unreachable: "Page couldn’t be opened",
};
