"use server";

import { headers } from "next/headers";
import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn, signOut } from "@/lib/auth";
import { hashPassword, passwordProblem } from "@/lib/auth/password";
import { findTravellerByEmail, googleConfigured, sendVerification, TRAVELLER_MIN_PASSWORD } from "@/lib/auth/travellers";
import { getDb } from "@/lib/db";
import { travellers } from "@/lib/db/schema";
import { EmailNotConfigured } from "@/lib/email";
import { hashKey, hit } from "@/lib/limiter";
import { isUniqueViolation } from "@/lib/admin/action-state";

export type AccountState = { ok: boolean; message?: string; step?: "check_email" | "signed_in"; fields?: Record<string, string> };

async function ipKey() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return hashKey(ip);
}

const signUpSchema = z.object({
  name: z.string().trim().min(1, "Tell us your name.").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email.").max(254),
  password: z.string().max(200),
});

/** Same reply whether or not the email already has an account (no account discovery). */
const CHECK_EMAIL = "Check your inbox for a link to confirm your email, then sign in.";

export async function signUpAction(_: AccountState, form: FormData): Promise<AccountState> {
  const fields = { name: String(form.get("name") ?? "").slice(0, 80), email: String(form.get("email") ?? "").slice(0, 254) };
  const parsed = signUpSchema.safeParse({ name: form.get("name") ?? "", email: form.get("email") ?? "", password: form.get("password") ?? "" });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message, fields };
  const problem = passwordProblem(parsed.data.password, TRAVELLER_MIN_PASSWORD);
  if (problem) return { ok: false, message: problem, fields };

  const limit = await hit(`signup:${await ipKey()}`, 5, 3600);
  if (!limit.ok) return { ok: false, message: "Too many sign-ups from this network. Try again in an hour.", fields };

  const { name, email, password } = parsed.data;
  try {
    const existing = await findTravellerByEmail(email);
    if (existing) {
      // Re-send only for unverified email/password accounts; otherwise say nothing more.
      if (!existing.emailVerifiedAt && existing.passwordHash) await sendVerification(existing);
      return { ok: true, step: "check_email", message: CHECK_EMAIL };
    }
    const [t] = await getDb()
      .insert(travellers)
      .values({ email, name, passwordHash: await hashPassword(password) })
      .returning();
    await sendVerification(t);
    return { ok: true, step: "check_email", message: CHECK_EMAIL };
  } catch (err) {
    if (isUniqueViolation(err)) return { ok: true, step: "check_email", message: CHECK_EMAIL };
    if (err instanceof EmailNotConfigured) return { ok: false, message: "Email sign-up isn’t available yet. Please try Google, or come back soon.", fields };
    console.error("[signup]", err);
    return { ok: false, message: "We couldn’t send the confirmation email. Try again.", fields };
  }
}

export async function travellerSignInAction(_: AccountState, form: FormData): Promise<AccountState> {
  const fields = { email: String(form.get("email") ?? "").slice(0, 254) };
  try {
    await signIn("traveller", { email: String(form.get("email") ?? ""), password: String(form.get("password") ?? ""), redirect: false });
    return { ok: true, step: "signed_in" };
  } catch (err) {
    if (err instanceof AuthError) {
      const code = (err as AuthError & { code?: string }).code;
      if (code === "rate_limited") return { ok: false, message: "Too many failed attempts. Wait 15 minutes and try again.", fields };
      if (code === "not_verified") return { ok: false, message: "Confirm your email first — we’ve sent you a link. Didn’t get it? Sign up again with the same email to resend.", fields };
      return { ok: false, message: "Email or password is incorrect.", fields };
    }
    throw err;
  }
}

export async function googleSignInAction(form: FormData) {
  if (!googleConfigured()) return;
  const back = String(form.get("back") ?? "/chat");
  // Only same-site paths, never a full URL (open-redirect guard).
  const redirectTo = /^\/(?!\/)[\w\-/?=&%.]*$/.test(back) ? back : "/chat";
  await signIn("google", { redirectTo });
}

export async function travellerSignOutAction() {
  await signOut({ redirect: false });
}
