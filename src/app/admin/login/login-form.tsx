"use client";

import { useActionState } from "react";
import { idle } from "@/lib/admin/action-state";
import { loginAction } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, idle);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium">Email</label>
        <input id="email" name="email" type="email" required autoComplete="username" defaultValue={state.fields?.email} className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 outline-none focus:border-ink" />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium">Password</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 outline-none focus:border-ink" />
      </div>
      {state.message ? <p role="alert" className="text-sm text-red-700">{state.message}</p> : null}
      <button type="submit" disabled={pending} className="h-11 w-full rounded-lg bg-ink font-semibold text-white disabled:opacity-60">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
