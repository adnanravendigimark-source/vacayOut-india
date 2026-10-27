import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { emailTokens, travellers } from "@/lib/db/schema";
import { escapeHtml, sendEmail } from "@/lib/email";
import { site } from "@/lib/site";

export const TRAVELLER_MIN_PASSWORD = 10;
const VERIFY_HOURS = 24;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export function findTravellerByEmail(email: string) {
  return getDb()
    .select()
    .from(travellers)
    .where(sql`lower(${travellers.email}) = ${email.toLowerCase()}`)
    .limit(1)
    .then((r) => r[0] ?? null);
}

/**
 * Address used in emailed links. Never taken from the request (a forged Host header
 * could otherwise send someone's confirmation link to another site).
 */
function baseUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.NODE_ENV !== "production") return `http://localhost:${process.env.PORT || 3000}`;
  return site.url.replace(/\/$/, "");
}

/** Creates a single-use verification link (only its hash is stored) and emails it. */
export async function sendVerification(t: { id: string; email: string; name: string }) {
  const token = randomBytes(32).toString("base64url");
  await getDb()
    .insert(emailTokens)
    .values({ travellerId: t.id, tokenHash: sha256(token), purpose: "verify", expiresAt: new Date(Date.now() + VERIFY_HOURS * 3600_000) });
  const link = `${baseUrl()}/account/verify?token=${token}`;
  await sendEmail({
    to: t.email,
    subject: "Confirm your email for VacayOut",
    text: `Hi ${t.name},\n\nConfirm your email to keep planning with VacayOut:\n${link}\n\nThe link works once and expires in ${VERIFY_HOURS} hours. If you didn't sign up, ignore this email.`,
    html: `<p>Hi ${escapeHtml(t.name)},</p><p>Confirm your email to keep planning with VacayOut:</p><p><a href="${escapeHtml(link)}">Confirm my email</a></p><p>The link works once and expires in ${VERIFY_HOURS} hours. If you didn't sign up, ignore this email.</p>`,
  });
}

/** Consumes a verification token. Returns the traveller id, or null if invalid/expired/used. */
export async function consumeVerification(token: string): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null;
  const db = getDb();
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(emailTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(emailTokens.tokenHash, sha256(token)), eq(emailTokens.purpose, "verify"), isNull(emailTokens.usedAt), gt(emailTokens.expiresAt, new Date())))
      .returning({ travellerId: emailTokens.travellerId });
    if (!row) return null;
    await tx.update(travellers).set({ emailVerifiedAt: new Date() }).where(and(eq(travellers.id, row.travellerId), isNull(travellers.emailVerifiedAt)));
    return row.travellerId;
  });
}

/** Google sign-in: link by Google id, else by verified email, else create. */
export async function upsertGoogleTraveller(p: { sub: string; email: string; name: string }) {
  const db = getDb();
  const [bySub] = await db.select().from(travellers).where(eq(travellers.googleSub, p.sub)).limit(1);
  if (bySub) return bySub.active ? bySub : null;
  const byEmail = await findTravellerByEmail(p.email);
  if (byEmail) {
    if (!byEmail.active) return null;
    // Google has verified this address, so the account owner is proven.
    const [linked] = await db
      .update(travellers)
      .set({ googleSub: p.sub, emailVerifiedAt: byEmail.emailVerifiedAt ?? new Date() })
      .where(eq(travellers.id, byEmail.id))
      .returning();
    return linked;
  }
  const [created] = await db
    .insert(travellers)
    .values({ email: p.email.toLowerCase(), name: (p.name || p.email.split("@")[0]).slice(0, 80), googleSub: p.sub, emailVerifiedAt: new Date() })
    .returning();
  return created;
}

export function googleConfigured() {
  return Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
}
