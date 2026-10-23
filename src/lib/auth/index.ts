import "server-only";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { and, eq, gt, lt, or, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { authFailures, travellers, users } from "@/lib/db/schema";
import { dummyHash, verifyPassword } from "./password";
import { findTravellerByEmail, googleConfigured, upsertGoogleTraveller } from "./travellers";

/**
 * Auth.js (NextAuth v5) with JWT sessions, for two separate kinds of account:
 *  - staff (admin/editor, table `users`): provider "credentials". No public sign-up.
 *    Every admin request re-loads the user (src/lib/auth/guard.ts) and staff
 *    sessions expire 8 hours after sign-in.
 *  - travellers (table `travellers`): provider "traveller" (email + verified
 *    password) or Google. A traveller session never passes the admin guard.
 */

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_EMAIL = 5;
const MAX_PER_IP = 20;

class TooManyAttempts extends CredentialsSignin {
  code = "rate_limited";
}
class NotVerified extends CredentialsSignin {
  code = "not_verified";
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(200),
});

function clientIp(request: Request | undefined) {
  const fwd = request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (fwd || request?.headers.get("x-real-ip") || "unknown").slice(0, 64);
}

/** Throttle on recent failures; `key` namespaces staff vs traveller emails. */
async function throttle(key: string, ip: string) {
  const since = new Date(Date.now() - WINDOW_MS);
  const [recent] = await getDb()
    .select({
      byEmail: sql<number>`count(*) filter (where ${authFailures.email} = ${key})`.mapWith(Number),
      byIp: sql<number>`count(*) filter (where ${authFailures.ip} = ${ip})`.mapWith(Number),
    })
    .from(authFailures)
    .where(and(gt(authFailures.at, since), or(eq(authFailures.email, key), eq(authFailures.ip, ip))));
  if ((recent?.byEmail ?? 0) >= MAX_PER_EMAIL || (recent?.byIp ?? 0) >= MAX_PER_IP) throw new TooManyAttempts();
}

async function recordFailure(key: string, ip: string) {
  const db = getDb();
  await db.insert(authFailures).values({ email: key, ip });
  // Old rows are useless after the window; trim them now and then.
  if (Math.random() < 0.05) await db.delete(authFailures).where(lt(authFailures.at, new Date(Date.now() - 86_400_000)));
}

async function authorizeTraveller(raw: unknown, request: Request | undefined) {
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return null;
  const { email, password } = parsed.data;
  const ip = clientIp(request);
  const key = `t:${email}`;
  await throttle(key, ip);
  const t = await findTravellerByEmail(email);
  const valid = await verifyPassword(password, t?.passwordHash ?? (await dummyHash()));
  if (!t || !t.active || !t.passwordHash || !valid) {
    await recordFailure(key, ip);
    return null;
  }
  if (!t.emailVerifiedAt) throw new NotVerified();
  await getDb().update(travellers).set({ lastLoginAt: new Date() }).where(eq(travellers.id, t.id));
  return { id: t.id, name: t.name, email: t.email };
}

async function authorize(raw: unknown, request: Request | undefined) {
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return null;
  const { email, password } = parsed.data;
  const ip = clientIp(request);
  const db = getDb();
  const since = new Date(Date.now() - WINDOW_MS);

  const [recent] = await db
    .select({
      byEmail: sql<number>`count(*) filter (where ${authFailures.email} = ${email})`.mapWith(Number),
      byIp: sql<number>`count(*) filter (where ${authFailures.ip} = ${ip})`.mapWith(Number),
    })
    .from(authFailures)
    .where(and(gt(authFailures.at, since), or(eq(authFailures.email, email), eq(authFailures.ip, ip))));
  if ((recent?.byEmail ?? 0) >= MAX_PER_EMAIL || (recent?.byIp ?? 0) >= MAX_PER_IP) throw new TooManyAttempts();

  const [user] = await db.select().from(users).where(sql`lower(${users.email}) = ${email}`).limit(1);
  const valid = await verifyPassword(password, user?.passwordHash ?? (await dummyHash()));

  if (!user || !user.active || !valid) {
    await db.insert(authFailures).values({ email, ip });
    // Old rows are useless after the window; trim them now and then.
    if (Math.random() < 0.05) await db.delete(authFailures).where(lt(authFailures.at, new Date(Date.now() - 86_400_000)));
    return null;
  }

  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  return { id: user.id, name: user.name, email: user.email };
}

export const STAFF_SESSION_SECONDS = 8 * 60 * 60;

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  // Travellers stay signed in for 30 days; staff sessions are cut at 8 hours by the admin guard.
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/admin/login", error: "/account/error" },
  providers: [
    Credentials({
      id: "credentials",
      credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
      authorize: (credentials, request) => authorize(credentials, request),
    }),
    Credentials({
      id: "traveller",
      credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
      authorize: (credentials, request) => authorizeTraveller(credentials, request),
    }),
    ...(googleConfigured() ? [Google({ authorization: { params: { prompt: "select_account" } } })] : []),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      // Only accept Google accounts whose email Google has verified.
      return Boolean(profile?.email && profile.email_verified === true && profile.sub);
    },
    async jwt({ token, user, account, profile }) {
      if (account?.provider === "google" && profile?.sub && profile.email) {
        const t = await upsertGoogleTraveller({ sub: profile.sub, email: profile.email, name: String(profile.name ?? "") });
        if (!t) throw new Error("Account disabled");
        await getDb().update(travellers).set({ lastLoginAt: new Date() }).where(eq(travellers.id, t.id));
        token.uid = t.id;
        token.kind = "traveller";
        token.name = t.name;
        token.email = t.email;
        token.loginAt = Math.floor(Date.now() / 1000);
      } else if (account && user?.id) {
        token.uid = user.id;
        token.kind = account.provider === "traveller" ? "traveller" : "staff";
        token.loginAt = Math.floor(Date.now() / 1000);
      }
      return token;
    },
    session({ session, token }) {
      if (typeof token.uid === "string") session.user.id = token.uid;
      // Tokens issued before travellers existed belong to staff.
      session.user.kind = token.kind === "traveller" ? "traveller" : "staff";
      session.user.loginAt = typeof token.loginAt === "number" ? token.loginAt : 0;
      return session;
    },
  },
});
