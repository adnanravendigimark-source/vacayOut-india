"use client";

import { useActionState } from "react";
import { idle } from "@/lib/admin/action-state";
import { updateChatBudgetAction } from "@/app/admin/(protected)/chat/actions";
import { buttonClass, inputClass, Notice } from "./ui";

export function ChatBudgetForm({ current }: { current: number }) {
  const [state, action, pending] = useActionState(updateChatBudgetAction, idle);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <label className="text-sm font-medium">
        Chat monthly budget (USD)
        <input name="budget" type="number" min={0} max={10000} step="0.01" defaultValue={current} className={`${inputClass} w-40`} />
      </label>
      <button type="submit" className={buttonClass} disabled={pending}>Save</button>
      <Notice state={state} />
    </form>
  );
}
