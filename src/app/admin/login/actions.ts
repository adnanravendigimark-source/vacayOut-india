"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";
import type { ActionState } from "@/lib/admin/action-state";

export async function loginAction(_: ActionState, form: FormData): Promise<ActionState> {
  const fields = { email: String(form.get("email") ?? "").slice(0, 254) };
  try {
    await signIn("credentials", {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      redirectTo: "/admin/places",
    });
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) {
      const code = (err as AuthError & { code?: string }).code;
      if (code === "rate_limited") return { ok: false, message: "Too many failed attempts. Wait 15 minutes and try again.", fields };
      return { ok: false, message: "Email or password is incorrect.", fields };
    }
    throw err; // includes the redirect after a successful sign-in
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/admin/login" });
}
