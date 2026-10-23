"use client";

import { useActionState } from "react";
import { idle } from "@/lib/admin/action-state";
import { createUserAction } from "@/app/admin/(protected)/users/actions";
import { buttonClass, inputClass, Notice } from "./ui";

export function CreateUserForm() {
  const [state, action, pending] = useActionState(createUserAction, idle);
  return (
    <form action={action} className="grid gap-3 rounded-xl border border-line bg-white p-5 sm:grid-cols-2">
      <div><label htmlFor="u-name" className="text-sm font-medium">Name</label><input id="u-name" name="name" required className={inputClass} /></div>
      <div><label htmlFor="u-email" className="text-sm font-medium">Email</label><input id="u-email" name="email" type="email" required className={inputClass} /></div>
      <div>
        <label htmlFor="u-role" className="text-sm font-medium">Role</label>
        <select id="u-role" name="role" defaultValue="editor" className={inputClass}>
          <option value="editor">Editor (edit and approve sections)</option>
          <option value="admin">Admin (also publishes and manages users)</option>
        </select>
      </div>
      <div><label htmlFor="u-pass" className="text-sm font-medium">Temporary password (12+ characters)</label><input id="u-pass" name="password" type="password" required minLength={12} autoComplete="new-password" className={inputClass} /></div>
      <div className="sm:col-span-2 space-y-2">
        <Notice state={state} />
        <button type="submit" disabled={pending} className={buttonClass}>Create user</button>
      </div>
    </form>
  );
}
