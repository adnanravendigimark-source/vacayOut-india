"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ActionState } from "@/lib/admin/action-state";
import { archiveAction, publishAction, unpublishAction } from "@/app/admin/(protected)/places/actions";

/** Publish / Unpublish / Archive from the table, showing why if it can't be done. */
export function RowActions({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionState | null>(null);
  const router = useRouter();
  const run = (fn: (id: string) => Promise<ActionState>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    start(async () => {
      const r = await fn(id);
      setResult(r);
      if (r.ok) router.refresh();
    });
  };
  return (
    <span className="inline-flex flex-col items-end">
      <span className="flex gap-3">
        {status !== "published" && status !== "archived" ? <button type="button" disabled={pending} onClick={() => run(publishAction)} className="underline disabled:opacity-50">Publish</button> : null}
        {status === "published" ? <button type="button" disabled={pending} onClick={() => run(unpublishAction, "Unpublish this destination? It disappears from the site, directory, sitemap and AI answers.")} className="underline disabled:opacity-50">Unpublish</button> : null}
        {status !== "archived" ? <button type="button" disabled={pending} onClick={() => run(archiveAction, "Archive this destination?")} className="text-muted underline disabled:opacity-50">Archive</button> : null}
      </span>
      {result?.message ? (
        <span role="status" className={`mt-1 max-w-xs text-right font-normal ${result.ok ? "text-emerald-800" : "text-red-800"}`}>
          {result.message}
          {result.problems?.length ? <span className="block">{result.problems.slice(0, 3).join(" ")}{result.problems.length > 3 ? ` (+${result.problems.length - 3} more — open Edit)` : ""}</span> : null}
        </span>
      ) : null}
    </span>
  );
}
