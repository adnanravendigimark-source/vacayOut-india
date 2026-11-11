"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deletePostAction } from "@/app/admin/(protected)/blog/actions";

export function DeletePostButton({ id, title, redirectTo, compact = false }: { id: string; title: string; redirectTo?: string; compact?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(`Delete "${title}"? This can’t be undone.`)) return;
          start(async () => {
            const r = await deletePostAction(id);
            if (!r.ok) return setMsg(r.message);
            if (redirectTo) router.push(redirectTo);
            router.refresh();
          });
        }}
        className={compact ? "text-sm font-medium text-red-700 hover:underline disabled:opacity-50" : "rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"}
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      {msg ? <span role="status" className="mt-1 text-xs text-red-700">{msg}</span> : null}
    </span>
  );
}
