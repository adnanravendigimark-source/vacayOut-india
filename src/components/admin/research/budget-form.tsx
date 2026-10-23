"use client";

import { useActionState } from "react";
import { idle } from "@/lib/admin/action-state";
import { updateBudgetAction } from "@/app/admin/(protected)/research/actions";
import { buttonClass, inputClass, Notice } from "../ui";

export function BudgetForm({ current }: { current: number }) {
  const [state, action, pending] = useActionState(updateBudgetAction, idle);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <label className="text-sm font-medium">
        Monthly budget (USD)
        <input name="budget" type="number" min={0} max={10000} step="0.01" defaultValue={current} className={`${inputClass} w-40`} />
      </label>
      <button type="submit" className={buttonClass} disabled={pending}>Save</button>
      <Notice state={state} />
    </form>
  );
}
